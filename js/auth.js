// Funções de autenticação para a aplicação Caixa Multipark
// Versão corrigida

/**
 * Realiza o login do utilizador
 * @param {string} email - Email do utilizador
 * @param {string} password - Password do utilizador
 * @returns {Promise<Object>} - Resultado da operação de login
 */
async function login(email, password) {
    if (!window.supabase) {
        console.error('Cliente Supabase não inicializado');
        throw new Error('Cliente Supabase não inicializado');
    }

    console.log('Tentando fazer login com:', email);

    const { data, error } = await window.supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error('Erro ao fazer login:', error);
        throw error;
    }

    console.log('Login realizado com sucesso:', data);
    return data;
}

/**
 * Verifica se o utilizador está autenticado
 * @returns {Promise<Object>} - Informações da sessão atual
 */
async function checkSession() {
    if (!window.supabase) {
        console.error('Cliente Supabase não inicializado');
        throw new Error('Cliente Supabase não inicializado');
    }

    const { data, error } = await window.supabase.auth.getSession();
    
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
    if (!window.supabase) {
        console.error('Cliente Supabase não inicializado');
        throw new Error('Cliente Supabase não inicializado');
    }

    const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
    
    if (sessionError) {
        console.error('Erro ao obter sessão:', sessionError);
        throw sessionError;
    }
    
    if (!session) {
        return null;
    }
    
    // Verificar se a tabela users existe no Supabase antes de fazer consulta
    try {
        const { data, error } = await window.supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = não encontrado
            console.error('Erro ao obter dados do utilizador:', error);
            // Se a tabela users não existir ou houver erro, retornar dados básicos do auth
            return {
                id: session.user.id,
                email: session.user.email,
                full_name: session.user.user_metadata?.full_name || session.user.email,
                role: session.user.user_metadata?.role || 'user'
            };
        }
        
        return data || {
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || session.user.email,
            role: session.user.user_metadata?.role || 'user'
        };
    } catch (error) {
        console.warn('Erro ao acessar tabela users, usando dados do auth:', error);
        // Fallback para dados do auth se a tabela users não existir
        return {
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || session.user.email,
            role: session.user.user_metadata?.role || 'user'
        };
    }
}

/**
 * Realiza o logout do utilizador
 * @returns {Promise<void>}
 */
async function logout() {
    if (!window.supabase) {
        console.error('Cliente Supabase não inicializado');
        throw new Error('Cliente Supabase não inicializado');
    }

    const { error } = await window.supabase.auth.signOut();
    
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
    if (!window.supabase) {
        console.error('Cliente Supabase não inicializado');
        // Redirecionar para login por segurança
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
        return false;
    }

    try {
        const { data: { session } } = await window.supabase.auth.getSession();
        
        console.log('Verificação de autenticação:', session ? 'Autenticado' : 'Não autenticado');
        
        if (!session) {
            // Redirecionar para login se não estiver na página de login
            if (!window.location.pathname.includes('login.html')) {
                console.log('Redirecionando para login...');
                window.location.href = 'login.html';
            }
            return false;
        } else {
            // Log do utilizador autenticado
            console.log('Usuário autenticado:', session.user.email);
            
            // Redirecionar para index se estiver na página de login
            if (window.location.pathname.includes('login.html')) {
                console.log('Redirecionando para página principal...');
                window.location.href = 'index.html';
            }
            return true;
        }
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        // Em caso de erro, redirecionar para login por segurança
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
        return false;
    }
}

/**
 * Configura listeners para mudanças de autenticação
 */
function setupAuthListeners() {
    if (!window.supabase) {
        console.error('Cliente Supabase não inicializado');
        return;
    }

    window.supabase.auth.onAuthStateChange((event, session) => {
        console.log('Mudança de estado da autenticação:', event, session?.user?.email);
        
        if (event === 'SIGNED_OUT') {
            // Redirecionar para login após logout
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
            }
        } else if (event === 'SIGNED_IN') {
            // Redirecionar para página principal após login
            if (window.location.pathname.includes('login.html')) {
                window.location.href = 'index.html';
            }
        }
    });
}

// Expor funções globalmente
window.authUtils = {
    login,
    checkSession,
    getCurrentUser,
    logout,
    checkAuthentication,
    setupAuthListeners
};

// Configurar listeners quando o script carregar
document.addEventListener('DOMContentLoaded', () => {
    setupAuthListeners();
});
