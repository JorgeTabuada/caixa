// Processador de ficheiros Excel para Caixa Multipark
// Implementação real que conecta com Supabase

let currentBatchId = null;

// Variáveis globais para armazenar dados
let salesOrdersData = [];
let deliveriesData = [];
let cashRecordsData = [];

// Processar ficheiros principais (Sales Orders + Entregas)
async function processFiles() {
    const odooFile = document.getElementById('odoo-file')?.files[0];
    const backofficeFile = document.getElementById('backoffice-file')?.files[0];
    
    if (!odooFile || !backofficeFile) {
        showError('Por favor, selecione ambos os arquivos antes de processar.');
        return;
    }
    
    const processFilesBtn = document.getElementById('process-files-btn');
    if (processFilesBtn) {
        processFilesBtn.disabled = true;
        processFilesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    }
    
    try {
        showSuccess('Iniciando processamento dos arquivos...');
        
        // 1. Criar lote de importação
        const batchInfo = {
            batchDate: new Date().toISOString().split('T')[0],
            salesFilename: odooFile.name,
            deliveriesFilename: backofficeFile.name
        };
        
        const batch = await window.supabaseUtils.createImportBatch(batchInfo);
        currentBatchId = batch.id;
        console.log('Lote criado:', currentBatchId);
        
        // 2. Processar arquivo Sales Orders (Odoo)
        showMessage('Processando arquivo Sales Orders...', 'info');
        salesOrdersData = await processExcelFile(odooFile, 'sales_orders');
        
        if (salesOrdersData.length > 0) {
            const salesResult = await window.supabaseUtils.importSalesOrders(salesOrdersData, currentBatchId);
            showSuccess(`${salesResult.count} registros de Sales Orders importados!`);
        }
        
        // 3. Processar arquivo Entregas (Back Office)
        showMessage('Processando arquivo Entregas...', 'info');
        deliveriesData = await processExcelFile(backofficeFile, 'deliveries');
        
        if (deliveriesData.length > 0) {
            const deliveriesResult = await window.supabaseUtils.importDeliveries(deliveriesData, currentBatchId);
            showSuccess(`${deliveriesResult.count} registros de Entregas importados!`);
        }
        
        // 4. Fazer comparação automática
        showMessage('Fazendo comparação entre Sales Orders e Entregas...', 'info');
        await performComparison();
        
        showSuccess('Arquivos processados com sucesso! Verifique o separador Comparação.');
        
        // 5. Ativar próximo separador
        const compareTab = document.querySelector('[data-tab="compare"]');
        if (compareTab) {
            compareTab.click();
        }
        
        // 6. Atualizar contadores
        updateComparisonSummary();
        
    } catch (error) {
        console.error('Erro ao processar arquivos:', error);
        showError(`Erro ao processar arquivos: ${error.message}`);
    } finally {
        if (processFilesBtn) {
            processFilesBtn.disabled = false;
            processFilesBtn.innerHTML = 'Processar Arquivos';
        }
    }
}

// Processar ficheiro Excel individual
async function processExcelFile(file, type) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                // Processar dados conforme o tipo
                const processedData = processSheetData(jsonData, type);
                resolve(processedData);
                
            } catch (error) {
                reject(new Error(`Erro ao processar ${file.name}: ${error.message}`));
            }
        };
        
        reader.onerror = function() {
            reject(new Error(`Erro ao ler o arquivo ${file.name}`));
        };
        
        reader.readAsBinaryString(file);
    });
}

// Processar dados da planilha conforme o tipo
function processSheetData(jsonData, type) {
    if (jsonData.length < 2) return []; // Sem dados
    
    const headers = jsonData[0];
    const rows = jsonData.slice(1);
    
    const processedData = [];
    
    for (const row of rows) {
        if (!row || row.length === 0) continue; // Linha vazia
        
        const record = {};
        
        // Mapear colunas conforme o tipo de ficheiro
        headers.forEach((header, index) => {
            const value = row[index];
            if (value !== undefined && value !== null && value !== '') {
                record[normalizeColumnName(header)] = value;
            }
        });
        
        // Adicionar campos específicos conforme o tipo
        if (type === 'sales_orders') {
            processedData.push(processSalesOrderRecord(record));
        } else if (type === 'deliveries') {
            processedData.push(processDeliveryRecord(record));
        } else if (type === 'cash_records') {
            processedData.push(processCashRecord(record));
        }
    }
    
    return processedData.filter(record => record.licensePlate); // Só registros com matrícula
}

// Normalizar nomes de colunas
function normalizeColumnName(header) {
    if (!header) return '';
    
    const normalized = header.toString().toLowerCase().trim();
    
    // Mapeamento de colunas comuns
    const mappings = {
        'matrícula': 'licensePlate',
        'matricula': 'licensePlate',
        'license plate': 'licensePlate',
        'placa': 'licensePlate',
        'alocação': 'alocation',
        'alocacao': 'alocation',
        'preço booking': 'bookingPrice',
        'preco booking': 'bookingPrice',
        'booking price': 'bookingPrice',
        'preço': 'bookingPrice',
        'preco': 'bookingPrice',
        'marca': 'parkBrand',
        'park brand': 'parkBrand',
        'condutor': 'driver',
        'driver': 'driver',
        'método pagamento': 'paymentMethod',
        'metodo pagamento': 'paymentMethod',
        'payment method': 'paymentMethod',
        'pagamento': 'paymentMethod',
        'check in': 'checkIn',
        'check out': 'checkOut',
        'campanha': 'campaign',
        'campaign': 'campaign'
    };
    
    return mappings[normalized] || normalized.replace(/\s+/g, '');
}

// Processar registo de Sales Orders
function processSalesOrderRecord(record) {
    return {
        licensePlate: cleanLicensePlate(record.licensePlate || record.matricula || record.placa),
        bookingPrice: parseFloat(record.bookingPrice || record.preco || 0),
        parkBrand: record.parkBrand || record.marca || '',
        driver: record.driver || record.condutor || '',
        paymentMethod: normalizePaymentMethod(record.paymentMethod || record.pagamento || ''),
        checkIn: parseDate(record.checkIn),
        checkOut: parseDate(record.checkOut),
        campaign: record.campaign || record.campanha || '',
        campaignPay: record.campaignPay === 'true' || record.campaignPay === true,
        hasOnlinePayment: record.hasOnlinePayment === 'true' || record.hasOnlinePayment === true
    };
}

// Processar registo de Entregas
function processDeliveryRecord(record) {
    return {
        licensePlate: cleanLicensePlate(record.licensePlate || record.matricula || record.placa),
        alocation: record.alocation || record.alocacao || '',
        bookingPrice: parseFloat(record.bookingPrice || record.preco || 0),
        parkBrand: record.parkBrand || record.marca || '',
        driver: record.driver || record.condutor || '',
        campaign: record.campaign || record.campanha || '',
        checkIn: parseDate(record.checkIn),
        campaignPay: record.campaignPay === 'true' || record.campaignPay === true,
        hasOnlinePayment: record.hasOnlinePayment === 'true' || record.hasOnlinePayment === true
    };
}

// Processar registo de Caixa
function processCashRecord(record) {
    return {
        licensePlate: cleanLicensePlate(record.licensePlate || record.matricula || record.placa),
        driver: record.driver || record.condutor || record.condutorEntrega || '',
        paymentMethod: normalizePaymentMethod(record.paymentMethod || record.pagamento || ''),
        bookingPrice: parseFloat(record.bookingPrice || record.preco || 0),
        priceOnDelivery: parseFloat(record.priceOnDelivery || record.precoEntrega || record.bookingPrice || record.preco || 0),
        campaign: record.campaign || record.campanha || ''
    };
}

// Limpar matrícula
function cleanLicensePlate(plate) {
    if (!plate) return '';
    return plate.toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Normalizar método de pagamento
function normalizePaymentMethod(method) {
    if (!method) return '';
    
    const normalized = method.toString().toLowerCase().trim();
    
    if (normalized.includes('cash') || normalized.includes('dinheiro')) return 'cash';
    if (normalized.includes('card') || normalized.includes('cartão') || normalized.includes('cartao')) return 'card';
    if (normalized.includes('online') || normalized.includes('digital')) return 'online';
    if (normalized.includes('no pay') || normalized.includes('sem pagamento')) return 'no pay';
    
    return normalized;
}

// Converter data
function parseDate(dateValue) {
    if (!dateValue) return null;
    
    try {
        // Se for um número (Excel date)
        if (typeof dateValue === 'number') {
            return new Date((dateValue - 25569) * 86400 * 1000).toISOString();
        }
        
        // Se for string, tentar converter
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? null : date.toISOString();
    } catch {
        return null;
    }
}

// Fazer comparação entre Sales Orders e Entregas
async function performComparison() {
    try {
        // Buscar dados mais recentes da base de dados
        const salesOrders = await window.supabaseUtils.getSalesOrders(currentBatchId);
        const deliveries = await window.supabaseUtils.getDeliveries(currentBatchId);
        
        const comparisonResults = [];
        
        // Criar mapa de entregas por matrícula
        const deliveriesMap = new Map();
        deliveries.forEach(delivery => {
            deliveriesMap.set(delivery.license_plate.toLowerCase(), delivery);
        });
        
        // Comparar sales orders com entregas
        salesOrders.forEach(sale => {
            const delivery = deliveriesMap.get(sale.license_plate.toLowerCase());
            
            if (!delivery) {
                // Falta na entrega
                comparisonResults.push({
                    licensePlate: sale.license_plate,
                    status: 'missing_in_deliveries',
                    salesOrder: sale,
                    delivery: null,
                    inconsistencies: null
                });
            } else {
                // Existe em ambos - verificar inconsistências
                const inconsistencies = [];
                
                if (Math.abs(sale.booking_price - delivery.booking_price) > 0.01) {
                    inconsistencies.push({
                        field: 'booking_price',
                        salesValue: sale.booking_price,
                        deliveryValue: delivery.booking_price
                    });
                }
                
                if (sale.park_brand !== delivery.park_brand) {
                    inconsistencies.push({
                        field: 'park_brand',
                        salesValue: sale.park_brand,
                        deliveryValue: delivery.park_brand
                    });
                }
                
                comparisonResults.push({
                    licensePlate: sale.license_plate,
                    status: inconsistencies.length > 0 ? 'inconsistent' : 'valid',
                    salesOrder: sale,
                    delivery: delivery,
                    inconsistencies: inconsistencies.length > 0 ? inconsistencies : null
                });
                
                // Remover do mapa para depois identificar os que só existem nas entregas
                deliveriesMap.delete(sale.license_plate.toLowerCase());
            }
        });
        
        // Adicionar registos que só existem nas entregas
        deliveriesMap.forEach(delivery => {
            comparisonResults.push({
                licensePlate: delivery.license_plate,
                status: 'missing_in_sales',
                salesOrder: null,
                delivery: delivery,
                inconsistencies: null
            });
        });
        
        // Guardar resultados na base de dados
        await window.supabaseUtils.saveComparisonResults(comparisonResults, currentBatchId);
        
        // Atualizar interface
        displayComparisonResults(comparisonResults);
        
        console.log('Comparação concluída:', comparisonResults.length, 'registros comparados');
        
    } catch (error) {
        console.error('Erro na comparação:', error);
        throw new Error('Erro ao fazer comparação: ' + error.message);
    }
}

// Mostrar resultados da comparação na interface
function displayComparisonResults(results) {
    const tableBody = document.querySelector('#comparison-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    results.forEach(result => {
        const row = document.createElement('tr');
        
        const salesPrice = result.salesOrder ? result.salesOrder.booking_price : '-';
        const deliveryPrice = result.delivery ? result.delivery.booking_price : '-';
        const brand = result.salesOrder?.park_brand || result.delivery?.park_brand || '-';
        const alocation = result.delivery?.alocation || '-';
        
        let statusClass = '';
        let statusText = '';
        
        switch (result.status) {
            case 'valid':
                statusClass = 'status-success';
                statusText = 'Válido';
                break;
            case 'inconsistent':
                statusClass = 'status-error';
                statusText = 'Inconsistente';
                break;
            case 'missing_in_sales':
                statusClass = 'status-warning';
                statusText = 'Falta em Sales Orders';
                break;
            case 'missing_in_deliveries':
                statusClass = 'status-warning';
                statusText = 'Falta em Entregas';
                break;
        }
        
        row.innerHTML = `
            <td>${result.licensePlate}</td>
            <td>${alocation}</td>
            <td>${deliveryPrice}</td>
            <td>${salesPrice}</td>
            <td>${brand}</td>
            <td class="${statusClass}">${statusText}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="viewDetails('${result.licensePlate}')">
                    <i class="fas fa-eye"></i> Ver
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Atualizar resumo da comparação
function updateComparisonSummary() {
    // Esta função será chamada para atualizar os contadores
    // Implementar busca aos dados e atualizar os elementos HTML
}

// Processar ficheiro de caixa
async function processCashFile() {
    const caixaFile = document.getElementById('caixa-file')?.files[0];
    
    if (!caixaFile) {
        showError('Por favor, selecione o arquivo de caixa.');
        return;
    }
    
    try {
        showMessage('Processando arquivo de caixa...', 'info');
        
        cashRecordsData = await processExcelFile(caixaFile, 'cash_records');
        
        if (cashRecordsData.length > 0 && currentBatchId) {
            const cashResult = await window.supabaseUtils.importCashRecords(cashRecordsData, currentBatchId);
            showSuccess(`${cashResult.count} registros de caixa importados!`);
            
            // Ativar secção de seleção de condutor
            populateDriverSelection();
        }
        
    } catch (error) {
        console.error('Erro ao processar arquivo de caixa:', error);
        showError(`Erro ao processar arquivo de caixa: ${error.message}`);
    }
}

// Popular seleção de condutores
function populateDriverSelection() {
    const driverSelect = document.getElementById('driver-select');
    const driverSelection = document.getElementById('driver-selection');
    
    if (!driverSelect || !cashRecordsData) return;
    
    // Obter condutores únicos
    const drivers = [...new Set(cashRecordsData.map(record => record.driver).filter(Boolean))];
    
    driverSelect.innerHTML = '<option value="">Selecione um condutor</option>';
    drivers.forEach(driver => {
        const option = document.createElement('option');
        option.value = driver;
        option.textContent = driver;
        driverSelect.appendChild(option);
    });
    
    // Mostrar seleção de condutor
    driverSelection.classList.remove('hidden');
    
    // Configurar evento de mudança
    driverSelect.addEventListener('change', function() {
        if (this.value) {
            displayDriverDeliveries(this.value);
        }
    });
}

// Mostrar entregas do condutor
function displayDriverDeliveries(driver) {
    const driverDeliveries = document.getElementById('driver-deliveries');
    const deliveriesTable = document.querySelector('#deliveries-table tbody');
    
    if (!deliveriesTable) return;
    
    // Filtrar entregas do condutor
    const driverRecords = cashRecordsData.filter(record => record.driver === driver);
    
    deliveriesTable.innerHTML = '';
    
    driverRecords.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>-</td>
            <td>${record.licensePlate}</td>
            <td>-</td>
            <td>${record.paymentMethod}</td>
            <td>€${record.priceOnDelivery.toFixed(2)}</td>
            <td class="status-success">Válido</td>
            <td>
                <button class="btn btn-sm btn-primary">
                    <i class="fas fa-check"></i> Validar
                </button>
            </td>
        `;
        deliveriesTable.appendChild(row);
    });
    
    // Atualizar contador
    const deliveryCount = document.getElementById('delivery-count');
    if (deliveryCount) {
        deliveryCount.textContent = driverRecords.length;
    }
    
    // Mostrar tabela
    driverDeliveries.classList.remove('hidden');
}

// Ver detalhes de um registo
function viewDetails(licensePlate) {
    console.log('Ver detalhes de:', licensePlate);
    // Implementar modal com detalhes
}

// Expor funções globalmente
window.fileProcessor = {
    processFiles,
    processCashFile,
    viewDetails
};

console.log('File processor carregado com sucesso!');