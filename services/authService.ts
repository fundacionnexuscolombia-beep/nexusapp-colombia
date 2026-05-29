import { supabase } from './supabaseClient';

export const acceptTerms = async (userId: string) => {
    const { error } = await supabase
        .from('profiles')
        .update({
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString()
        })
        .eq('id', userId);

    if (error) throw error;
};

export const checkTermsStatus = async (userId: string) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('terms_accepted')
        .eq('id', userId)
        .single();

    if (error) throw error;
    return data?.terms_accepted;
};

export const resetPasswordForEmail = async (email: string) => {
    // For HashRouter, we need to ensure the redirect goes to the hash path
    // We use a helper to determine the base URL
    const baseUrl = window.location.origin + window.location.pathname;
    const redirectTo = baseUrl.endsWith('/') ? `${baseUrl}#/reset-password` : `${baseUrl}/#/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo,
    });
    if (error) throw error;
};

export const resetTerms = async (userId: string) => {
    const { error } = await supabase
        .from('profiles')
        .update({
            terms_accepted: false,
            terms_accepted_at: null
        })
        .eq('id', userId);

    if (error) throw error;
};
