// Comparador entre Sales Orders e Deliveries com integração Supabase
import { getComparisonResults, getSalesOrders, getDeliveries, saveComparisonResults } from './supabase.js';

document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface de comparação
    const salesCountElement = document.getElementById('sales-count');
    const deliveriesCountElement = document.getElementById('deliveries-count');
    const inconsistencyCountElement = document.getElementById('inconsistency-count');
    const missingCountElement = document.getElementById('missing-count');
    const comparisonTable = document.getElementById('comparison-table').querySelector('tbody');
    const validateComparisonBtn = document.getElementById('validate-comparison-btn');
    
    // Botões de filtro
    const showAllBtn = document.getElementById('show-all-btn');
    const showMissingBtn = document.getElementById('show-missing-btn');
    const showInconsistentBtn = document.getElementById('show-inconsistent-btn');
    
    // Variáveis para armazenar resultados da comparação
    let comparisonResults = {
        all: [],
        inconsistent: [],
        missing: [],
        valid: []
    };
    
    // Função para normalizar valores antes da comparação
    function normalizeValue(value) {
        if (value === null || value === undefined || value === 'N/A') {
            return '';
        }
        
        // Converter para string e remover formatação
        let normalized = String(value).trim();
        
        // Remover símbolo de euro e espaços
        normalized = normalized.replace(/€/g, '').trim();
        
        // Converter para número se possível
        if (!isNaN(normalized)) {
            return Number(normalized);
        }
        
        // Converter texto para minúsculas
        return normalized.toLowerCase();
    }
    
    // Função principal de comparação
    async function compareData(salesData, deliveriesData) {
        // Limpar resultados anteriores
        comparisonResults = {
            all: [],
            inconsistent: [],
            missing: [],
            valid: []
        };
        
        // Atualizar contadores
        salesCountElement.textContent = salesData.length;
        deliveriesCountElement.textContent = deliveriesData.length;
        
        // Criar mapa de registros do Sales Orders por matrícula (insensível a maiúsculas/minúsculas)
        const salesMap = new Map();
        salesData.forEach(record => {
            if (record.license_plate) {
                // Normalizar matrícula: remover espaços, traços, pontos e outros caracteres especiais
                const normalizedPlate = String(record.license_plate).replace(/[\s\-\.\,\/\\\(\)\[\]\{\}\+\*\?\^\$\|]/g, '').toLowerCase();
                salesMap.set(normalizedPlate, record);
            }
        });
        
        // Criar mapa de registros do Deliveries por matrícula (insensível a maiúsculas/minúsculas)
        const deliveriesMap = new Map();
        deliveriesData.forEach(record => {
            if (record.license_plate) {
                // Normalizar matrícula: remover espaços, traços, pontos e outros caracteres especiais
                const normalizedPlate = String(record.license_plate).replace(/[\s\-\.\,\/\\\(\)\[\]\{\}\+\*\?\^\$\|]/g, '').toLowerCase();
                deliveriesMap.set(normalizedPlate, record);
            }
        });
        
        // Verificar registros do Deliveries
        deliveriesData.forEach(deliveryRecord => {
            if (!deliveryRecord.license_plate) return;
            
            const licensePlate = deliveryRecord.license_plate;
            // Normalizar matrícula: remover espaços, traços, pontos e outros caracteres especiais
            const normalizedPlate = String(licensePlate).replace(/[\s\-\.\,\/\\\(\)\[\]\{\}\+\*\?\^\$\|]/g, '').toLowerCase();
            const salesRecord = salesMap.get(normalizedPlate);
            
            if (!salesRecord) {
                // Registro presente no Deliveries mas ausente no Sales Orders
                comparisonResults.missing.push({
                    source: 'deliveries',
                    licensePlate: licensePlate,
                    alocation: deliveryRecord.alocation || 'N/A',
                    bookingPriceDeliveries: deliveryRecord.booking_price || 0,
                    bookingPriceSales: 'N/A',
                    parkBrand: deliveryRecord.park_brand || 'N/A',
                    status: 'missing_in_sales',
                    deliveryRecord: deliveryRecord,
                    salesRecord: null,
                    resolution: null
                });
            } else {
                // Registro presente em ambos, verificar inconsistências
                const inconsistencies = [];
                
                // Verificar apenas preço de booking (conforme solicitado)
                if (normalizeValue(deliveryRecord.booking_price) !== normalizeValue(salesRecord.booking_price)) {
                    inconsistencies.push('bookingPrice');
                }
                
                if (inconsistencies.length > 0) {
                    // Registro com inconsistências
                    comparisonResults.inconsistent.push({
                        source: 'both',
                        licensePlate: licensePlate,
                        alocation: deliveryRecord.alocation || 'N/A',
                        bookingPriceDeliveries: deliveryRecord.booking_price || 0,
                        bookingPriceSales: salesRecord.booking_price || 0,
                        parkBrand: deliveryRecord.park_brand || 'N/A',
                        parkBrandSales: salesRecord.park_brand || 'N/A',
                        status: 'inconsistent',
                        inconsistencies: inconsistencies,
                        deliveryRecord: deliveryRecord,
                        salesRecord: salesRecord,
                        resolution: null
                    });
                } else {
                    // Registro sem inconsistências
                    comparisonResults.valid.push({
                        source: 'both',
                        licensePlate: licensePlate,
                        alocation: deliveryRecord.alocation || 'N/A',
                        bookingPriceDeliveries: deliveryRecord.booking_price || 0,
                        bookingPriceSales: salesRecord.booking_price || 0,
                        parkBrand: deliveryRecord.park_brand || 'N/A',
                        status: 'valid',
                        deliveryRecord: deliveryRecord,
                        salesRecord: salesRecord,
                        resolution: 'valid'
                    });
                }
            }
        });
        
        // Verificar registros do Sales Orders ausentes no Deliveries
        salesData.forEach(salesRecord => {
            if (!salesRecord.license_plate) return;
            
            const licensePlate = salesRecord.license_plate;
            // Normalizar matrícula: remover espaços, traços, pontos e outros caracteres especiais
            const normalizedPlate = String(licensePlate).replace(/[\s\-\.\,\/\\\(\)\[\]\{\}\+\*\?\^\$\|]/g, '').toLowerCase();
            const deliveryRecord = deliveriesMap.get(normalizedPlate);
            
            if (!deliveryRecord) {
                // Registro presente no Sales Orders mas ausente no Deliveries
                comparisonResults.missing.push({
                    source: 'sales',
                    licensePlate: licensePlate,
                    alocation: 'N/A',
                    bookingPriceDeliveries: 'N/A',
                    bookingPriceSales: salesRecord.booking_price || 0,
                    parkBrand: salesRecord.park_brand || 'N/A',
                    status: 'missing_in_deliveries',
                    deliveryRecord: null,
                    salesRecord: salesRecord,
                    resolution: null
                });
            }
        });
        
        // Combinar todos os resultados
        comparisonResults.all = [
            ...comparisonResults.valid,
            ...comparisonResults.inconsistent,
            ...comparisonResults.missing
        ];
        
        // Atualizar contadores
        inconsistencyCountElement.textContent = comparisonResults.inconsistent.length;
        missingCountElement.textContent = comparisonResults.missing.length;
        
        // Renderizar tabela com todos os registros
        renderComparisonTable(comparisonResults.all);
        
        // Habilitar botão de validação se não houver problemas ou se todos os problemas tiverem resolução
        updateValidateButton();
        
        // Salvar resultados no Supabase
        const batchId = window.fileProcessor.getCurrentBatchId();
        if (batchId) {
            try {
                await saveComparisonResults(comparisonResults.all, batchId);
                console.log('Resultados da comparação salvos no Supabase');
            } catch (error) {
                console.error('Erro ao salvar resultados da comparação:', error);
            }
        }
        
        return comparisonResults;
    }
    
    // Função para renderizar a tabela de comparação
    function renderComparisonTable(records) {
        // Limpar tabela
        comparisonTable.innerHTML = '';
        
        if (records.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" class="text-center">Nenhum registro encontrado.</td>';
            comparisonTable.appendChild(row);
            return;
        }
        
        // Adicionar cada registro à tabela
        records.forEach(record => {
            const row = document.createElement('tr');
            
            // Adicionar classe de status
            if (record.status === 'inconsistent') {
                row.classList.add('status-error');
            } else if (record.status.includes('missing')) {
                row.classList.add('status-warning');
            } else if (record.status === 'valid') {
                row.classList.add('status-success');
            }
            
            // Criar células
            row.innerHTML = `
                <td>${record.licensePlate}</td>
                <td>${record.alocation}</td>
                <td>${record.bookingPriceDeliveries} €</td>
                <td>${record.bookingPriceSales} €</td>
                <td>${record.parkBrand}</td>
                <td>${getStatusText(record.status)}</td>
                <td>
                    <button class="btn btn-secondary btn-sm view-details" data-license="${record.licensePlate}">Detalhes</button>
                    ${record.status !== 'valid' ? `<button class="btn btn-primary btn-sm resolve-issue" data-license="${record.licensePlate}">Resolver</button>` : ''}
                </td>
            `;
            
            comparisonTable.appendChild(row);
        });
        
        // Adicionar eventos aos botões
        addTableButtonEvents();
    }
    
    // Função para adicionar eventos aos botões da tabela
    function addTableButtonEvents() {
        // Botões de detalhes
        document.querySelectorAll('.view-details').forEach(button => {
            button.addEventListener('click', function() {
                const licensePlate = this.getAttribute('data-license');
                showDetailsModal(licensePlate);
            });
        });
        
        // Botões de resolução
        document.querySelectorAll('.resolve-issue').forEach(button => {
            button.addEventListener('click', function() {
                const licensePlate = this.getAttribute('data-license');
                showResolveModal(licensePlate);
            });
        });
    }
    
    // Função para mostrar modal de detalhes
    function showDetailsModal(licensePlate) {
        const record = comparisonResults.all.find(r => r.licensePlate.toString().toLowerCase() === licensePlate.toString().toLowerCase());
        if (!record) return;
        
        const modalBody = document.getElementById('details-modal-body');
        modalBody.innerHTML = '';
        
        // Criar conteúdo do modal
        const content = document.createElement('div');
        
        // Informações gerais
        content.innerHTML = `
            <h4>Matrícula: ${record.licensePlate}</h4>
            <p>Status: ${getStatusText(record.status)}</p>
            ${record.resolution ? `<p>Resolução: ${record.resolution}</p>` : ''}
        `;
        
        // Detalhes do Deliveries
        if (record.deliveryRecord) {
            const deliveryDetails = document.createElement('div');
            deliveryDetails.innerHTML = `
                <h4 class="mt-20">Detalhes do Deliveries</h4>
                <table class="table">
                    <tr><th>Alocação</th><td>${record.deliveryRecord.alocation || 'N/A'}</td></tr>
                    <tr><th>Preço Booking</th><td>${record.deliveryRecord.booking_price || 'N/A'} €</td></tr>
                    <tr><th>Marca</th><td>${record.deliveryRecord.park_brand || 'N/A'}</td></tr>
                    <tr><th>Campanha</th><td>${record.deliveryRecord.campaign || 'N/A'}</td></tr>
                    <tr><th>Check-In</th><td>${record.deliveryRecord.check_in || 'N/A'}</td></tr>
                </table>
            `;
            content.appendChild(deliveryDetails);
        }
        
        // Detalhes do Sales Orders
        if (record.salesRecord) {
            const salesDetails = document.createElement('div');
            salesDetails.innerHTML = `
                <h4 class="mt-20">Detalhes do Sales Orders</h4>
                <table class="table">
                    <tr><th>ID</th><td>${record.salesRecord.id || 'N/A'}</td></tr>
                    <tr><th>Preço Booking</th><td>${record.salesRecord.booking_price || 'N/A'} €</td></tr>
                    <tr><th>Preço na Entrega</th><td>${record.salesRecord.price_on_delivery || 'N/A'} €</td></tr>
                    <tr><th>Marca</th><td>${record.salesRecord.park_brand || 'N/A'}</td></tr>
                    <tr><th>Check-In</th><td>${record.salesRecord.check_in || 'N/A'}</td></tr>
                    <tr><th>Check-Out</th><td>${record.salesRecord.check_out || 'N/A'}</td></tr>
                </table>
            `;
            content.appendChild(salesDetails);
        }
        
        // Inconsistências
        if (record.inconsistencies && record.inconsistencies.length > 0) {
            const inconsistenciesDiv = document.createElement('div');
            inconsistenciesDiv.innerHTML = `
                <h4 class="mt-20">Inconsistências</h4>
                <ul>
                    ${record.inconsistencies.map(inc => {
                        if (inc === 'bookingPrice') {
                            return `<li>Preço de Booking: ${record.bookingPriceDeliveries} € (Deliveries) vs ${record.bookingPriceSales} € (Sales)</li>`;
                        } else if (inc === 'parkBrand') {
                            return `<li>Marca: ${record.parkBrand} (Deliveries) vs ${record.parkBrandSales} (Sales)</li>`;
                        } else {
                            return `<li>${inc}</li>`;
                        }
                    }).join('')}
                </ul>
            `;
            content.appendChild(inconsistenciesDiv);
        }
        
        modalBody.appendChild(content);
        
        // Mostrar modal
        document.getElementById('details-modal-overlay').style.display = 'flex';
    }
    
    // Função para mostrar modal de resolução
    function showResolveModal(licensePlate) {
        const record = comparisonResults.all.find(r => r.licensePlate.toString().toLowerCase() === licensePlate.toString().toLowerCase());
        if (!record) return;
        
        const modalBody = document.getElementById('edit-modal-body');
        modalBody.innerHTML = '';
        
        // Criar formulário de resolução
        const form = document.createElement('form');
        form.id = 'resolve-form';
        
        // Adicionar campos conforme o tipo de problema
        if (record.status === 'inconsistent') {
            // Formulário para inconsistências
            form.innerHTML = `
                <p>Resolva as inconsistências para o registro com matrícula <strong>${record.licensePlate}</strong>:</p>
                
                <div class="form-group">
                    <label class="form-label">Escolha a fonte de dados preferida:</label>
                    <div>
                        <input type="radio" id="prefer-deliveries" name="data-source" value="deliveries" checked>
                        <label for="prefer-deliveries">Usar dados do Deliveries</label>
                    </div>
                    <div>
                        <input type="radio" id="prefer-sales" name="data-source" value="sales">
                        <label for="prefer-sales">Usar dados do Sales Orders</label>
                    </div>
                    <div>
                        <input type="radio" id="prefer-manual" name="data-source" value="manual">
                        <label for="prefer-manual">Inserir manualmente</label>
                    </div>
                </div>
                
                <div id="manual-fields" class="hidden">
                    ${record.inconsistencies.includes('bookingPrice') ? `
                        <div class="form-group">
                            <label for="manual-booking-price" class="form-label">Preço de Booking:</label>
                            <input type="number" id="manual-booking-price" class="form-control" value="${record.bookingPriceDeliveries}" step="0.01">
                        </div>
                    ` : ''}
                </div>
                
                <div class="form-group">
                    <label for="resolution-notes" class="form-label">Notas de resolução:</label>
                    <textarea id="resolution-notes" class="form-control" rows="3"></textarea>
                </div>
            `;
        } else if (record.status.includes('missing')) {
            // Formulário para registros ausentes
            form.innerHTML = `
                <p>Resolva o problema para o registro com matrícula <strong>${record.licensePlate}</strong> que está ${record.status === 'missing_in_sales' ? 'ausente no Sales Orders' : 'ausente no Deliveries'}:</p>
                
                <div class="form-group">
                    <label class="form-label">Escolha a ação:</label>
                    <div>
                        <input type="radio" id="action-ignore" name="missing-action" value="ignore" checked>
                        <label for="action-ignore">Ignorar (manter como está)</label>
                    </div>
                    <div>
                        <input type="radio" id="action-create" name="missing-action" value="create">
                        <label for="action-create">Criar registro correspondente</label>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="resolution-notes" class="form-label">Notas de resolução:</label>
                    <textarea id="resolution-notes" class="form-control" rows="3"></textarea>
                </div>
            `;
        }
        
        // Adicionar botões
        form.innerHTML += `
            <div class="form-actions">
                <button type="button" id="cancel-resolve" class="btn btn-secondary">Cancelar</button>
                <button type="button" id="submit-resolve" class="btn btn-primary">Salvar</button>
            </div>
        `;
        
        modalBody.appendChild(form);
        
        // Mostrar modal
        document.getElementById('edit-modal-overlay').style.display = 'flex';
        
        // Adicionar eventos aos botões
        document.getElementById('cancel-resolve').addEventListener('click', function() {
            document.getElementById('edit-modal-overlay').style.display = 'none';
        });
        
        // Mostrar/esconder campos manuais
        if (record.status === 'inconsistent') {
            document.querySelectorAll('input[name="data-source"]').forEach(radio => {
                radio.addEventListener('change', function() {
                    const manualFields = document.getElementById('manual-fields');
                    if (this.value === 'manual') {
                        manualFields.classList.remove('hidden');
                    } else {
                        manualFields.classList.add('hidden');
                    }
                });
            });
        }
        
        // Evento de submissão
        document.getElementById('submit-resolve').addEventListener('click', function() {
            resolveIssue(record);
        });
    }
    
    // Função para resolver problemas
    async function resolveIssue(record) {
        try {
            if (record.status === 'inconsistent') {
                const dataSource = document.querySelector('input[name="data-source"]:checked').value;
                const notes = document.getElementById('resolution-notes').value;
                
                if (dataSource === 'deliveries') {
                    // Usar dados do Deliveries
                    record.resolution = 'use_deliveries';
                    record.resolutionNotes = notes;
                    
                    // Atualizar valores
                    if (record.inconsistencies.includes('bookingPrice')) {
                        record.bookingPriceSales = record.bookingPriceDeliveries;
                    }
                } else if (dataSource === 'sales') {
                    // Usar dados do Sales Orders
                    record.resolution = 'use_sales';
                    record.resolutionNotes = notes;
                    
                    // Atualizar valores
                    if (record.inconsistencies.includes('bookingPrice')) {
                        record.bookingPriceDeliveries = record.bookingPriceSales;
                    }
                } else if (dataSource === 'manual') {
                    // Usar dados manuais
                    record.resolution = 'manual';
                    record.resolutionNotes = notes;
                    
                    // Atualizar valores
                    if (record.inconsistencies.includes('bookingPrice')) {
                        const manualPrice = parseFloat(document.getElementById('manual-booking-price').value);
                        record.bookingPriceDeliveries = manualPrice;
                        record.bookingPriceSales = manualPrice;
                    }
                }
                
                // Remover das listas de problemas
                const index = comparisonResults.inconsistent.findIndex(r => r.licensePlate === record.licensePlate);
                if (index !== -1) {
                    comparisonResults.inconsistent.splice(index, 1);
                }
                
                // Adicionar à lista de válidos
                record.status = 'resolved';
                comparisonResults.valid.push(record);
            } else if (record.status.includes('missing')) {
                const action = document.querySelector('input[name="missing-action"]:checked').value;
                const notes = document.getElementById('resolution-notes').value;
                
                if (action === 'ignore') {
                    // Ignorar o problema
                    record.resolution = 'ignore';
                    record.resolutionNotes = notes;
                } else if (action === 'create') {
                    // Criar registro correspondente (na prática, apenas marcar como resolvido)
                    record.resolution = 'create';
                    record.resolutionNotes = notes;
                }
                
                // Remover das listas de problemas
                const index = comparisonResults.missing.findIndex(r => r.licensePlate === record.licensePlate);
                if (index !== -1) {
                    comparisonResults.missing.splice(index, 1);
                }
                
                // Adicionar à lista de válidos se for para criar
                if (action === 'create') {
                    record.status = 'resolved';
                    comparisonResults.valid.push(record);
                }
            }
            
            // Atualizar contadores
            inconsistencyCountElement.textContent = comparisonResults.inconsistent.length;
            missingCountElement.textContent = comparisonResults.missing.length;
            
            // Renderizar tabela novamente
            const currentFilter = document.querySelector('.filter-btn.active').getAttribute('data-filter');
            if (currentFilter === 'all') {
                renderComparisonTable(comparisonResults.all);
            } else if (currentFilter === 'missing') {
                renderComparisonTable(comparisonResults.missing);
            } else if (currentFilter === 'inconsistent') {
                renderComparisonTable(comparisonResults.inconsistent);
            }
            
            // Atualizar botão de validação
            updateValidateButton();
            
            // Fechar modal
            document.getElementById('edit-modal-overlay').style.display = 'none';
            
            // Salvar resultados atualizados no Supabase
            const batchId = window.fileProcessor.getCurrentBatchId();
            if (batchId) {
                try {
                    await saveComparisonResults(comparisonResults.all, batchId);
                    console.log('Resultados da comparação atualizados no Supabase');
                } catch (error) {
                    console.error('Erro ao atualizar resultados da comparação:', error);
                }
            }
        } catch (error) {
            console.error('Erro ao resolver problema:', error);
            alert('Erro ao resolver problema. Verifique o console para mais detalhes.');
        }
    }
    
    // Função para atualizar o botão de validação
    function updateValidateButton() {
        const hasUnresolvedIssues = comparisonResults.inconsistent.length > 0 || 
                                   comparisonResults.missing.some(r => !r.resolution);
        
        validateComparisonBtn.disabled = hasUnresolvedIssues;
    }
    
    // Função para obter texto de status
    function getStatusText(status) {
        switch (status) {
            case 'valid':
                return 'Válido';
            case 'inconsistent':
                return 'Inconsistente';
            case 'missing_in_sales':
                return 'Ausente no Sales Orders';
            case 'missing_in_deliveries':
                return 'Ausente no Deliveries';
            case 'resolved':
                return 'Resolvido';
            default:
                return status;
        }
    }
    
    // Eventos de filtro
    showAllBtn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        renderComparisonTable(comparisonResults.all);
    });
    
    showMissingBtn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        renderComparisonTable(comparisonResults.missing);
    });
    
    showInconsistentBtn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        renderComparisonTable(comparisonResults.inconsistent);
    });
    
    // Evento de validação
    validateComparisonBtn.addEventListener('click', function() {
        // Navegar para a aba de validação de caixa
        document.querySelector('.nav-tab[data-tab="validate"]').click();
    });
    
    // Eventos de fechamento de modais
    document.querySelectorAll('.modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal-overlay').style.display = 'none';
        });
    });
    
    // Inicializar comparação com dados do Supabase quando o botão de processamento for clicado
    document.getElementById('process-files-btn').addEventListener('click', async function() {
        try {
            const batchId = window.fileProcessor.getCurrentBatchId();
            if (!batchId) {
                console.error('Nenhum lote de importação disponível');
                return;
            }
            
            // Obter dados do Supabase
            const salesData = await getSalesOrders(batchId);
            const deliveriesData = await getDeliveries(batchId);
            
            if (salesData.length === 0 || deliveriesData.length === 0) {
                alert('Não há dados suficientes para comparação. Verifique se os arquivos foram importados corretamente.');
                return;
            }
            
            // Realizar comparação
            await compareData(salesData, deliveriesData);
            
            // Navegar para a aba de comparação
            document.querySelector('.nav-tab[data-tab="compare"]').click();
        } catch (error) {
            console.error('Erro ao iniciar comparação:', error);
            alert('Erro ao iniciar comparação. Verifique o console para mais detalhes.');
        }
    });
    
    // Expor funções e variáveis para uso externo
    window.comparator = {
        compareData: compareData,
        getResults: () => comparisonResults
    };
});
