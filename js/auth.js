// Funções de autenticação para Caixa Multipark

/**
 * Faz login do utilizador
 */
async function login(email, password) {
    if (!window.supabase) {
        throw new Error('Sistema de autenticação não disponível');
    }

    const { data, error } = await window.supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        throw error;
    }

    return data;
}

/**
 * Faz logout do utilizador
 */
async function logout() {
    if (!window.supabase) {
        throw new Error('Sistema de autenticação não disponível');
    }

    const { error } = await window.supabase.auth.signOut();
    
    if (error) {
        throw error;
    }

    // Redirecionar para página de login
    window.location.href = 'login.html';
}

/**
 * Verifica se o utilizador está autenticado
 */
async function checkAuthentication() {
    if (!window.supabase) {
        console.error('Cliente Supabase não inicializado');
        return false;
    }

    try {
        const { data: { session } } = await window.supabase.auth.getSession();
        
        if (!session) {
            // Não está autenticado, redirecionar para login
            if (window.location.pathname !== '/login.html' && !window.location.pathname.endsWith('login.html')) {
                window.location.href = 'login.html';
            }
            return false;
        }

        return true;
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        return false;
    }
}

/**
 * Obtém informações do utilizador atual
 */
async function getCurrentUser() {
    if (!window.supabase) {
        throw new Error('Sistema de autenticação não disponível');
    }

    const { data: { user }, error } = await window.supabase.auth.getUser();
    
    if (error) {
        throw error;
    }

    return user;
}

/**
 * Cria uma conta de utilizador
 */
async function signUp(email, password, fullName) {
    if (!window.supabase) {
        throw new Error('Sistema de autenticação não disponível');
    }

    const { data, error } = await window.supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                full_name: fullName
            }
        }
    });

    if (error) {
        throw error;
    }

    return data;
}

/**
 * Configura listeners para mudanças de estado de autenticação
 */
function setupAuthStateListener() {
    if (!window.supabase) {
        console.error('Cliente Supabase não inicializado');
        return;
    }

    window.supabase.auth.onAuthStateChange((event, session) => {
        console.log('Estado de autenticação mudou:', event, session);
        
        if (event === 'SIGNED_IN') {
            console.log('Utilizador fez login');
        } else if (event === 'SIGNED_OUT') {
            console.log('Utilizador fez logout');
            // Redirecionar para login se não estiver já lá
            if (window.location.pathname !== '/login.html' && !window.location.pathname.endsWith('login.html')) {
                window.location.href = 'login.html';
            }
        }
    });
}

// Expor funções globalmente
window.authUtils = {
    login,
    logout,
    checkAuthentication,
    getCurrentUser,
    signUp,
    setupAuthStateListener
};

// Configurar listener quando o script carregar
document.addEventListener('DOMContentLoaded', () => {
    // Aguardar um pouco para garantir que o Supabase está carregado
    setTimeout(() => {
        setupAuthStateListener();
        
        // Verificar autenticação apenas se não estivermos na página de login
        if (!window.location.pathname.endsWith('login.html')) {
            checkAuthentication();
        }
    }, 1000);
});

console.log('Auth utils carregado com sucesso!');