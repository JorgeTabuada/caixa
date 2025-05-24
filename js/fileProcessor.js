// Processador de arquivos Excel
document.addEventListener('DOMContentLoaded', function() {
    // Variáveis globais para armazenar os dados dos arquivos
    let odooData = null;
    let backOfficeData = null;
    let caixaData = null;

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
            // Este trecho foi adicionado para corrigir o problema de carregamento
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
        
        reader.onload = function(e) {
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
                if (fileType === 'odoo') {
                    // Verificar se é o arquivo sale.booking ou similar
                    if (isOdooFile(jsonData)) {
                        console.log("Detectado arquivo compatível com Odoo");
                        const transformedData = transformOdooData(jsonData);
                        odooData = transformedData;
                        console.log('Dados do Odoo transformados:', transformedData.slice(0, 2));
                    } else {
                        console.error("Arquivo Odoo não reconhecido. Esperava-se um arquivo sale.booking ou similar.");
                        alert("O arquivo Odoo não está no formato esperado. Por favor, verifique o arquivo e tente novamente.");
                        return;
                    }
                } else if (fileType === 'backoffice') {
                    backOfficeData = jsonData;
                    console.log('Dados do Back Office carregados:', backOfficeData.slice(0, 2));
                } else if (fileType === 'caixa') {
                    caixaData = jsonData;
                    console.log('Dados da Caixa carregados:', caixaData.slice(0, 2));
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
    
    // Função para verificar se é um arquivo Odoo (sale.booking ou similar)
    function isOdooFile(data) {
        if (data.length === 0) return false;
        
        // Verificar se tem as colunas esperadas do arquivo sale.booking ou similar
        const firstRow = data[0];
        
        // Verificar colunas principais
        const hasImma = firstRow.hasOwnProperty('imma');
        const hasDateStart = firstRow.hasOwnProperty('date_start');
        const hasParkingName = firstRow.hasOwnProperty('parking_name');
        
        // Verificar colunas alternativas que podem indicar um arquivo Odoo
        const hasLicensePlate = firstRow.hasOwnProperty('licensePlate') || firstRow.hasOwnProperty('license_plate');
        const hasBookingDate = firstRow.hasOwnProperty('bookingDate') || firstRow.hasOwnProperty('booking_date');
        const hasParkBrand = firstRow.hasOwnProperty('parkBrand') || firstRow.hasOwnProperty('park_brand');
        
        // Verificar outras colunas comuns em arquivos Odoo
        const hasPrice = firstRow.hasOwnProperty('price');
        const hasDateEnd = firstRow.hasOwnProperty('date_end');
        
        const hasExpectedColumns = hasImma || hasDateStart || hasParkingName || 
                                  (hasLicensePlate && (hasBookingDate || hasParkBrand)) ||
                                  (hasLicensePlate && hasPrice);
        
        console.log("Verificação de arquivo Odoo:", {
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
    
    // Função para transformar dados do Odoo (sale.booking ou similar)
    function transformOdooData(data) {
        console.log('Iniciando transformação dos dados do Odoo');
        
        // Criar cópia dos dados para não modificar os originais
        const transformedData = [];
        
        // Transformar cada registro
        for (let i = 0; i < data.length; i++) {
            const record = data[i];
            const newRecord = {};
            
            // Mapear campos do arquivo sale.booking para o formato padrão
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
                console.log(`Registro Odoo transformado ${i+1}:`, newRecord);
            }
            
            transformedData.push(newRecord);
        }
        
        console.log(`Transformação do Odoo concluída. Registros originais: ${data.length}, Registros transformados: ${transformedData.length}`);
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
            console.error(`Erro ao formatar data: ${error}`);
            return dateValue;
        }
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
        },
        normalizeLicensePlate: normalizeLicensePlate,
        standardizeParkName: standardizeParkName
    };
});
