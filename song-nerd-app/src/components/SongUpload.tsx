// src/components/SongUpload.tsx - FIXED VERSION
'use client'

import React, { useState } from 'react';
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
  const [result, setResult] = useState<string>('');

  const testConnection = async () => {
    console.log('🧪 Testing Supabase connection...');
    setResult('Testing...');
    
    try {
      // Test 1: Basic database connection
      console.log('📡 Testing database...');
      const { data, error } = await supabase.from('songs').select('count').limit(1);
      
      if (error) {
        setResult(`❌ Database failed: ${error.message}`);
        return;
      }
      
      setResult('✅ Database works!\n');
      
      // Test 2: Try to access the songs bucket directly
      console.log('📁 Testing songs bucket access...');
      const { data: files, error: listError } = await supabase.storage
        .from('songs')
        .list('', { limit: 1 });
      
      if (listError) {
        setResult(prev => prev + `❌ Bucket access failed: ${listError.message}\n`);
        setResult(prev => prev + `Error code: ${listError.error || 'unknown'}\n`);
        return;
      }
      
      setResult(prev => prev + `✅ Songs bucket accessible! Found ${files?.length || 0} files\n`);
      
      // Test 3: Try uploading a test file
      console.log('📤 Testing file upload...');
      const testFile = new Blob(['test content'], { type: 'text/plain' });
      const testFileName = `test-${Date.now()}.txt`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('songs')
        .upload(testFileName, testFile);
      
      if (uploadError) {
        setResult(prev => prev + `❌ Upload test failed: ${uploadError.message}\n`);
        return;
      }
      
      setResult(prev => prev + `✅ Upload test successful! File: ${uploadData.path}\n`);
      
      // Test 4: Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('songs')
        .getPublicUrl(testFileName);
      
      setResult(prev => prev + `✅ Public URL: ${publicUrl}\n`);
      
      // Clean up test file
      await supabase.storage.from('songs').remove([testFileName]);
      setResult(prev => prev + `✅ All tests passed! Ready for real uploads! 🎉`);
      
    } catch (err: any) {
      console.error('💥 Test error:', err);
      setResult(prev => prev + `\n💥 Error: ${err.message}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Song Nerd
        </h1>
        <p className="text-xl text-gray-600">
          Storage Connection Test
        </p>
      </div>
      
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-4">Storage Test</h2>
        
        <button 
          onClick={testConnection}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors mb-6"
        >
          Test Storage Upload
        </button>
        
        <div className="bg-gray-100 p-4 rounded-lg">
          <pre className="whitespace-pre-wrap text-sm">{result || 'Click button to test...'}</pre>
        </div>
        
        <div className="mt-4 text-sm text-gray-600 space-y-1">
          <p><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
          <p><strong>Has Anon Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  );
}