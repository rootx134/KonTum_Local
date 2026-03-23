const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://acucswisytopnfgxonvq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdWNzd2lzeXRvcG5mZ3hvbnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNDkzMzYsImV4cCI6MjA4OTgyNTMzNn0.OYHsDhS31krmb3HLB6aULQ29scibyumWGoWPCDhpfvk');

async function main() {
    console.log("Testing SignUp...");
    const u = 'testuser_' + Date.now();
    const e = u + '@example.com';
    const p = 'password123';

    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: e,
        password: p,
        options: {
            data: { full_name: 'Test', username: u }
        }
    });

    console.log("SignUp Result:", signUpErr ? signUpErr.message : "Success");

    console.log("Testing RPC get_email_by_username...");
    const { data: emailData, error: rpcErr } = await supabase.rpc('get_email_by_username', { p_username: u });
    console.log("RPC Result:", rpcErr ? rpcErr.message : emailData);

    console.log("Testing SignInWithPassword...");
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: emailData || e,
        password: p
    });
    console.log("SignIn Result:", signInErr ? signInErr.message : "Success");
}
main();
