// js/supabase.js
const SUPABASE_URL = 'https://uvcmgzhwiibjcygqsjrm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2Y21nemh3aWliamN5Z3FzanJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNDE3NTUsImV4cCI6MjA2MzYxNzc1NX0.br9Ah2nlwNNfigdLo8uSWgWavZU4wlvWMxDMyClQVoQ';

let supabase = null;

function initSupabase() {
    if (!supabase) {
        if (typeof window.supabaseJs !== 'undefined' && typeof window.supabaseJs.createClient === 'function') {
            supabase = window.supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } else if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } else {
            console.error('Supabase library not loaded!');
        }
    }
    return supabase;
}

// Autenticação: Login
async function signIn(email, password) {
    const sb = initSupabase();
    if (!sb) return { error: { message: 'Cliente Supabase não inicializado' } };
    
    const { data, error } = await sb.auth.signInWithPassword({
        email: email,
        password: password
    });
    
    if (error) console.error('Erro ao fazer login:', error);
    return { data, error };
}

// Autenticação: Logout
async function signOut() {
    const sb = initSupabase();
    if (!sb) return { error: { message: 'Cliente Supabase não inicializado' } };
    
    const { error } = await sb.auth.signOut();
    if (error) console.error('Erro ao fazer logout:', error);
    return { error };
}

// Autenticação: Verificar sessão
async function checkSession() {
    const sb = initSupabase();
    if (!sb) return null;
    
    const { data, error } = await sb.auth.getSession();
    if (error) {
        console.error('Erro ao verificar sessão:', error);
        return null;
    }
    
    return data.session;
}

// Autenticação: Recuperar senha
async function resetPassword(email) {
    const sb = initSupabase();
    if (!sb) return { error: { message: 'Cliente Supabase não inicializado' } };
    
    const { data, error } = await sb.auth.resetPasswordForEmail(email);
    if (error) console.error('Erro ao enviar email de recuperação:', error);
    return { data, error };
}

// Inserir entregas validadas na tabela deliveries
async function importDeliveries(deliveries) {
    const sb = initSupabase();
    if (!sb) return { error: { message: 'Cliente Supabase não inicializado' } };
    
    // Verificar se o usuário está autenticado
    const session = await checkSession();
    if (!session) {
        return { error: { message: 'Usuário não autenticado. Faça login para continuar.' } };
    }
    
    console.log('Enviando dados para Supabase:', deliveries);
    const { data, error } = await sb.from('deliveries').insert(deliveries).select();
    
    if (error) console.error('Erro ao importar para Supabase:', error);
    return { data, error };
}

// Buscar entregas da tabela deliveries
async function getDeliveries(limit = 100) {
    const sb = initSupabase();
    if (!sb) return { error: { message: 'Cliente Supabase não inicializado' } };
    
    // Verificar se o usuário está autenticado
    const session = await checkSession();
    if (!session) {
        return { error: { message: 'Usuário não autenticado. Faça login para continuar.' } };
    }
    
    const { data, error } = await sb.from('deliveries').select('*').limit(limit);
    
    if (error) console.error('Erro ao buscar dados do Supabase:', error);
    return { data, error };
}

// Exportar funções para uso global
window.supabaseUtils = {
    initSupabase,
    signIn,
    signOut,
    checkSession,
    resetPassword,
    importDeliveries,
    getDeliveries
};
