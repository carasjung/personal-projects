// src/components/SongUpload.tsx
'use client'

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Music, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface UploadResponse {
  id: string;
  title: string;
  artist_name: string;
  genre: string;
  processing_status: string;
}

interface SongUploadProps {
  onUploadSuccess: (song: UploadResponse) => void;
}

export default function SongUpload({ onUploadSuccess }: SongUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [songMetadata, setSongMetadata] = useState({
    title: '',
    artist_name: '',
    genre: 'pop'
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
  
    console.log('🎵 Testing database insert only...');
    setUploading(true);
    setError(null);
    setUploadProgress(25);
  
    try {
      // Test database insert without file upload
      const songData = {
        title: songMetadata.title || file.name.replace(/\.[^/.]+$/, ""),
        artist_name: songMetadata.artist_name || 'Unknown Artist',
        genre: songMetadata.genre,
        file_path: `https://example.com/placeholder-${file.name}`, // Placeholder URL
        file_size: file.size,
        duration: null,
        processing_status: 'pending',
        user_id: null,
      };
  
      console.log('📝 Inserting song data:', songData);
      setUploadProgress(75);
  
      const { data: songRecord, error: dbError } = await supabase
        .from('songs')
        .insert(songData)
        .select()
        .single();
  
      if (dbError) {
        console.error('❌ Database error:', dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }
  
      console.log('✅ Database insert successful:', songRecord);
      setUploadProgress(100);
      
      // Success! This proves the flow works
      onUploadSuccess(songRecord);
  
    } catch (err: any) {
      console.error('💥 Error:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [songMetadata, onUploadSuccess]);