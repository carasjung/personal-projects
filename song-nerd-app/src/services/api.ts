// src/services/api.ts
import { supabase } from '@/lib/supabase';

export const songAPI = {
  // Get user's songs
  getUserSongs: async (userId?: string) => {
    let query = supabase.from('songs').select('*');
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Get song with analysis and insights
  getSongWithAnalysis: async (songId: string) => {
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select('*')
      .eq('id', songId)
      .single();

    if (songError) throw songError;

    const { data: analysis } = await supabase
      .from('analysis')
      .select('*')
      .eq('song_id', songId)
      .single();

    const { data: insights } = await supabase
      .from('marketing_insights')
      .select('*')
      .eq('song_id', songId)
      .single();

    return { song, analysis, insights };
  },

  // Update song status
  updateSongStatus: async (songId: string, status: string) => {
    const { data, error } = await supabase
      .from('songs')
      .update({ processing_status: status })
      .eq('id', songId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Upload file to Supabase Storage
  uploadFile: async (file: File, bucket: string = 'songs') => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return { path: data.path, url: publicUrl };
  }
};