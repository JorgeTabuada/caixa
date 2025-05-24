// Modificação do app.js para verificar autenticação e redirecionar para login se necessário
// Versão adaptada para uso com CDN em ambiente estático

// Verificar autenticação ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Verificar se o cliente Supabase está inicializado
        if (typeof supabaseUtils !== 'undefined') {
            supabaseUtils.initSupabase();
        }
        
        // Verificar se o utilizador está autenticado
        const isAuthenticated = await window.authUtils.checkAuthentication();
        
        if (isAuthenticated) {
            // Obter dados do utilizador atual
            const user = await window.authUtils.getCurrentUser();
            
            // Atualizar interface com informações do utilizador
            updateUserInterface(user);
            
            // Inicializar a aplicação
            initApp();
        }
    } catch (error) {
        console.error('Erro ao inicializar aplicação:', error);
        showError('Ocorreu um erro ao inicializar a aplicação. Por favor, recarregue a página.');
    }
});

// Atualizar interface com informações do utilizador
function updateUserInterface(user) {
    // Adicionar informações do utilizador ao cabeçalho
    const sessionInfo = document.querySelector('.session-info');
    if (sessionInfo && user) {
        // Adicionar nome do utilizador e botão de logout
        sessionInfo.innerHTML = `
            <span>${user.full_name || user.email}</span>
            <button id="logout-btn" class="btn btn-secondary btn-sm">
                <i class="fas fa-sign-out-alt"></i> Sair
            </button>
        `;
        
        // Configurar evento de logout
        document.getElementById('logout-btn').addEventListener('click', async () => {
            try {
                await window.authUtils.logout();
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Erro ao fazer logout:', error);
                showError('Erro ao fazer logout. Por favor, tente novamente.');
            }
        });
    }
    
    // Atualizar data atual
    const currentDateElement = document.getElementById('current-date');
    if (currentDateElement) {
        const today = new Date();
        const formattedDate = today.toLocaleDateString('pt-BR');
        currentDateElement.textContent = formattedDate;
    }
}

// Inicializar a aplicação
function initApp() {
    // Configurar navegação por tabs
    const navTabs = document.querySelectorAll('.nav-tab');
    const contentSections = document.querySelectorAll('.content-section');
    
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            
            // Atualizar tabs ativas
            navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Atualizar seções de conteúdo
            contentSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === `${targetTab}-section`) {
                    section.classList.add('active');
                }
            });
        });
    });
    
    // Configurar upload de arquivos
    setupFileUpload('odoo-file', 'odoo-filename', 'odoo-file-info');
    setupFileUpload('backoffice-file', 'backoffice-filename', 'backoffice-file-info');
    setupFileUpload('caixa-file', 'caixa-filename', 'caixa-file-info');
    
    // Configurar botão de processamento
    const processFilesBtn = document.getElementById('process-files-btn');
    if (processFilesBtn) {
        processFilesBtn.addEventListener('click', () => {
            // Implementar lógica de processamento de arquivos
            console.log('Processando arquivos...');
        });
    }
    
    // Verificar se ambos os arquivos foram selecionados para habilitar o botão de processamento
    function checkFilesSelected() {
        const odooFile = document.getElementById('odoo-file').files[0];
        const backofficeFile = document.getElementById('backoffice-file').files[0];
        
        if (processFilesBtn) {
            processFilesBtn.disabled = !(odooFile && backofficeFile);
        }
    }
    
    // Configurar upload de arquivos
    function setupFileUpload(fileInputId, filenameId, fileInfoId) {
        const fileInput = document.getElementById(fileInputId);
        const fileUpload = fileInput.parentElement;
        
        // Configurar drag and drop
        fileUpload.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUpload.classList.add('drag-over');
        });
        
        fileUpload.addEventListener('dragleave', () => {
            fileUpload.classList.remove('drag-over');
        });
        
        fileUpload.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUpload.classList.remove('drag-over');
            
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                updateFileInfo(fileInput, filenameId, fileInfoId);
                checkFilesSelected();
            }
        });
        
        // Configurar clique no botão
        fileUpload.querySelector('.btn').addEventListener('click', () => {
            fileInput.click();
        });
        
        // Configurar mudança de arquivo
        fileInput.addEventListener('change', () => {
            updateFileInfo(fileInput, filenameId, fileInfoId);
            checkFilesSelected();
        });
    }
    
    // Atualizar informações do arquivo selecionado
    function updateFileInfo(fileInput, filenameId, fileInfoId) {
        const file = fileInput.files[0];
        const filenameElement = document.getElementById(filenameId);
        const fileInfoElement = document.getElementById(fileInfoId);
        
        if (file) {
            filenameElement.textContent = file.name;
            fileInfoElement.classList.remove('hidden');
        } else {
            fileInfoElement.classList.add('hidden');
        }
    }
}

// Função para mostrar mensagens de erro
function showError(message) {
    // Implementar lógica para mostrar mensagens de erro
    console.error(message);
    
    // Criar elemento de alerta
    const alertElement = document.createElement('div');
    alertElement.className = 'alert alert-error';
    alertElement.textContent = message;
    
    // Adicionar ao DOM
    document.body.appendChild(alertElement);
    
    // Remover após 5 segundos
    setTimeout(() => {
        alertElement.remove();
    }, 5000);
}
