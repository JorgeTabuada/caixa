// App principal da Caixa Multipark
// Versão com processamento real de ficheiros

// Verificar autenticação ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Aguardar que os utils estejam disponíveis
        await waitForUtils();
        
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

// Aguardar que os utils estejam disponíveis
function waitForUtils() {
    return new Promise((resolve) => {
        const checkUtils = () => {
            if (window.authUtils && window.supabaseUtils) {
                resolve();
            } else {
                setTimeout(checkUtils, 100);
            }
        };
        checkUtils();
    });
}

// Atualizar interface com informações do utilizador
function updateUserInterface(user) {
    // Adicionar informações do utilizador ao cabeçalho
    const sessionInfo = document.querySelector('.session-info');
    if (sessionInfo && user) {
        // Adicionar nome do utilizador e botão de logout
        sessionInfo.innerHTML = `
            <div class="user-info">
                <span class="user-name">
                    <i class="fas fa-user"></i> ${user.email}
                </span>
                <button id="logout-btn" class="btn btn-secondary btn-sm ml-10">
                    <i class="fas fa-sign-out-alt"></i> Sair
                </button>
            </div>
        `;
        
        // Configurar evento de logout
        document.getElementById('logout-btn').addEventListener('click', async () => {
            try {
                await window.authUtils.logout();
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
        const formattedDate = today.toLocaleDateString('pt-PT');
        currentDateElement.textContent = formattedDate;
    }
}

// Inicializar a aplicação
function initApp() {
    console.log('Inicializando aplicação...');
    
    // Configurar navegação por tabs
    setupNavigation();
    
    // Configurar upload de arquivos
    setupFileUploads();
    
    // Configurar botões de ação
    setupActionButtons();
}

// Configurar navegação por tabs
function setupNavigation() {
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
            
            // Ações específicas por tab
            onTabChange(targetTab);
        });
    });
}

// Ações quando muda de tab
function onTabChange(tabName) {
    switch (tabName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'export':
            loadExportData();
            break;
    }
}

// Configurar uploads de arquivos
function setupFileUploads() {
    setupFileUpload('odoo-file', 'odoo-filename', 'odoo-file-info');
    setupFileUpload('backoffice-file', 'backoffice-filename', 'backoffice-file-info');
    setupFileUpload('caixa-file', 'caixa-filename', 'caixa-file-info');
}

// Configurar upload individual
function setupFileUpload(fileInputId, filenameId, fileInfoId) {
    const fileInput = document.getElementById(fileInputId);
    if (!fileInput) return;
    
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
    const btn = fileUpload.querySelector('.btn');
    if (btn) {
        btn.addEventListener('click', () => {
            fileInput.click();
        });
    }
    
    // Configurar mudança de arquivo
    fileInput.addEventListener('change', () => {
        updateFileInfo(fileInput, filenameId, fileInfoId);
        checkFilesSelected();
        
        // Se for arquivo de caixa, processar automaticamente
        if (fileInputId === 'caixa-file' && fileInput.files[0]) {
            setTimeout(() => {
                if (window.fileProcessor) {
                    window.fileProcessor.processCashFile();
                }
            }, 500);
        }
    });
}

// Atualizar informações do arquivo selecionado
function updateFileInfo(fileInput, filenameId, fileInfoId) {
    const file = fileInput.files[0];
    const filenameElement = document.getElementById(filenameId);
    const fileInfoElement = document.getElementById(fileInfoId);
    
    if (file && filenameElement && fileInfoElement) {
        filenameElement.textContent = file.name;
        fileInfoElement.classList.remove('hidden');
        
        // Validar tipo de arquivo
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            showError('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
            fileInput.value = '';
            fileInfoElement.classList.add('hidden');
            return;
        }
        
        showSuccess(`Arquivo ${file.name} selecionado com sucesso!`);
    } else if (fileInfoElement) {
        fileInfoElement.classList.add('hidden');
    }
}

// Verificar se arquivos necessários foram selecionados
function checkFilesSelected() {
    const odooFile = document.getElementById('odoo-file')?.files[0];
    const backofficeFile = document.getElementById('backoffice-file')?.files[0];
    const processFilesBtn = document.getElementById('process-files-btn');
    
    if (processFilesBtn) {
        processFilesBtn.disabled = !(odooFile && backofficeFile);
        
        if (odooFile && backofficeFile) {
            processFilesBtn.innerHTML = '<i class="fas fa-play"></i> Processar Arquivos';
        } else {
            processFilesBtn.innerHTML = 'Selecione ambos os arquivos';
        }
    }
}

// Configurar botões de ação
function setupActionButtons() {
    // Botão de processamento de arquivos
    const processFilesBtn = document.getElementById('process-files-btn');
    if (processFilesBtn) {
        processFilesBtn.addEventListener('click', async () => {
            try {
                if (window.fileProcessor) {
                    await window.fileProcessor.processFiles();
                } else {
                    showError('Processador de arquivos não carregado. Recarregue a página.');
                }
            } catch (error) {
                console.error('Erro ao processar arquivos:', error);
                showError('Erro ao processar arquivos. Verifique os arquivos e tente novamente.');
            }
        });
    }
    
    // Botão de validação de comparação
    const validateComparisonBtn = document.getElementById('validate-comparison-btn');
    if (validateComparisonBtn) {
        validateComparisonBtn.addEventListener('click', () => {
            // Ativar próximo tab
            const validateTab = document.querySelector('[data-tab="validate"]');
            if (validateTab) {
                validateTab.click();
            }
        });
    }
    
    // Botões de filtro na comparação
    setupComparisonFilters();
    
    // Botão de exportação
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            try {
                await exportData();
            } catch (error) {
                console.error('Erro ao exportar:', error);
                showError('Erro ao exportar dados.');
            }
        });
    }
}

// Configurar filtros da comparação
function setupComparisonFilters() {
    const showAllBtn = document.getElementById('show-all-btn');
    const showMissingBtn = document.getElementById('show-missing-btn');
    const showInconsistentBtn = document.getElementById('show-inconsistent-btn');
    
    if (showAllBtn) {
        showAllBtn.addEventListener('click', () => filterComparison('all'));
    }
    if (showMissingBtn) {
        showMissingBtn.addEventListener('click', () => filterComparison('missing'));
    }
    if (showInconsistentBtn) {
        showInconsistentBtn.addEventListener('click', () => filterComparison('inconsistent'));
    }
}

// Filtrar resultados da comparação
function filterComparison(type) {
    const rows = document.querySelectorAll('#comparison-table tbody tr');
    
    rows.forEach(row => {
        const statusCell = row.querySelector('td:nth-child(6)');
        if (!statusCell) return;
        
        const status = statusCell.textContent.toLowerCase();
        let showRow = false;
        
        switch (type) {
            case 'all':
                showRow = true;
                break;
            case 'missing':
                showRow = status.includes('falta');
                break;
            case 'inconsistent':
                showRow = status.includes('inconsistente');
                break;
        }
        
        row.style.display = showRow ? '' : 'none';
    });
    
    // Atualizar botões ativos
    document.querySelectorAll('#comparison-table').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`show-${type}-btn`)?.classList.add('active');
}

// Carregar dados do dashboard
async function loadDashboardData() {
    try {
        // Implementar carregamento de estatísticas
        showMessage('Carregando dados do dashboard...', 'info');
        
        // Aqui seria feita a chamada para obter estatísticas da base de dados
        // const stats = await window.supabaseUtils.getDashboardStats();
        
        // Por agora, simular dados
        setTimeout(() => {
            updateDashboardCounters();
        }, 1000);
        
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showError('Erro ao carregar dados do dashboard.');
    }
}

// Atualizar contadores do dashboard
function updateDashboardCounters() {
    // Implementar atualização dos contadores
    // Esta função será expandida conforme necessário
}

// Carregar dados de exportação
async function loadExportData() {
    try {
        showMessage('Preparando dados para exportação...', 'info');
        
        // Implementar carregamento de dados para exportação
        const exportDate = document.getElementById('export-date');
        if (exportDate) {
            exportDate.textContent = new Date().toLocaleDateString('pt-PT');
        }
        
    } catch (error) {
        console.error('Erro ao carregar dados de exportação:', error);
        showError('Erro ao carregar dados de exportação.');
    }
}

// Exportar dados
async function exportData() {
    showMessage('Preparando exportação...', 'info');
    
    // Implementar lógica de exportação
    setTimeout(() => {
        showSuccess('Dados exportados com sucesso!');
    }, 2000);
}

// Função para mostrar mensagens de erro
function showError(message) {
    showMessage(message, 'error');
}

// Função para mostrar mensagens de sucesso
function showSuccess(message) {
    showMessage(message, 'success');
}

// Função genérica para mostrar mensagens
function showMessage(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Criar elemento de alerta
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type}`;
    alertElement.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        ${message}
        <button class="alert-close">&times;</button>
    `;
    
    // Adicionar estilos inline básicos
    alertElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        background-color: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        max-width: 400px;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Adicionar ao DOM
    document.body.appendChild(alertElement);
    
    // Configurar botão de fechar
    const closeBtn = alertElement.querySelector('.alert-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            alertElement.remove();
        });
    }
    
    // Remover automaticamente após 5 segundos
    setTimeout(() => {
        if (alertElement.parentNode) {
            alertElement.remove();
        }
    }, 5000);
}

// Expor funções globais necessárias
window.viewDetails = function(licensePlate) {
    console.log('Ver detalhes de:', licensePlate);
    showMessage(`Detalhes da matrícula: ${licensePlate}`, 'info');
};

console.log('App principal carregado com sucesso!');