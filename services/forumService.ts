import { supabase } from './supabaseClient';

export interface ForumTopic {
    id: string;
    user_id: string;
    category: string;
    title: string;
    content: string;
    created_at: string;
    profiles?: {
        full_name: string;
        avatar_url: string;
    };
    replies_count?: number;
}

export interface ForumPost {
    id: string;
    topic_id: string;
    user_id: string;
    content: string;
    is_highlighted: boolean;
    created_at: string;
    profiles?: {
        full_name: string;
        avatar_url: string;
        role: string;
    };
}

export const forumService = {
    /**
     * Detector de información privada (Números telefónicos)
     * Busca secuencias de 7 a 10 dígitos con separadores comunes.
     */
    containsPrivateInfo: (text: string): boolean => {
        // More specific phone regex for Colombia, without global flag to avoid test() state issues
        const phoneRegex = /(?:\+?57[\s-]?)?(?:3\d{2}[\s-]?\d{3}[\s-]?\d{4}|\d{7,10})/;
        return phoneRegex.test(text.replace(/[\s-]/g, ''));
    },

    getTopics: async (category?: string): Promise<ForumTopic[]> => {
        let query = supabase
            .from('forum_topics')
            .select(`
                *,
                profiles:user_id (full_name, avatar_url)
            `)
            .order('created_at', { ascending: false });

        if (category) {
            query = query.eq('category', category);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    getTopicDetails: async (topicId: string) => {
        const { data: topic, error: topicError } = await supabase
            .from('forum_topics')
            .select(`
                *,
                profiles:user_id (full_name, avatar_url)
            `)
            .eq('id', topicId)
            .single();

        if (topicError) throw topicError;

        const { data: posts, error: postsError } = await supabase
            .from('forum_posts')
            .select(`
                *,
                profiles:user_id (full_name, avatar_url, role)
            `)
            .eq('topic_id', topicId)
            .order('is_highlighted', { ascending: false })
            .order('created_at', { ascending: true });

        if (postsError) throw postsError;

        return { topic, posts: posts || [] };
    },

    createTopic: async (category: string, title: string, content: string) => {
        if (forumService.containsPrivateInfo(content) || forumService.containsPrivateInfo(title)) {
            throw new Error('SECURITY_VIOLATION: No se permite compartir números telefónicos por seguridad.');
        }

        const authUser = (await supabase.auth.getUser()).data.user;
        if (!authUser) throw new Error('No autenticado');

        // Ensure profile exists (foreign key dependency)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', authUser.id)
            .maybeSingle();

        if (profileError) {
            console.error('Profile fetch error:', profileError);
        }

        if (!profile) {
            const { error: upsertError } = await supabase.from('profiles').upsert({
                id: authUser.id,
                full_name: authUser.user_metadata?.full_name || 'Estudiante',
                email: authUser.email,
                updated_at: new Date().toISOString()
            });
            if (upsertError) console.error('Profile upsert error:', upsertError);
        }

        const { data, error } = await supabase
            .from('forum_topics')
            .insert({
                user_id: authUser.id,
                category,
                title,
                content
            })
            .select()
            .single();

        if (error) {
            console.error('Forum Topic Error:', error);
            throw error;
        }
        return data;
    },

    createPost: async (topicId: string, content: string) => {
        if (forumService.containsPrivateInfo(content)) {
            throw new Error('SECURITY_VIOLATION: No se permite compartir números telefónicos por seguridad.');
        }

        const authUser = (await supabase.auth.getUser()).data.user;
        if (!authUser) throw new Error('No autenticado');

        // Ensure profile exists
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', authUser.id)
            .maybeSingle();

        if (profileError) {
            console.error('Profile fetch error:', profileError);
        }

        if (!profile) {
            const { error: upsertError } = await supabase.from('profiles').upsert({
                id: authUser.id,
                full_name: authUser.user_metadata?.full_name || 'Estudiante',
                email: authUser.email,
                updated_at: new Date().toISOString()
            });
            if (upsertError) console.error('Profile upsert error:', upsertError);
        }

        const { data, error } = await supabase
            .from('forum_posts')
            .insert({
                topic_id: topicId,
                user_id: authUser.id,
                content
            })
            .select()
            .single();

        if (error) {
            console.error('Forum Post Error:', error);
            throw error;
        }
        return data;
    },

    highlightPost: async (postId: string, isHighlighted: boolean) => {
        const { error } = await supabase
            .from('forum_posts')
            .update({ is_highlighted: isHighlighted })
            .eq('id', postId);

        if (error) throw error;
        return true;
    }
};
