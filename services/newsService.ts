
import { supabase } from './supabaseClient';

export interface NewsEntry {
    id: string;
    title: string;
    category: string;
    summary: string;
    content: string;
    date: string;
    image: string;
    created_at?: string;
}

export const newsService = {
    async getAll(): Promise<NewsEntry[]> {
        const { data, error } = await supabase
            .from('news')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async create(news: Omit<NewsEntry, 'id' | 'created_at'>) {
        const { data, error } = await supabase
            .from('news')
            .insert([news])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async update(id: string, updates: Partial<NewsEntry>) {
        const { data, error } = await supabase
            .from('news')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('news')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
