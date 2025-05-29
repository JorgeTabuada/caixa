// Aplicação principal - Versão corrigida
// Verificar autenticação e inicializar aplicação

// Verificar autenticação ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Aguardar um pouco para garantir que o Supabase foi inicializado
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verificar se o utilizador está autenticado
        if (window.authUtils) {
            const isAuthenticated = await window.authUtils.checkAuthentication();
            
            if (isAuthenticated) {
                // Obter dados do utilizador atual
                const user = await window.authUtils.getCurrentUser();
                
                // Atualizar interface com informações do utilizador
                updateUserInterface(user);
                
                // Inicializar a aplicação
                initApp();
            }
        } else {
            console.error('AuthUtils não disponível');
            showError('Erro ao inicializar autenticação.');
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
        // Criar container para informações do utilizador
        const userContainer = document.createElement('div');
        userContainer.style.display = 'flex';
        userContainer.style.alignItems = 'center';
        userContainer.style.gap = '15px';
        
        // Adicionar nome do utilizador
        const userInfo = document.createElement('span');
        userInfo.textContent = user.full_name || user.email;
        userInfo.style.color = 'white';
        userContainer.appendChild(userInfo);
        
        // Adicionar botão de logout
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'logout-btn';
        logoutBtn.className = 'btn btn-secondary';
        logoutBtn.style.padding = '5px 10px';
        logoutBtn.style.fontSize = '0.9rem';
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sair';
        userContainer.appendChild(logoutBtn);
        
        // Substituir conteúdo da session-info
        sessionInfo.innerHTML = '';
        sessionInfo.appendChild(userContainer);
        
        // Configurar evento de logout
        logoutBtn.addEventListener('click', async () => {
            try {
                if (window.authUtils) {
                    await window.authUtils.logout();
                    window.location.href = 'login.html';
                } else {
                    throw new Error('AuthUtils não disponível');
                }
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
    console.log('Inicializando aplicação...');
    
    // Configurar navegação por tabs
    setupTabNavigation();
    
    // Configurar upload de arquivos
    setupFileUploads();
    
    // Configurar modais
    setupModals();
    
    // Configurar eventos de botões
    setupButtonEvents();
    
    console.log('Aplicação inicializada com sucesso!');
}

// Configurar navegação por tabs
function setupTabNavigation() {
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
            
            console.log(`Mudou para aba: ${targetTab}`);
        });
    });
}

// Configurar upload de arquivos
function setupFileUploads() {
    setupFileUpload('odoo-file', 'odoo-filename', 'odoo-file-info', 'odoo-upload');
    setupFileUpload('backoffice-file', 'backoffice-filename', 'backoffice-file-info', 'backoffice-upload');
    setupFileUpload('caixa-file', 'caixa-filename', 'caixa-file-info', 'caixa-upload');
}

// Configurar upload individual
function setupFileUpload(fileInputId, filenameId, fileInfoId, uploadAreaId) {
    const fileInput = document.getElementById(fileInputId);
    const uploadArea = document.getElementById(uploadAreaId);
    
    if (!fileInput || !uploadArea) return;
    
    // Configurar drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.backgroundColor = '';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.backgroundColor = '';
        
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            // Disparar evento change
            const event = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(event);
        }
    });
    
    // Configurar clique na área de upload
    uploadArea.addEventListener('click', (e) => {
        // Verificar se não clicou no botão
        if (!e.target.classList.contains('btn')) {
            fileInput.click();
        }
    });
}

// Configurar modais
function setupModals() {
    const modals = document.querySelectorAll('.modal-overlay');
    
    modals.forEach(modal => {
        // Fechar modal ao clicar no overlay
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // Fechar modal ao clicar no botão close
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
    });
    
    // Fechar modais com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modals.forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
}

// Configurar eventos de botões
function setupButtonEvents() {
    // Botões de filtro na comparação
    const showAllBtn = document.getElementById('show-all-btn');
    const showMissingBtn = document.getElementById('show-missing-btn');
    const showInconsistentBtn = document.getElementById('show-inconsistent-btn');
    
    if (showAllBtn) {
        showAllBtn.addEventListener('click', () => {
            if (window.filterComparisonResults) {
                window.filterComparisonResults('all');
            }
        });
    }
    
    if (showMissingBtn) {
        showMissingBtn.addEventListener('click', () => {
            if (window.filterComparisonResults) {
                window.filterComparisonResults('missing');
            }
        });
    }
    
    if (showInconsistentBtn) {
        showInconsistentBtn.addEventListener('click', () => {
            if (window.filterComparisonResults) {
                window.filterComparisonResults('inconsistent');
            }
        });
    }
    
    // Botão de validação de comparação
    const validateComparisonBtn = document.getElementById('validate-comparison-btn');
    if (validateComparisonBtn) {
        validateComparisonBtn.addEventListener('click', () => {
            // Mudar para aba de validação
            const validateTab = document.querySelector('.nav-tab[data-tab="validate"]');
            if (validateTab) {
                validateTab.click();
            }
        });
    }
    
    // Botão de exportação
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (window.exporter && window.exporter.exportToExcel) {
                window.exporter.exportToExcel();
            } else {
                showError('Função de exportação não disponível.');
            }
        });
    }
}

// Função utilitária para mudança de tabs
function changeTab(tabElement) {
    if (tabElement) {
        tabElement.click();
    }
}

// Função para mostrar mensagens de erro
function showError(message) {
    console.error(message);
    
    // Criar elemento de alerta
    const alertElement = document.createElement('div');
    alertElement.className = 'alert alert-error';
    alertElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background-color: #e74c3c;
        color: white;
        border-radius: 4px;
        z-index: 9999;
        max-width: 400px;
        word-wrap: break-word;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    `;
    alertElement.textContent = message;
    
    // Adicionar ao DOM
    document.body.appendChild(alertElement);
    
    // Remover após 5 segundos
    setTimeout(() => {
        if (alertElement.parentNode) {
            alertElement.parentNode.removeChild(alertElement);
        }
    }, 5000);
}

// Função para mostrar mensagens de sucesso
function showSuccess(message) {
    console.log(message);
    
    // Criar elemento de alerta
    const alertElement = document.createElement('div');
    alertElement.className = 'alert alert-success';
    alertElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background-color: #2ecc71;
        color: white;
        border-radius: 4px;
        z-index: 9999;
        max-width: 400px;
        word-wrap: break-word;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    `;
    alertElement.textContent = message;
    
    // Adicionar ao DOM
    document.body.appendChild(alertElement);
    
    // Remover após 3 segundos
    setTimeout(() => {
        if (alertElement.parentNode) {
            alertElement.parentNode.removeChild(alertElement);
        }
    }, 3000);
}

// Expor funções úteis globalmente
window.appUtils = {
    changeTab,
    showError,
    showSuccess
};
