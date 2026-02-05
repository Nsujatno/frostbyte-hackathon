import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Auth helper functions
export const authHelpers = {
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (data.session?.access_token) {
      // Store token in localStorage for hackathon
      localStorage.setItem('supabase_token', data.session.access_token);
    }

    return { data, error };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (data.session?.access_token) {
      // Store token in localStorage for hackathon
      localStorage.setItem('supabase_token', data.session.access_token);
    }

    return { data, error };
  },

  async signOut() {
    localStorage.removeItem('supabase_token');
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getToken() {
    return localStorage.getItem('supabase_token');
  },
};
