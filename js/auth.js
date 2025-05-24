// Funções de autenticação para a aplicação Caixa Multipark
// Versão adaptada para uso com CDN em ambiente estático

/**
 * Realiza o login do utilizador
 * @param {string} email - Email do utilizador
 * @param {string} password - Password do utilizador
 * @returns {Promise<Object>} - Resultado da operação de login
 */
async function login(email, password) {
    if (!supabase) {
        console.error('Cliente Supabase não inicializado');
        throw new Error('Cliente Supabase não inicializado');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error('Erro ao fazer login:', error);
        throw error;
    }

    return data;
}

/**
 * Verifica se o utilizador está autenticado
 * @returns {Promise<Object>} - Informações da sessão atual
 */
async function checkSession() {
    if (!supabase) {
        console.error('Cliente Supabase não inicializado');
        throw new Error('Cliente Supabase não inicializado');
    }

    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
        console.error('Erro ao verificar sessão:', error);
        throw error;
    }
    
    return data;
}

/**
 * Obtém informações do utilizador atual
 * @returns {Promise<Object>} - Dados do utilizador
 */
async function getCurrentUser() {
    if (!supabase) {
        console.error('Cliente Supabase não inicializado');
        throw new Error('Cliente Supabase não inicializado');
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
        console.error('Erro ao obter sessão:', sessionError);
        throw sessionError;
    }
    
    if (!session) {
        return null;
    }
    
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
    
    if (error) {
        console.error('Erro ao obter dados do utilizador:', error);
        throw error;
    }
    
    return data;
}

/**
 * Realiza o logout do utilizador
 * @returns {Promise<void>}
 */
async function logout() {
    if (!supabase) {
        console.error('Cliente Supabase não inicializado');
        throw new Error('Cliente Supabase não inicializado');
    }

    const { error } = await supabase.auth.signOut();
    
    if (error) {
        console.error('Erro ao fazer logout:', error);
        throw error;
    }
}

/**
 * Redireciona para a página principal se autenticado ou para login se não
 * @returns {Promise<boolean>} - True se autenticado, false caso contrário
 */
async function checkAuthentication() {
    if (!supabase) {
        console.error('Cliente Supabase não inicializado');
        // Redirecionar para login por segurança
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
        return false;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        // Redirecionar para login se não estiver na página de login
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
        return false;
    } else {
        // Redirecionar para index se estiver na página de login
        if (window.location.pathname.includes('login.html')) {
            window.location.href = 'index.html';
        }
        return true;
    }
}

// Expor funções globalmente
window.authUtils = {
    login,
    checkSession,
    getCurrentUser,
    logout,
    checkAuthentication
};
