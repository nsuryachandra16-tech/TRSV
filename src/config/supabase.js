import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mock-supabase-url.supabase.co';
// Strip trailing /rest/v1/ or slashes if pasted from API settings
const supabaseUrl = rawUrl.endsWith('/rest/v1/') ? rawUrl.replace('/rest/v1/', '') : rawUrl.replace(/\/$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'mock-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Check if running in simulated fallback mode
export const isSupabaseMock = !import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.VITE_SUPABASE_URL.includes('mock-supabase-url') ||
  supabaseAnonKey.startsWith('mock-');

/**
 * High-fidelity Supabase storage uploader.
 * Uploads local media streams/screenshots to the 'grievance-media' Supabase bucket.
 */
export const uploadGrievanceMedia = async (file) => {
  if (isSupabaseMock) {
    console.log('📦 [Supabase Sim] Transmitting virtual attachment to storage:', file.name);
    // Simulate web transmission delay
    await new Promise(resolve => setTimeout(resolve, 900));
    return `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800`;
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
  const filePath = `grievances/${fileName}`;

  // Upload raw stream to Supabase 'grievance-media' bucket
  const { data, error } = await supabase.storage
    .from('grievance-media')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw error;
  }

  // Generate public resolution endpoint
  const { data: publicUrlData } = supabase.storage
    .from('grievance-media')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
};
