// Processador de arquivos Excel com integração Supabase
import { createImportBatch, importSalesOrders, importDeliveries, importCashRecords } from './supabase.js';

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
                if (caixaData) {
                    console.log("Iniciando validação de caixa automaticamente");
                    window.validator.initCaixaValidation(caixaData);
                } else {
                    console.error("Dados da caixa não foram carregados corretamente");
                }
            }, 1000);
        }
    });
    
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
                
                console.log(`Dados originais do ${fileType}:`, jsonData.slice(0, 2)); // Mostrar apenas os primeiros 2 registros
                
                // Processar dados conforme o tipo de arquivo
                if (fileType === 'odoo') {
                    odooData = jsonData;
                    console.log('Dados do Odoo carregados:', odooData.slice(0, 2));
                    
                    // Criar lote de importação se ainda não existir
                    if (!currentBatchId) {
                        try {
                            const batchInfo = {
                                batchDate: new Date().toISOString().split('T')[0],
                                salesFilename: file.name
                            };
                            const batch = await createImportBatch(batchInfo);
                            currentBatchId = batch.id;
                            console.log('Lote de importação criado:', currentBatchId);
                            
                            // Importar dados para o Supabase
                            const result = await importSalesOrders(odooData, currentBatchId);
                            console.log(`${result.count} registros de Sales Orders importados para o Supabase`);
                        } catch (error) {
                            console.error('Erro ao criar lote de importação ou importar dados:', error);
                            alert('Erro ao importar dados para o Supabase. Verifique o console para mais detalhes.');
                        }
                    } else {
                        try {
                            // Importar dados para o Supabase
                            const result = await importSalesOrders(odooData, currentBatchId);
                            console.log(`${result.count} registros de Sales Orders importados para o Supabase`);
                        } catch (error) {
                            console.error('Erro ao importar dados para o Supabase:', error);
                            alert('Erro ao importar dados para o Supabase. Verifique o console para mais detalhes.');
                        }
                    }
                } else if (fileType === 'backoffice') {
                    backOfficeData = jsonData;
                    console.log('Dados do Back Office carregados:', backOfficeData.slice(0, 2));
                    
                    // Criar lote de importação se ainda não existir
                    if (!currentBatchId) {
                        try {
                            const batchInfo = {
                                batchDate: new Date().toISOString().split('T')[0],
                                deliveriesFilename: file.name
                            };
                            const batch = await createImportBatch(batchInfo);
                            currentBatchId = batch.id;
                            console.log('Lote de importação criado:', currentBatchId);
                            
                            // Importar dados para o Supabase
                            const result = await importDeliveries(backOfficeData, currentBatchId);
                            console.log(`${result.count} registros de Deliveries importados para o Supabase`);
                        } catch (error) {
                            console.error('Erro ao criar lote de importação ou importar dados:', error);
                            alert('Erro ao importar dados para o Supabase. Verifique o console para mais detalhes.');
                        }
                    } else {
                        try {
                            // Importar dados para o Supabase
                            const result = await importDeliveries(backOfficeData, currentBatchId);
                            console.log(`${result.count} registros de Deliveries importados para o Supabase`);
                        } catch (error) {
                            console.error('Erro ao importar dados para o Supabase:', error);
                            alert('Erro ao importar dados para o Supabase. Verifique o console para mais detalhes.');
                        }
                    }
                } else if (fileType === 'caixa') {
                    caixaData = jsonData;
                    console.log('Dados da Caixa carregados:', caixaData.slice(0, 2));
                    
                    // Importar dados para o Supabase
                    if (currentBatchId) {
                        try {
                            // Atualizar o lote de importação com o nome do arquivo de caixa
                            await supabase
                                .from('import_batches')
                                .update({ cash_filename: file.name })
                                .eq('id', currentBatchId);
                            
                            // Importar dados para o Supabase
                            const result = await importCashRecords(caixaData, currentBatchId);
                            console.log(`${result.count} registros de Caixa importados para o Supabase`);
                        } catch (error) {
                            console.error('Erro ao importar dados para o Supabase:', error);
                            alert('Erro ao importar dados para o Supabase. Verifique o console para mais detalhes.');
                        }
                    } else {
                        console.warn('Nenhum lote de importação criado. Crie um lote importando Sales Orders ou Deliveries primeiro.');
                        alert('Por favor, importe os arquivos Sales Orders ou Deliveries antes de importar o arquivo de Caixa.');
                    }
                }
                
                // Verificar se ambos os arquivos iniciais foram carregados
                if (odooData && backOfficeData) {
                    processFilesBtn.disabled = false;
                }
                
            } catch (error) {
                console.error('Erro ao processar o arquivo:', error);
                alert('Erro ao processar o arquivo. Verifique se é um arquivo Excel válido.');
            }
        };
        
        reader.onerror = function() {
            console.error('Erro ao ler o arquivo');
            alert('Erro ao ler o arquivo. Tente novamente.');
        };
        
        reader.readAsArrayBuffer(file);
    }
    
    // Evento para o botão de processamento
    processFilesBtn.addEventListener('click', function() {
        if (odooData && backOfficeData) {
            // Chamar função de comparação do arquivo comparator.js
            window.compareOdooBackOffice(odooData, backOfficeData);
            
            // Mudar para a aba de comparação
            const compareTab = document.querySelector('.nav-tab[data-tab="compare"]');
            changeTab(compareTab);
        } else {
            alert('Por favor, carregue os arquivos Odoo e Back Office antes de prosseguir.');
        }
    });
    
    // Exportar as variáveis e funções para uso global
    window.fileProcessor = {
        odooData: () => odooData,
        backOfficeData: () => backOfficeData,
        caixaData: () => caixaData,
        setOdooData: (data) => { odooData = data; },
        setBackOfficeData: (data) => { backOfficeData = data; },
        setCaixaData: (data) => { 
            caixaData = data;
            console.log('Dados da Caixa atualizados via API:', caixaData);
        }
    };
});
