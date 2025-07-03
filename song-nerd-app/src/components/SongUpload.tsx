// src/components/SongUpload.tsx
'use client'

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Music, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { songAPI } from '@/services/api';

// Debug: Check if environment variables are loaded
console.log('🔍 Environment Debug:', {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  anonKeyStart: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...'
});

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
  const [currentStep, setCurrentStep] = useState('');
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
    setUploadProgress(50);
    setCurrentStep('Testing database...');
  
    try {
      // Skip file upload, use placeholder URL
      const fileUrl = `https://placeholder.com/${file.name}`;
  
      const songData = {
        title: songMetadata.title || file.name.replace(/\.[^/.]+$/, ""),
        artist_name: songMetadata.artist_name || 'Unknown Artist',
        genre: songMetadata.genre,
        file_path: fileUrl,
        file_size: file.size,
        duration: null,
        processing_status: 'pending',
        user_id: null,
      };
  
      console.log('🔍 Testing insert with:', songData);
      
      const { data: newSongRecord, error: dbError } = await supabase
        .from('songs')
        .insert([songData])
        .select()
        .single();
  
      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }
  
      console.log('✅ Database insert successful!', newSongRecord);
      setCurrentStep('Success!');
      setUploadProgress(100);
  
    } catch (err: any) {
      console.error('💥 Error:', err);
      setError(err.message || 'Database test failed');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setCurrentStep('');
      }, 2000);
    }
  }, [songMetadata]);