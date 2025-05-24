// Processador de arquivos Excel com integração Supabase
import { createImportBatch, importSalesOrders, importDeliveries, importCashRecords } from './supabase.js';

document.addEventListener('DOMContentLoaded', function() {
    // Variáveis globais para armazenar os dados dos arquivos
    let salesData = null;
    let deliveriesData = null;
    let cashData = null;
    let currentBatchId = null;

    // Referências aos elementos de upload de arquivos
    const salesFileInput = document.getElementById('sales-file');
    const deliveriesFileInput = document.getElementById('deliveries-file');
    const caixaFileInput = document.getElementById('caixa-file');
    
    // Botões de upload
    const salesUpload = document.getElementById('sales-upload');
    const deliveriesUpload = document.getElementById('deliveries-upload');
    const caixaUpload = document.getElementById('caixa-upload');
    
    // Informações dos arquivos
    const salesFileInfo = document.getElementById('sales-file-info');
    const salesFilename = document.getElementById('sales-filename');
    const deliveriesFileInfo = document.getElementById('deliveries-file-info');
    const deliveriesFilename = document.getElementById('deliveries-filename');
    const caixaFileInfo = document.getElementById('caixa-file-info');
    const caixaFilename = document.getElementById('caixa-filename');
    
    // Botão de processamento
    const processFilesBtn = document.getElementById('process-files-btn');
    
    // Configurar eventos de upload para Sales Orders (antigo Odoo)
    salesUpload.addEventListener('click', function() {
        salesFileInput.click();
    });
    
    salesFileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            salesFilename.textContent = file.name;
            salesFileInfo.classList.remove('hidden');
            readExcelFile(file, 'sales');
        }
    });
    
    // Configurar eventos de upload para Deliveries (antigo Back Office)
    deliveriesUpload.addEventListener('click', function() {
        deliveriesFileInput.click();
    });
    
    deliveriesFileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            deliveriesFilename.textContent = file.name;
            deliveriesFileInfo.classList.remove('hidden');
            readExcelFile(file, 'deliveries');
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
                if (cashData) {
                    console.log("Iniciando validação de caixa automaticamente");
                    window.validator.initCaixaValidation(cashData);
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
                console.log(`Número de registos originais do ${fileType}: ${jsonData.length}`);
                
                if (jsonData.length > 0) {
                    console.log(`Colunas originais do ${fileType}:`, Object.keys(jsonData[0]));
                }
                
                // Processar dados conforme o tipo de arquivo
                if (fileType === 'sales') {
                    // Verificar se é o arquivo sales orders
                    if (isSalesFile(jsonData)) {
                        console.log("Detectado arquivo compatível com Sales Orders");
                        const transformedData = transformSalesData(jsonData);
                        salesData = transformedData;
                        console.log('Dados de Sales Orders transformados:', transformedData.slice(0, 2));
                        
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
                                const result = await importSalesOrders(salesData, currentBatchId);
                                console.log(`${result.count} registros de Sales Orders importados para o Supabase`);
                            } catch (error) {
                                console.error('Erro ao criar lote de importação ou importar dados:', error);
                                alert('Erro ao importar dados para o Supabase. Verifique o console para mais detalhes.');
                            }
                        } else {
                            try {
                                // Importar dados para o Supabase
                                const result = await importSalesOrders(salesData, currentBatchId);
                                console.log(`${result.count} registros de Sales Orders importados para o Supabase`);
                            } catch (error) {
                                console.error('Erro ao importar dados para o Supabase:', error);
                                alert('Erro ao importar dados para o Supabase. Verifique o console para mais detalhes.');
                            }
                        }
                    } else {
                        console.error("Arquivo Sales Orders não reconhecido. Esperava-se um arquivo sales orders ou similar.");
                        alert("O arquivo Sales Orders não está no formato esperado. Por favor, verifique o arquivo e tente novamente.");
                        return;
                    }
                } else if (fileType === 'deliveries') {
                    deliveriesData = jsonData;
                    console.log('Dados de Deliveries carregados:', deliveriesData.slice(0, 2));
                    
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
                            const result = await importDeliveries(deliveriesData, currentBatchId);
                            console.log(`${result.count} registros de Deliveries importados para o Supabase`);
                        } catch (error) {
                            console.error('Erro ao criar lote de importação ou importar dados:', error);
                            alert('Erro ao importar dados para o Supabase. Verifique o console para mais detalhes.');
                        }
                    } else {
                        try {
                            // Importar dados para o Supabase
                            const result = await importDeliveries(deliveriesData, currentBatchId);
                            console.log(`${result.count} registros de Deliveries importados para o Supabase`);
                        } catch (error) {
                            console.error('Erro ao importar dados para o Supabase:', error);
                            alert('Erro ao importar dados para o Supabase. Verifique o console para mais detalhes.');
                        }
                    }
                } else if (fileType === 'caixa') {
                    cashData = jsonData;
                    console.log('Dados da Caixa carregados:', cashData.slice(0, 2));
                    
                    // Importar dados para o Supabase
                    if (currentBatchId) {
                        try {
                            // Atualizar o lote de importação com o nome do arquivo de caixa
                            await supabase
                                .from('import_batches')
                                .update({ cash_filename: file.name })
                                .eq('id', currentBatchId);
                            
                            // Importar dados para o Supabase
                            const result = await importCashRecords(cashData, currentBatchId);
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
                if (salesData && deliveriesData) {
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
    
    // Função para verificar se é um arquivo Sales Orders
    function isSalesFile(data) {
        if (data.length === 0) return false;
        
        // Verificar se tem as colunas esperadas do arquivo sales orders
        const firstRow = data[0];
        
        // Verificar colunas principais
        const hasImma = firstRow.hasOwnProperty('imma');
        const hasDateStart = firstRow.hasOwnProperty('date_start');
        const hasParkingName = firstRow.hasOwnProperty('parking_name');
        
        // Verificar colunas alternativas que podem indicar um arquivo Sales Orders
        const hasLicensePlate = firstRow.hasOwnProperty('licensePlate') || firstRow.hasOwnProperty('license_plate');
        const hasBookingDate = firstRow.hasOwnProperty('bookingDate') || firstRow.hasOwnProperty('booking_date');
        const hasParkBrand = firstRow.hasOwnProperty('parkBrand') || firstRow.hasOwnProperty('park_brand');
        
        // Verificar outras colunas comuns em arquivos Sales Orders
        const hasPrice = firstRow.hasOwnProperty('price');
        const hasDateEnd = firstRow.hasOwnProperty('date_end');
        
        const hasExpectedColumns = hasImma || hasDateStart || hasParkingName || 
                                  (hasLicensePlate && (hasBookingDate || hasParkBrand)) ||
                                  (hasLicensePlate && hasPrice);
        
        console.log("Verificação de arquivo Sales Orders:", {
            hasImma,
            hasDateStart,
            hasParkingName,
            hasLicensePlate,
            hasBookingDate,
            hasParkBrand,
            hasPrice,
            hasDateEnd,
            resultado: hasExpectedColumns
        });
        
        return hasExpectedColumns;
    }
    
    // Função para normalizar matrículas
    function normalizeLicensePlate(plate) {
        if (!plate) return '';
        
        // Converter para string
        const plateStr = String(plate);
        
        // Remover espaços, traços, pontos e outros caracteres especiais
        return plateStr.replace(/[\s\-\.\,\/\\\(\)\[\]\{\}\+\*\?\^\$\|]/g, '').toLowerCase();
    }
    
    // Função para transformar dados do Sales Orders
    function transformSalesData(data) {
        console.log('Iniciando transformação dos dados do Sales Orders');
        
        // Criar cópia dos dados para não modificar os originais
        const transformedData = [];
        
        // Transformar cada registro
        for (let i = 0; i < data.length; i++) {
            const record = data[i];
            const newRecord = {};
            
            // Mapear campos do arquivo sales orders para o formato padrão
            // Campos obrigatórios para o comparator.js
            newRecord.licensePlate = normalizeLicensePlate(record.imma || record.licensePlate || record.license_plate || record.matricula || '');
            newRecord.bookingPrice = record.price ? Number(record.price) : (record.bookingPrice ? Number(record.bookingPrice) : (record.preco ? Number(record.preco) : 0));
            newRecord.parkBrand = standardizeParkName(record.parking_name || record.parkBrand || record.park_brand || record.parque || '');
            
            // Normalizar o campo share como número
            newRecord.share = record.share != null ? Number(record.share) : 0;
            
            // Campos adicionais
            newRecord.bookingDate = formatDate(record.date_start || record.bookingDate || record.booking_date || record.data_reserva || '');
            newRecord.checkIn = formatDate(record.date_checkin || record.checkIn || record.check_in || record.data_entrada || '');
            newRecord.checkOut = formatDate(record.date_end || record.checkOut || record.check_out || record.data_saida || '');
            newRecord.priceOnDelivery = record.price_to_pay ? Number(record.price_to_pay) : (record.priceOnDelivery ? Number(record.priceOnDelivery) : (record.preco_entrega ? Number(record.preco_entrega) : 0));
            
            // Campos para método de pagamento e condutor
            newRecord.paymentMethod = record.payment_method || record.paymentMethod || record.metodo_pagamento || record.metodoPagamento || '';
            newRecord.driver = record.driver || record.condutor || record.driverName || record.driver_name || record.conductorEntrega || record.conductorRecogida || '';
            
            // Adicionar campos originais para referência
            newRecord.original_imma = record.imma || record.licensePlate || record.license_plate || record.matricula || '';
            newRecord.original_date_start = record.date_start || record.bookingDate || record.booking_date || record.data_reserva || '';
            newRecord.original_date_checkin = record.date_checkin || record.checkIn || record.check_in || record.data_entrada || '';
            newRecord.original_date_end = record.date_end || record.checkOut || record.check_out || record.data_saida || '';
            newRecord.original_parking_name = record.parking_name || record.parkBrand || record.park_brand || record.parque || '';
            newRecord.original_price = record.price || record.bookingPrice || record.preco || 0;
            newRecord.original_price_to_pay = record.price_to_pay || record.priceOnDelivery || record.preco_entrega || 0;
            
            if (i < 2) {
                console.log(`Registro Sales Orders transformado ${i+1}:`, newRecord);
            }
            
            transformedData.push(newRecord);
        }
        
        console.log(`Transformação do Sales Orders concluída. Registros originais: ${data.length}, Registros transformados: ${transformedData.length}`);
        return transformedData;
    }
    
    // Função para padronizar nomes de parques
    function standardizeParkName(parkName) {
        if (!parkName) return '';
        
        // Converter para string e para minúsculas inicialmente para processamento
        const name = String(parkName).toLowerCase();
        
        // Remover palavras como "parking", "estacionamento", "park", "parque"
        let cleanName = name
            .replace(/\s+parking\b/g, '')
            .replace(/\s+estacionamento\b/g, '')
            .replace(/\s+park\b/g, '')
            .replace(/\s+parque\b/g, '');
            
        // Retornar o nome em MAIÚSCULAS
        return cleanName.trim().toUpperCase();
    }
    
    // Função para formatar data
    function formatDate(dateValue) {
        if (!dateValue) return '';
        
        try {
            let dateObj;
            
            // Verificar se é um número (timestamp)
            if (typeof dateValue === 'number' || !isNaN(Number(dateValue))) {
                // Converter para número se for string numérica
                const timestamp = typeof dateValue === 'number' ? dateValue : Number(dateValue);
                
                // Verificar se é um timestamp em segundos (Odoo) ou milissegundos
                dateObj = timestamp > 10000000000 ? new Date(timestamp) : new Date(timestamp * 1000);
            } 
            // Verificar se é uma string no formato "dd/mm/yyyy, hh:mm"
            else if (typeof dateValue === 'string' && dateValue.includes('/')) {
                // Remover a vírgula que está causando problemas
                const cleanDateValue = dateValue.replace(/,/g, ' ');
                
                const parts = cleanDateValue.split(/[\/\s:]/);
                if (parts.length >= 5) {
                    const day = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1; // Mês em JavaScript é 0-indexed
                    const year = parseInt(parts[2], 10);
                    const hour = parseInt(parts[3], 10);
                    const minute = parseInt(parts[4], 10);
                    const second = parts.length >= 6 ? parseInt(parts[5], 10) : 0;
                    dateObj = new Date(year, month, day, hour, minute, second);
                } else {
                    // Tentar parse padrão
                    dateObj = new Date(cleanDateValue);
                }
            }
            // Verificar se é uma string no formato "yyyy-mm-dd hh:mm:ss"
            else if (typeof dateValue === 'string' && dateValue.includes('-')) {
                dateObj = new Date(dateValue);
            }
            // Verificar se já é um objeto Date
            else if (dateValue instanceof Date) {
                dateObj = dateValue;
            }
            else if (typeof dateValue === 'string' && dateValue.includes('Timestamp')) {
                const timestampStr = String(dateValue);
                const secondsMatch = timestampStr.match(/seconds=(\d+)/);
                if (secondsMatch && secondsMatch[1]) {
                    const seconds = parseInt(secondsMatch[1]);
                    dateObj = new Date(seconds * 1000);
                } else {
                    // Tentar parse padrão como último recurso
                    dateObj = new Date(dateValue);
                }
            }
            else {
                // Tentar parse padrão como último recurso
                dateObj = new Date(dateValue);
            }
            
            // Verificar se a data é válida
            if (isNaN(dateObj.getTime())) {
                console.error(`Data inválida: ${dateValue}`);
                return dateValue;
            }
            
            // Formatar para dd/mm/aaaa hh:mm:ss
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            const hours = String(dateObj.getHours()).padStart(2, '0');
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
            const seconds = String(dateObj.getSeconds()).padStart(2, '0');
            
            return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        } catch (error) {
            console.error(`Erro ao formatar data ${dateValue}:`, error);
            return dateValue;
        }
    }
    
    // Botão de processamento
    processFilesBtn.addEventListener('click', async function() {
        if (salesData && deliveriesData) {
            console.log('Processando arquivos...');
            
            try {
                // Iniciar comparação
                window.comparator.compareOdooBackOffice(salesData, deliveriesData);
                
                // Salvar resultados da comparação no Supabase
                const comparisonResults = window.comparator.getResults();
                if (comparisonResults && comparisonResults.all) {
                    const result = await saveComparisonResults(comparisonResults.all, currentBatchId);
                    console.log(`${result.count} resultados de comparação salvos no Supabase`);
                }
                
                // Navegar para a aba de comparação
                document.querySelector('.nav-tab[data-tab="compare"]').click();
            } catch (error) {
                console.error('Erro ao processar arquivos:', error);
                alert('Erro ao processar arquivos. Verifique o console para mais detalhes.');
            }
        } else {
            alert('Por favor, importe os arquivos Sales Orders e Deliveries antes de processar.');
        }
    });
    
    // Expor funções e variáveis para uso externo
    window.fileProcessor = {
        getSalesData: () => salesData,
        getDeliveriesData: () => deliveriesData,
        getCashData: () => cashData,
        getCurrentBatchId: () => currentBatchId
    };
});
