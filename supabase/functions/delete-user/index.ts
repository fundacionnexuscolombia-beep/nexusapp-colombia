// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "supabase"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Check Admin Role
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

        if (userError || !user) throw new Error('Unauthorized')

        // Check if user is admin via profiles table
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Forbidden: Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const { user_id, force_delete } = await req.json()

        if (!user_id) throw new Error('Missing user_id')

        // 1. Check Payments
        const { count, error: countError } = await supabaseClient
            .from('payments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user_id)

        if (countError) throw countError

        if (count && count > 0 && !force_delete) {
            return new Response(JSON.stringify({ error: 'Cannot delete user with payments history.', has_payments: true }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // 1. Delete Auth User FIRST — this triggers Supabase's own cascade
        const { error: deleteAuthError } = await supabaseClient.auth.admin.deleteUser(user_id)
        if (deleteAuthError) {
            return new Response(
                JSON.stringify({ error: `Auth deletion failed: ${deleteAuthError.message}` }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // 2. Clean up any remaining orphaned rows in case cascade didn't catch them
        await supabaseClient.from('payments').delete().eq('user_id', user_id)
        await supabaseClient.from('student_progress').delete().eq('user_id', user_id)
        await supabaseClient.from('quiz_attempts').delete().eq('user_id', user_id)
        await supabaseClient.from('extracurricular_grades').delete().eq('user_id', user_id)
        await supabaseClient.from('forum_topics').delete().eq('user_id', user_id)
        await supabaseClient.from('profiles').delete().eq('id', user_id)

        return new Response(
            JSON.stringify({ message: 'User deleted successfully' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
