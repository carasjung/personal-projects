// src/services/api.ts
import { supabase } from '@/lib/supabase';

// Get the API URL from environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://song-nerd.up.railway.app';

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
  },

  // NEW: Trigger analysis via Railway backend (from URL)
  triggerAnalysis: async (songId: string, fileUrl: string, metadata: any) => {
    const response = await fetch(`${API_BASE_URL}/api/songs/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        song_id: songId,
        file_url: fileUrl,
        metadata: metadata
      }),
    });

    if (!response.ok) {
      throw new Error(`Analysis request failed: ${response.statusText}`);
    }

    return response.json();
  },

  // NEW: Upload and analyze via Railway backend (direct file upload)
  uploadAndAnalyze: async (file: File, songId: string, metadata: any) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('song_id', songId);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await fetch(`${API_BASE_URL}/api/songs/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload and analysis failed: ${response.statusText}`);
    }

    return response.json();
  },

  // NEW: Check backend health
  checkBackendHealth: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }
};