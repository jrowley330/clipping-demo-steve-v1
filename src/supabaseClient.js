import { createClient } from '@supabase/supabase-js';

// For now, hard-code these so we don't fight env-file issues
const supabaseUrl = 'https://tekxavfbwuhzmdmcybqe.supabase.co';
const supabaseAnonKey ='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRla3hhdmZid3Voem1kbWN5YnFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NjczNDgsImV4cCI6MjA3OTQ0MzM0OH0.Q3PmjUEZnPrm0GklRRxP0qXRTAjnfn1E4cpzqVA91-0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
