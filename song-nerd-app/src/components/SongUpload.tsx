// src/components/SongUpload.tsx - TEMPORARY TEST VERSION
'use client'

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SongUpload({ onUploadSuccess }: any) {
  const [result, setResult] = useState<string>('');

  const testConnection = async () => {
    console.log('Testing Supabase connection...');
    setResult('Testing...');
    
    try {
      // Test 1: Basic connection
      console.log('Testing basic connection...');
      const { data, error } = await supabase.from('songs').select('count').limit(1);
      
      if (error) {
        console.error('Connection test failed:', error);
        setResult(`Connection failed: ${error.message}`);
        return;
      }
      
      console.log('Basic connection works');
      setResult('Basic connection works! ');
      
      // Test 2: Storage test
      console.log('Testing storage access...');
      const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
      
      if (storageError) {
        console.error('Storage test failed:', storageError);
        setResult(prev => prev + `\nStorage failed: ${storageError.message}`);
        return;
      }
      
      console.log('Storage works, buckets:', buckets);
      setResult(prev => prev + `\nStorage works! Found ${buckets?.length || 0} buckets`);
      
      // Test 3: Insert test
      console.log('Testing database insert...');
      const testData = {
        title: 'Test Song',
        artist_name: 'Test Artist',
        genre: 'test',
        file_path: 'test.mp3',
        file_size: 1000,
        processing_status: 'test',
        user_id: null
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('songs')
        .insert(testData)
        .select()
        .single();
      
      if (insertError) {
        console.error('Insert test failed:', insertError);
        setResult(prev => prev + `\nInsert failed: ${insertError.message}`);
        return;
      }
      
      console.log('Insert works:', insertData);
      setResult(prev => prev + `\nInsert works! Created record: ${insertData.id}`);
      
    } catch (err: any) {
      console.error('Test error:', err);
      setResult(`Test error: ${err.message}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      
      <button 
        onClick={testConnection}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Test Supabase Connection
      </button>
      
      <div className="bg-gray-100 p-4 rounded">
        <pre className="whitespace-pre-wrap">{result}</pre>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
        <p><strong>Has Anon Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
}