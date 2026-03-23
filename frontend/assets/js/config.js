/**
 * SUPABASE CONFIGURATION & INITIALIZATION
 * Điền URL và Anon Key của dự án Supabase của bạn vào đây.
 */

const SUPABASE_URL = 'https://acucswisytopnfgxonvq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdWNzd2lzeXRvcG5mZ3hvbnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNDkzMzYsImV4cCI6MjA4OTgyNTMzNn0.OYHsDhS31krmb3HLB6aULQ29scibyumWGoWPCDhpfvk';

// Initialize Supabase Client
if (typeof supabase !== 'undefined') {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase Client Initialized");
} else {
    console.error("Supabase script not loaded!");
}

// Global Cloudinary Configuration for Image Uploads (Optional)
window.CLOUDINARY_UPLOAD_PRESET = 'unsigned_preset';
window.CLOUDINARY_CLOUD_NAME = 'your_cloud_name';
