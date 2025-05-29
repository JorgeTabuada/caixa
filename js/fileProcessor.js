// Processador de arquivos Excel com integração Supabase
// Versão corrigida sem ES6 imports

document.addEventListener('DOMContentLoaded', function() {
    // Variáveis globais para armazenar os dados dos arquivos
    let odooData = null;
    let backOfficeData = null;
    let caixaData = null;
    let currentBatchId = null;

    // Referências aos elementos de upload de arquivos
    const odooFileInput = document.getElementById('odoo-file');
    const backofficeFileInput = document.getElementById('backoffice-file');
    const caixaFileInput = document.getElementById('caixa-file');
    
    // Botões de upload
    const odooUpload = document.getElementById('odoo-upload');
    const backofficeUpload = document.getElementById('backoffice-upload');
    const caixaUpload = document.getElementById('caixa-upload');
    
    // Informações dos arquivos
    const odooFileInfo = document.getElementById('odoo-file-info');
    const odooFilename = document.getElementById('odoo-filename');
    const backofficeFileInfo = document.getElementById('backoffice-file-info');
    const backofficeFilename = document.getElementById('backoffice-filename');
    const caixaFileInfo = document.getElementById('caixa-file-info');
    const caixaFilename = document.getElementById('caixa-filename');
    
    // Botão de processamento
    const processFilesBtn = document.getElementById('process-files-btn');
    
    // Configurar eventos de upload para Odoo
    odooUpload.addEventListener('click', function() {
        odooFileInput.click();
    });
    
    odooFileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            odooFilename.textContent = file.name;
            odooFileInfo.classList.remove('hidden');
            readExcelFile(file, 'odoo');
        }
    });
    
    // Configurar eventos de upload para Back Office
    backofficeUpload.addEventListener('click', function() {
        backofficeFileInput.click();
    });
    
    backofficeFileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            backofficeFilename.textContent = file.name;
            backofficeFileInfo.classList.remove('hidden');
            readExcelFile(file, 'backoffice');
        }
    });
    
    // Configurar eventos de upload para Caixa
    caixaUpload.addEventListener('click', function() {
        caixaFileInput.click();
    });
    
    caixaFileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            caixaFilename.textContent = file.name;
            caixaFileInfo.classList.remove('hidden');
            readExcelFile(file, 'caixa');
            
            // Iniciar validação de caixa se os dados forem carregados com sucesso
            setTimeout(function() {
                if (caixaData && window.validator) {
                    console.log("Iniciando validação de caixa automaticamente");
                    window.validator.initCaixaValidation(caixaData);
                } else {
                    console.error("Dados da caixa não foram carregados corretamente ou validator não disponível");
                }
            }, 1000);
        }
    });
    
    // Função para normalizar nomes de colunas do Excel
    function normalizeColumnName(name) {
        if (!name) return '';
        
        const columnMappings = {
            // Mapeamentos em português
            'matrícula': 'licensePlate',
            'matricula': 'licensePlate',
            'preço booking': 'bookingPrice',
            'preco booking': 'bookingPrice',
            'marca': 'parkBrand',
            'alocação': 'alocation',
            'alocacao': 'alocation',
            'condutor': 'driver',
            'método pagamento': 'paymentMethod',
            'metodo pagamento': 'paymentMethod',
            'preço na entrega': 'priceOnDelivery',
            'preco na entrega': 'priceOnDelivery',
            'campanha': 'campaign',
            'condutor entrega': 'condutorEntrega',
            
            // Mapeamentos em inglês
            'license plate': 'licensePlate',
            'booking price': 'bookingPrice',
            'park brand': 'parkBrand',
            'payment method': 'paymentMethod',
            'price on delivery': 'priceOnDelivery',
            'check in': 'checkIn',
            'check out': 'checkOut',
            'campaign pay': 'campaignPay',
            'has online payment': 'hasOnlinePayment'
        };
        
        const normalized = name.toLowerCase().trim();
        return columnMappings[normalized] || name;
    }
    
    // Função para processar os dados do Excel e normalizar
    function processExcelData(rawData) {
        if (!rawData || rawData.length === 0) return [];
        
        return rawData.map(row => {
            const processedRow = {};
            
            Object.keys(row).forEach(key => {
                const normalizedKey = normalizeColumnName(key);
                processedRow[normalizedKey] = row[key];
            });
            
            return processedRow;
        });
    }
    
    // Função para ler arquivo Excel
    function readExcelFile(file, fileType) {
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Obter a primeira planilha
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Converter para JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {defval: ""});
                
                // Processar e normalizar dados
                const processedData = processExcelData(jsonData);
                
                console.log(`Dados originais do ${fileType}:`, jsonData.slice(0, 2));
                console.log(`Dados processados do ${fileType}:`, processedData.slice(0, 2));
                
                // Processar dados conforme o tipo de arquivo
                if (fileType === 'odoo') {
                    odooData = processedData;
                    console.log('Dados do Odoo carregados:', odooData.slice(0, 2));
                    
                    // Criar lote de importação se ainda não existir
                    if (!currentBatchId && window.supabaseUtils) {
                        try {
                            const batchInfo = {
                                batchDate: new Date().toISOString().split('T')[0],
                                salesFilename: file.name
                            };
                            const batch = await window.supabaseUtils.createImportBatch(batchInfo);
                            currentBatchId = batch.id;
                            console.log('Lote de importação criado:', currentBatchId);
                            
                            // Importar dados para o Supabase
                            const result = await window.supabaseUtils.importSalesOrders(odooData, currentBatchId);
                            console.log(`${result.count} registros de Sales Orders importados para o Supabase`);
                        } catch (error) {
                            console.error('Erro ao criar lote de importação ou importar dados:', error);
                            showNotification('Erro ao importar dados para o Supabase. Continuando sem sincronização.', 'warning');
                        }
                    } else if (window.supabaseUtils && currentBatchId) {
                        try {
                            // Importar dados para o Supabase
                            const result = await window.supabaseUtils.importSalesOrders(odooData, currentBatchId);
                            console.log(`${result.count} registros de Sales Orders importados para o Supabase`);
                        } catch (error) {
                            console.error('Erro ao importar dados para o Supabase:', error);
                            showNotification('Erro ao importar dados para o Supabase. Continuando sem sincronização.', 'warning');
                        }
                    }
                } else if (fileType === 'backoffice') {
                    backOfficeData = processedData;
                    console.log('Dados do Back Office carregados:', backOfficeData.slice(0, 2));
                    
                    // Criar lote de importação se ainda não existir
                    if (!currentBatchId && window.supabaseUtils) {
                        try {
                            const batchInfo = {
                                batchDate: new Date().toISOString().split('T')[0],
                                deliveriesFilename: file.name
                            };
                            const batch = await window.supabaseUtils.createImportBatch(batchInfo);
                            currentBatchId = batch.id;
                            console.log('Lote de importação criado:', currentBatchId);
                            
                            // Importar dados para o Supabase
                            const result = await window.supabaseUtils.importDeliveries(backOfficeData, currentBatchId);
                            console.log(`${result.count} registros de Deliveries importados para o Supabase`);
                        } catch (error) {
                            console.error('Erro ao criar lote de importação ou importar dados:', error);
                            showNotification('Erro ao importar dados para o Supabase. Continuando sem sincronização.', 'warning');
                        }
                    } else if (window.supabaseUtils && currentBatchId) {
                        try {
                            // Importar dados para o Supabase
                            const result = await window.supabaseUtils.importDeliveries(backOfficeData, currentBatchId);
                            console.log(`${result.count} registros de Deliveries importados para o Supabase`);
                        } catch (error) {
                            console.error('Erro ao importar dados para o Supabase:', error);
                            showNotification('Erro ao importar dados para o Supabase. Continuando sem sincronização.', 'warning');
                        }
                    }
                } else if (fileType === 'caixa') {
                    caixaData = processedData;
                    console.log('Dados da Caixa carregados:', caixaData.slice(0, 2));
                    
                    // Importar dados para o Supabase
                    if (currentBatchId && window.supabaseUtils) {
                        try {
                            // Atualizar o lote de importação com o nome do arquivo de caixa
                            await window.supabase
                                .from('import_batches')
                                .update({ cash_filename: file.name })
                                .eq('id', currentBatchId);
                            
                            // Importar dados para o Supabase
                            const result = await window.supabaseUtils.importCashRecords(caixaData, currentBatchId);
                            console.log(`${result.count} registros de Caixa importados para o Supabase`);
                        } catch (error) {
                            console.error('Erro ao importar dados para o Supabase:', error);
                            showNotification('Erro ao importar dados para o Supabase. Continuando sem sincronização.', 'warning');
                        }
                    } else {
                        console.warn('Nenhum lote de importação criado ou Supabase não disponível.');
                    }
                }
                
                // Verificar se ambos os arquivos iniciais foram carregados
                checkFilesSelected();
                
            } catch (error) {
                console.error('Erro ao processar o arquivo:', error);
                showNotification('Erro ao processar o arquivo. Verifique se é um arquivo Excel válido.', 'error');
            }
        };
        
        reader.onerror = function() {
            console.error('Erro ao ler o arquivo');
            showNotification('Erro ao ler o arquivo. Tente novamente.', 'error');
        };
        
        reader.readAsArrayBuffer(file);
    }
    
    // Verificar se ambos os arquivos foram selecionados para habilitar o botão de processamento
    function checkFilesSelected() {
        const odooFile = document.getElementById('odoo-file').files[0];
        const backofficeFile = document.getElementById('backoffice-file').files[0];
        
        if (processFilesBtn) {
            processFilesBtn.disabled = !(odooData && backOfficeData);
        }
    }
    
    // Evento para o botão de processamento
    if (processFilesBtn) {
        processFilesBtn.addEventListener('click', function() {
            if (odooData && backOfficeData) {
                // Chamar função de comparação do arquivo comparator.js
                if (window.compareOdooBackOffice) {
                    window.compareOdooBackOffice(odooData, backOfficeData);
                    
                    // Mudar para a aba de comparação
                    const compareTab = document.querySelector('.nav-tab[data-tab="compare"]');
                    if (compareTab) {
                        compareTab.click();
                    }
                } else {
                    console.error('Função de comparação não disponível');
                    showNotification('Erro: Função de comparação não disponível.', 'error');
                }
            } else {
                showNotification('Por favor, carregue os arquivos Odoo e Back Office antes de prosseguir.', 'warning');
            }
        });
    }
    
    // Função para mostrar notificações
    function showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 4px;
            color: white;
            z-index: 9999;
            max-width: 400px;
            word-wrap: break-word;
        `;
        
        // Definir cor conforme o tipo
        switch (type) {
            case 'error':
                notification.style.backgroundColor = '#e74c3c';
                break;
            case 'warning':
                notification.style.backgroundColor = '#f39c12';
                break;
            case 'success':
                notification.style.backgroundColor = '#2ecc71';
                break;
            default:
                notification.style.backgroundColor = '#3498db';
        }
        
        document.body.appendChild(notification);
        
        // Remover após 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
    
    // Exportar as variáveis e funções para uso global
    window.fileProcessor = {
        odooData: () => odooData,
        backOfficeData: () => backOfficeData,
        caixaData: () => caixaData,
        getCurrentBatchId: () => currentBatchId,
        setOdooData: (data) => { odooData = data; },
        setBackOfficeData: (data) => { backOfficeData = data; },
        setCaixaData: (data) => { caixaData = data; },
        showNotification
    };
});
