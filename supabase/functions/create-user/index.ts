// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "supabase"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // MANUAL AUTH CHECK:
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'No authorization header passed' }), { status: 401 })
        }
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized', details: userError }), { status: 401 })
        }

        const body = await req.json()
        const { action = 'create' } = body

        if (action === 'reset-password') {
            const { userId, newPassword } = body

            const { data, error } = await supabaseClient.auth.admin.updateUserById(userId, {
                password: newPassword
            })

            if (error) throw error

            return new Response(
                JSON.stringify({ success: true, data }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        const { role = 'student', email, password, full_name, cohort, phone, birth_date, document_type, document_number, document_issue_date, document_issue_place } = body

        if (!email || !document_number) {
            return new Response(
                JSON.stringify({ error: 'El correo electrónico y el número de documento son obligatorios.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Check if document_number already exists
        const { data: existingDoc } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('document_number', document_number)
            .single()

        if (existingDoc) {
            return new Response(
                JSON.stringify({ error: `Ya existe un estudiante registrado con el documento ${document_number}.` }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Check if email already exists in profiles (to prevent orphaned or duplicate logic)
        // Note: Auth also checks this, but doing it here prevents partial DB state
        const { data: existingEmail } = await supabaseClient
            .from('profiles')
            .select('id')
            .ilike('email', email.trim())
            .maybeSingle()

        if (existingEmail) {
            return new Response(
                JSON.stringify({ error: `El correo electrónico ${email} ya está en uso por otro estudiante.` }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // 1. Create User in Auth
        const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name,
                avatar_url: `https://ui-avatars.com/api/?name=${full_name}&background=random`,
                role
            }
        })

        if (authError) throw authError

        if (authData.user) {
            // 2. Update Profile with extra details
            const { error: profileError } = await supabaseClient
                .from('profiles')
                .update({
                    phone,
                    birth_date,
                    document_type,
                    document_number,
                    document_issue_date,
                    document_issue_place,
                    cohort,
                    role
                })
                .eq('id', authData.user.id)

            if (profileError) throw profileError
        }

        return new Response(
            JSON.stringify(authData),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
