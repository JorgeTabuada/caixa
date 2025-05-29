// Comparador entre Odoo e Back Office - Versão corrigida
document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface de comparação
    const odooCountElement = document.getElementById('odoo-count');
    const backofficeCountElement = document.getElementById('backoffice-count');
    const inconsistencyCountElement = document.getElementById('inconsistency-count');
    const missingCountElement = document.getElementById('missing-count');
    const comparisonTable = document.getElementById('comparison-table');
    const comparisonTableBody = comparisonTable ? comparisonTable.querySelector('tbody') : null;
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
        if (!isNaN(normalized) && normalized !== '') {
            return Number(normalized);
        }
        
        // Converter texto para minúsculas
        return normalized.toLowerCase();
    }
    
    // Função para normalizar matrícula
    function normalizeLicensePlate(plate) {
        if (!plate) return '';
        return String(plate).replace(/[\s\-\.\,\/\\\(\)\[\]\{\}\+\*\?\^\$\|]/g, '').toLowerCase();
    }
    
    // Função principal de comparação
    window.compareOdooBackOffice = function(odooData, backOfficeData) {
        console.log('Iniciando comparação:', { odoo: odooData.length, backoffice: backOfficeData.length });
        
        // Limpar resultados anteriores
        comparisonResults = {
            all: [],
            inconsistent: [],
            missing: [],
            valid: []
        };
        
        // Atualizar contadores
        if (odooCountElement) odooCountElement.textContent = odooData.length;
        if (backofficeCountElement) backofficeCountElement.textContent = backOfficeData.length;
        
        // Criar mapa de registros do Odoo por matrícula
        const odooMap = new Map();
        odooData.forEach(record => {
            const plate = record.licensePlate || record['License Plate'] || record['Matrícula'];
            if (plate) {
                const normalizedPlate = normalizeLicensePlate(plate);
                odooMap.set(normalizedPlate, {
                    ...record,
                    licensePlate: plate,
                    bookingPrice: record.bookingPrice || record['Booking Price'] || record['Preço Booking'] || 0,
                    parkBrand: record.parkBrand || record['Park Brand'] || record['Marca'] || 'N/A'
                });
            }
        });
        
        // Criar mapa de registros do Back Office por matrícula
        const backOfficeMap = new Map();
        backOfficeData.forEach(record => {
            const plate = record.licensePlate || record['License Plate'] || record['Matrícula'];
            if (plate) {
                const normalizedPlate = normalizeLicensePlate(plate);
                backOfficeMap.set(normalizedPlate, {
                    ...record,
                    licensePlate: plate,
                    alocation: record.alocation || record['Alocation'] || record['Alocação'] || 'N/A',
                    bookingPrice: record.bookingPrice || record['Booking Price'] || record['Preço Booking'] || 0,
                    parkBrand: record.parkBrand || record['Park Brand'] || record['Marca'] || 'N/A'
                });
            }
        });
        
        // Verificar registros do Back Office
        backOfficeData.forEach(boRecord => {
            const plate = boRecord.licensePlate || boRecord['License Plate'] || boRecord['Matrícula'];
            if (!plate) return;
            
            const normalizedPlate = normalizeLicensePlate(plate);
            const odooRecord = odooMap.get(normalizedPlate);
            
            if (!odooRecord) {
                // Registro presente no Back Office mas ausente no Odoo
                comparisonResults.missing.push({
                    source: 'backoffice',
                    licensePlate: plate,
                    alocation: boRecord.alocation || boRecord['Alocation'] || boRecord['Alocação'] || 'N/A',
                    bookingPriceBO: boRecord.bookingPrice || boRecord['Booking Price'] || boRecord['Preço Booking'] || 0,
                    bookingPriceOdoo: 'N/A',
                    parkBrand: boRecord.parkBrand || boRecord['Park Brand'] || boRecord['Marca'] || 'N/A',
                    status: 'missing_in_odoo',
                    boRecord: boRecord,
                    odooRecord: null,
                    resolution: null
                });
            } else {
                // Registro presente em ambos, verificar inconsistências
                const inconsistencies = [];
                
                // Verificar preço de booking
                const boPriceNorm = normalizeValue(boRecord.bookingPrice || boRecord['Booking Price'] || boRecord['Preço Booking']);
                const odooPriceNorm = normalizeValue(odooRecord.bookingPrice || odooRecord['Booking Price'] || odooRecord['Preço Booking']);
                
                if (boPriceNorm !== odooPriceNorm) {
                    inconsistencies.push('bookingPrice');
                }
                
                if (inconsistencies.length > 0) {
                    // Registro com inconsistências
                    comparisonResults.inconsistent.push({
                        source: 'both',
                        licensePlate: plate,
                        alocation: boRecord.alocation || boRecord['Alocation'] || boRecord['Alocação'] || 'N/A',
                        bookingPriceBO: boRecord.bookingPrice || boRecord['Booking Price'] || boRecord['Preço Booking'] || 0,
                        bookingPriceOdoo: odooRecord.bookingPrice || odooRecord['Booking Price'] || odooRecord['Preço Booking'] || 0,
                        parkBrand: boRecord.parkBrand || boRecord['Park Brand'] || boRecord['Marca'] || 'N/A',
                        parkBrandOdoo: odooRecord.parkBrand || odooRecord['Park Brand'] || odooRecord['Marca'] || 'N/A',
                        status: 'inconsistent',
                        inconsistencies: inconsistencies,
                        boRecord: boRecord,
                        odooRecord: odooRecord,
                        resolution: null
                    });
                } else {
                    // Registro sem inconsistências
                    comparisonResults.valid.push({
                        source: 'both',
                        licensePlate: plate,
                        alocation: boRecord.alocation || boRecord['Alocation'] || boRecord['Alocação'] || 'N/A',
                        bookingPriceBO: boRecord.bookingPrice || boRecord['Booking Price'] || boRecord['Preço Booking'] || 0,
                        bookingPriceOdoo: odooRecord.bookingPrice || odooRecord['Booking Price'] || odooRecord['Preço Booking'] || 0,
                        parkBrand: boRecord.parkBrand || boRecord['Park Brand'] || boRecord['Marca'] || 'N/A',
                        status: 'valid',
                        boRecord: boRecord,
                        odooRecord: odooRecord,
                        resolution: 'valid'
                    });
                }
            }
        });
        
        // Verificar registros do Odoo ausentes no Back Office
        odooData.forEach(odooRecord => {
            const plate = odooRecord.licensePlate || odooRecord['License Plate'] || odooRecord['Matrícula'];
            if (!plate) return;
            
            const normalizedPlate = normalizeLicensePlate(plate);
            const boRecord = backOfficeMap.get(normalizedPlate);
            
            if (!boRecord) {
                // Registro presente no Odoo mas ausente no Back Office
                comparisonResults.missing.push({
                    source: 'odoo',
                    licensePlate: plate,
                    alocation: 'N/A',
                    bookingPriceBO: 'N/A',
                    bookingPriceOdoo: odooRecord.bookingPrice || odooRecord['Booking Price'] || odooRecord['Preço Booking'] || 0,
                    parkBrand: odooRecord.parkBrand || odooRecord['Park Brand'] || odooRecord['Marca'] || 'N/A',
                    status: 'missing_in_backoffice',
                    boRecord: null,
                    odooRecord: odooRecord,
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
        if (inconsistencyCountElement) inconsistencyCountElement.textContent = comparisonResults.inconsistent.length;
        if (missingCountElement) missingCountElement.textContent = comparisonResults.missing.length;
        
        // Renderizar tabela com todos os registros
        renderComparisonTable(comparisonResults.all);
        
        // Habilitar botão de validação
        updateValidateButton();
        
        // Salvar resultados no Supabase se disponível
        saveResultsToSupabase();
        
        console.log('Comparação concluída:', {
            total: comparisonResults.all.length,
            valid: comparisonResults.valid.length,
            inconsistent: comparisonResults.inconsistent.length,
            missing: comparisonResults.missing.length
        });
    };
    
    // Função para renderizar a tabela de comparação
    function renderComparisonTable(records) {
        if (!comparisonTableBody) {
            console.error('Tabela de comparação não encontrada');
            return;
        }
        
        // Limpar tabela
        comparisonTableBody.innerHTML = '';
        
        if (records.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" class="text-center">Nenhum registro encontrado.</td>';
            comparisonTableBody.appendChild(row);
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
                <td>${formatPrice(record.bookingPriceBO)}</td>
                <td>${formatPrice(record.bookingPriceOdoo)}</td>
                <td>${record.parkBrand}</td>
                <td>${getStatusText(record.status)}</td>
                <td>
                    <button class="btn btn-secondary btn-sm view-details" data-license="${record.licensePlate}" style="margin-right: 5px;">Detalhes</button>
                    ${record.status !== 'valid' ? `<button class="btn btn-primary btn-sm resolve-issue" data-license="${record.licensePlate}">Resolver</button>` : ''}
                </td>
            `;
            
            comparisonTableBody.appendChild(row);
        });
        
        // Adicionar eventos aos botões
        addTableButtonEvents();
    }
    
    // Função para formatar preços
    function formatPrice(price) {
        if (price === 'N/A' || price === null || price === undefined) {
            return 'N/A';
        }
        
        const numPrice = parseFloat(price);
        if (isNaN(numPrice)) {
            return 'N/A';
        }
        
        return numPrice.toFixed(2) + ' €';
    }
    
    // Função para obter texto de status
    function getStatusText(status) {
        switch (status) {
            case 'valid':
                return '<span class="status-success">Válido</span>';
            case 'inconsistent':
                return '<span class="status-error">Inconsistente</span>';
            case 'missing_in_odoo':
                return '<span class="status-warning">Ausente no Odoo</span>';
            case 'missing_in_backoffice':
                return '<span class="status-warning">Ausente no Back Office</span>';
            default:
                return status;
        }
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
        const record = comparisonResults.all.find(r => 
            normalizeLicensePlate(r.licensePlate) === normalizeLicensePlate(licensePlate)
        );
        
        if (!record) {
            console.error('Registro não encontrado:', licensePlate);
            return;
        }
        
        const modalBody = document.getElementById('details-modal-body');
        if (!modalBody) {
            console.error('Modal de detalhes não encontrado');
            return;
        }
        
        modalBody.innerHTML = '';
        
        // Criar conteúdo do modal
        const content = document.createElement('div');
        
        // Informações gerais
        content.innerHTML = `
            <h4>Matrícula: ${record.licensePlate}</h4>
            <p><strong>Status:</strong> ${getStatusText(record.status)}</p>
            ${record.resolution ? `<p><strong>Resolução:</strong> ${record.resolution}</p>` : ''}
        `;
        
        // Detalhes do Back Office
        if (record.boRecord) {
            const boDetails = document.createElement('div');
            boDetails.innerHTML = `
                <h4 style="margin-top: 20px;">Detalhes do Back Office</h4>
                <table class="table" style="margin-top: 10px;">
                    <tr><th>Alocação</th><td>${record.boRecord.alocation || record.boRecord['Alocação'] || 'N/A'}</td></tr>
                    <tr><th>Preço Booking</th><td>${formatPrice(record.boRecord.bookingPrice || record.boRecord['Preço Booking'])}</td></tr>
                    <tr><th>Marca</th><td>${record.boRecord.parkBrand || record.boRecord['Marca'] || 'N/A'}</td></tr>
                    <tr><th>Campanha</th><td>${record.boRecord.campaign || record.boRecord['Campanha'] || 'N/A'}</td></tr>
                </table>
            `;
            content.appendChild(boDetails);
        }
        
        // Detalhes do Odoo
        if (record.odooRecord) {
            const odooDetails = document.createElement('div');
            odooDetails.innerHTML = `
                <h4 style="margin-top: 20px;">Detalhes do Odoo</h4>
                <table class="table" style="margin-top: 10px;">
                    <tr><th>Preço Booking</th><td>${formatPrice(record.odooRecord.bookingPrice || record.odooRecord['Preço Booking'])}</td></tr>
                    <tr><th>Marca</th><td>${record.odooRecord.parkBrand || record.odooRecord['Marca'] || 'N/A'}</td></tr>
                    <tr><th>Campanha</th><td>${record.odooRecord.campaign || record.odooRecord['Campanha'] || 'N/A'}</td></tr>
                </table>
            `;
            content.appendChild(odooDetails);
        }
        
        // Adicionar conteúdo ao modal
        modalBody.appendChild(content);
        
        // Mostrar modal
        const modalOverlay = document.getElementById('details-modal-overlay');
        if (modalOverlay) {
            modalOverlay.style.display = 'flex';
            
            // Configurar botão de fechar
            const closeBtn = modalOverlay.querySelector('.close-modal');
            if (closeBtn) {
                closeBtn.onclick = function() {
                    modalOverlay.style.display = 'none';
                };
            }
            
            // Fechar ao clicar fora do modal
            modalOverlay.onclick = function(e) {
                if (e.target === modalOverlay) {
                    modalOverlay.style.display = 'none';
                }
            };
            
            // Fechar com ESC
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && modalOverlay.style.display === 'flex') {
                    modalOverlay.style.display = 'none';
                }
            });
        }
    }
    
    // Função para mostrar modal de resolução
    function showResolveModal(licensePlate) {
        const record = comparisonResults.all.find(r => 
            normalizeLicensePlate(r.licensePlate) === normalizeLicensePlate(licensePlate)
        );
        
        if (!record) {
            console.error('Registro não encontrado:', licensePlate);
            return;
        }
        
        const modalBody = document.getElementById('edit-modal-body');
        if (!modalBody) {
            console.error('Modal de edição não encontrado');
            return;
        }
        
        modalBody.innerHTML = '';
        
        // Criar formulário de resolução
        const form = document.createElement('form');
        form.id = 'resolve-form';
        
        // Título e informações gerais
        form.innerHTML = `
            <h4>Resolver Problema - Matrícula: ${record.licensePlate}</h4>
            <p><strong>Status:</strong> ${getStatusText(record.status)}</p>
        `;
        
        // Campos específicos para inconsistências
        if (record.status === 'inconsistent') {
            form.innerHTML += `
                <div class="form-group">
                    <label><strong>Escolha a fonte de dados correta:</strong></label>
                    <div class="radio-group">
                        <div class="radio-option">
                            <input type="radio" name="data-source" id="backoffice-data" value="backoffice" checked>
                            <label for="backoffice-data">
                                Usar dados do Back Office (${formatPrice(record.bookingPriceBO)})
                            </label>
                        </div>
                        <div class="radio-option">
                            <input type="radio" name="data-source" id="odoo-data" value="odoo">
                            <label for="odoo-data">
                                Usar dados do Odoo (${formatPrice(record.bookingPriceOdoo)})
                            </label>
                        </div>
                        <div class="radio-option">
                            <input type="radio" name="data-source" id="manual-correction" value="manual">
                            <label for="manual-correction">
                                Correção manual
                            </label>
                        </div>
                    </div>
                </div>
                
                <div id="manual-fields" class="form-group hidden">
                    <label for="manual-booking-price">Preço de Booking:</label>
                    <input type="number" id="manual-booking-price" class="form-control" step="0.01" min="0">
                </div>
            `;
        }
        
        // Campos específicos para registros ausentes
        if (record.status.includes('missing')) {
            form.innerHTML += `
                <div class="form-group">
                    <label><strong>Ação para registro ausente:</strong></label>
                    <div class="radio-group">
                        <div class="radio-option">
                            <input type="radio" name="missing-action" id="ignore-missing" value="ignore" checked>
                            <label for="ignore-missing">
                                Ignorar inconsistência
                            </label>
                        </div>
                        <div class="radio-option">
                            <input type="radio" name="missing-action" id="investigate-missing" value="investigate">
                            <label for="investigate-missing">
                                Marcar para investigação
                            </label>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Campo de notas
        form.innerHTML += `
            <div class="form-group">
                <label for="resolution-notes">Notas de resolução:</label>
                <textarea id="resolution-notes" class="form-control" rows="3"></textarea>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Aplicar Resolução</button>
                <button type="button" class="btn btn-secondary close-modal">Cancelar</button>
            </div>
        `;
        
        // Adicionar formulário ao modal
        modalBody.appendChild(form);
        
        // Configurar eventos do formulário
        setupResolveFormEvents(form, record);
        
        // Mostrar modal
        const modalOverlay = document.getElementById('edit-modal-overlay');
        if (modalOverlay) {
            modalOverlay.style.display = 'flex';
            
            // Configurar botão de fechar
            const closeBtn = modalOverlay.querySelector('.close-modal');
            if (closeBtn) {
                closeBtn.onclick = function() {
                    modalOverlay.style.display = 'none';
                };
            }
            
            // Fechar ao clicar fora do modal
            modalOverlay.onclick = function(e) {
                if (e.target === modalOverlay) {
                    modalOverlay.style.display = 'none';
                }
            };
            
            // Fechar com ESC
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && modalOverlay.style.display === 'flex') {
                    modalOverlay.style.display = 'none';
                }
            });
        }
    }
    
    // Função para atualizar o botão de validação
    function updateValidateButton() {
        if (validateComparisonBtn) {
            const unresolved = comparisonResults.inconsistent.filter(r => !r.resolution).length + 
                              comparisonResults.missing.filter(r => !r.resolution).length;
            
            validateComparisonBtn.disabled = unresolved > 0;
            
            if (unresolved > 0) {
                validateComparisonBtn.textContent = `Validar (${unresolved} problemas não resolvidos)`;
            } else {
                validateComparisonBtn.textContent = 'Validar';
            }
        }
    }
    
    // Função para salvar resultados no Supabase
    async function saveResultsToSupabase() {
        if (window.supabaseUtils && window.fileProcessor) {
            try {
                const batchId = window.fileProcessor.getCurrentBatchId();
                if (batchId) {
                    const result = await window.supabaseUtils.saveComparisonResults(comparisonResults.all, batchId);
                    console.log(`${result.count} resultados de comparação salvos no Supabase`);
                }
            } catch (error) {
                console.error('Erro ao salvar resultados no Supabase:', error);
            }
        }
    }
    
    // Configurar eventos de filtro
    if (showAllBtn) {
        showAllBtn.addEventListener('click', function() {
            renderComparisonTable(comparisonResults.all);
        });
    }
    
    if (showMissingBtn) {
        showMissingBtn.addEventListener('click', function() {
            renderComparisonTable(comparisonResults.missing);
        });
    }
    
    if (showInconsistentBtn) {
        showInconsistentBtn.addEventListener('click', function() {
            renderComparisonTable(comparisonResults.inconsistent);
        });
    }
    
    // Função para configurar eventos do formulário de resolução
    function setupResolveFormEvents(form, record) {
        // Evento para mostrar/ocultar campos manuais
        const manualRadio = form.querySelector('#manual-correction');
        const manualFields = form.querySelector('#manual-fields');
        
        if (manualRadio && manualFields) {
            form.addEventListener('change', function(e) {
                if (e.target.name === 'data-source') {
                    if (e.target.value === 'manual') {
                        manualFields.classList.remove('hidden');
                    } else {
                        manualFields.classList.add('hidden');
                    }
                }
            });
        }
        
        // Evento de submissão do formulário
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            handleResolutionSubmit(form, record);
        });
    }
    
    // Função para processar submissão de resolução
    function handleResolutionSubmit(form, record) {
        const formData = new FormData(form);
        
        if (record.status === 'inconsistent') {
            const dataSource = formData.get('data-source');
            const notes = formData.get('resolution-notes') || form.querySelector('#resolution-notes')?.value || '';
            
            let resolution = {};
            
            switch (dataSource) {
                case 'backoffice':
                    resolution = {
                        type: 'use_backoffice',
                        bookingPrice: record.bookingPriceBO,
                        source: 'Back Office',
                        notes: notes
                    };
                    break;
                case 'odoo':
                    resolution = {
                        type: 'use_odoo',
                        bookingPrice: record.bookingPriceOdoo,
                        source: 'Odoo',
                        notes: notes
                    };
                    break;
                case 'manual':
                    const manualPrice = form.querySelector('#manual-booking-price')?.value;
                    if (!manualPrice || isNaN(manualPrice)) {
                        alert('Por favor, insira um preço válido para a correção manual.');
                        return;
                    }
                    resolution = {
                        type: 'manual_correction',
                        bookingPrice: parseFloat(manualPrice),
                        source: 'Correção Manual',
                        notes: notes
                    };
                    break;
            }
            
            // Aplicar resolução
            applyResolution(record, resolution);
            
        } else if (record.status.includes('missing')) {
            const action = formData.get('missing-action') || form.querySelector('input[name="missing-action"]:checked')?.value;
            const notes = formData.get('resolution-notes') || form.querySelector('#resolution-notes')?.value || '';
            
            let resolution = {};
            
            switch (action) {
                case 'ignore':
                    resolution = {
                        type: 'ignore_missing',
                        action: 'Ignorado',
                        notes: notes || 'Inconsistência ignorada pelo utilizador'
                    };
                    break;
                case 'investigate':
                    resolution = {
                        type: 'investigate',
                        action: 'Investigação',
                        notes: notes || 'Marcado para investigação'
                    };
                    break;
            }
            
            // Aplicar resolução
            applyResolution(record, resolution);
        }
        
        // Fechar modal
        const modal = document.getElementById('edit-modal-overlay');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Mostrar mensagem de sucesso
        if (window.appUtils) {
            window.appUtils.showSuccess('Resolução aplicada com sucesso!');
        }
    }
    
    // Função para aplicar resolução a um registro
    function applyResolution(record, resolution) {
        // Encontrar o registro nos resultados e aplicar resolução
        const allIndex = comparisonResults.all.findIndex(r => 
            normalizeLicensePlate(r.licensePlate) === normalizeLicensePlate(record.licensePlate)
        );
        
        if (allIndex !== -1) {
            comparisonResults.all[allIndex].resolution = resolution;
            comparisonResults.all[allIndex].resolutionNotes = resolution.notes;
            
            // Se era inconsistente ou missing, mover para válidos se apropriado
            if (resolution.type === 'use_backoffice' || resolution.type === 'use_odoo' || resolution.type === 'manual_correction') {
                comparisonResults.all[allIndex].status = 'resolved';
                
                // Remover das listas de problemas
                comparisonResults.inconsistent = comparisonResults.inconsistent.filter(r => 
                    normalizeLicensePlate(r.licensePlate) !== normalizeLicensePlate(record.licensePlate)
                );
                comparisonResults.missing = comparisonResults.missing.filter(r => 
                    normalizeLicensePlate(r.licensePlate) !== normalizeLicensePlate(record.licensePlate)
                );
                
                // Adicionar aos válidos se não existir
                const validIndex = comparisonResults.valid.findIndex(r => 
                    normalizeLicensePlate(r.licensePlate) === normalizeLicensePlate(record.licensePlate)
                );
                if (validIndex === -1) {
                    comparisonResults.valid.push({...comparisonResults.all[allIndex]});
                }
            }
        }
        
        // Atualizar contadores
        if (inconsistencyCountElement) {
            inconsistencyCountElement.textContent = comparisonResults.inconsistent.length;
        }
        if (missingCountElement) {
            missingCountElement.textContent = comparisonResults.missing.length;
        }
        
        // Re-renderizar tabela
        renderComparisonTable(comparisonResults.all);
        
        // Atualizar botão de validação
        updateValidateButton();
        
        console.log('Resolução aplicada:', {
            licensePlate: record.licensePlate,
            resolution: resolution
        });
    }
    
    // Função para exportar dados resolvidos
    window.getResolvedComparisonData = function() {
        return {
            all: comparisonResults.all,
            resolved: comparisonResults.all.filter(r => r.resolution),
            unresolved: comparisonResults.all.filter(r => !r.resolution),
            summary: {
                total: comparisonResults.all.length,
                valid: comparisonResults.valid.length,
                inconsistent: comparisonResults.inconsistent.length,
                missing: comparisonResults.missing.length,
                resolved: comparisonResults.all.filter(r => r.resolution).length
            }
        };
    };
    
    // Função para validar se todos os problemas foram resolvidos
    window.validateComparison = function() {
        const unresolved = comparisonResults.inconsistent.filter(r => !r.resolution).length + 
                          comparisonResults.missing.filter(r => !r.resolution).length;
        
        if (unresolved > 0) {
            if (window.appUtils) {
                window.appUtils.showError(`Ainda existem ${unresolved} problemas não resolvidos. Por favor, resolva-os antes de prosseguir.`);
            }
            return false;
        }
        
        if (window.appUtils) {
            window.appUtils.showSuccess('Todos os problemas foram resolvidos! Pode prosseguir para a validação de caixa.');
        }
        
        return true;
    };
    
    // Configurar evento do botão de validação
    if (validateComparisonBtn) {
        validateComparisonBtn.addEventListener('click', function() {
            if (window.validateComparison()) {
                // Mudar para aba de validação
                const validateTab = document.querySelector('.nav-tab[data-tab="validate"]');
                if (validateTab) {
                    validateTab.click();
                }
            }
        });
    }
    
    // Função para obter estatísticas da comparação
    window.getComparisonStats = function() {
        return {
            total: comparisonResults.all.length,
            valid: comparisonResults.valid.length,
            inconsistent: comparisonResults.inconsistent.length,
            missing: comparisonResults.missing.length,
            resolved: comparisonResults.all.filter(r => r.resolution).length,
            unresolvedInconsistent: comparisonResults.inconsistent.filter(r => !r.resolution).length,
            unresolvedMissing: comparisonResults.missing.filter(r => !r.resolution).length
        };
    };
    
    // Função para resetar comparação
    window.resetComparison = function() {
        comparisonResults = {
            all: [],
            inconsistent: [],
            missing: [],
            valid: []
        };
        
        // Limpar interface
        if (odooCountElement) odooCountElement.textContent = '0';
        if (backofficeCountElement) backofficeCountElement.textContent = '0';
        if (inconsistencyCountElement) inconsistencyCountElement.textContent = '0';
        if (missingCountElement) missingCountElement.textContent = '0';
        
        if (comparisonTableBody) {
            comparisonTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum dado disponível. Importe os arquivos primeiro.</td></tr>';
        }
        
        if (validateComparisonBtn) {
            validateComparisonBtn.disabled = true;
        }
        
        console.log('Comparação resetada');
    };
    
    // Função utilitária para debugging
    window.debugComparison = function() {
        console.log('Estado atual da comparação:', {
            results: comparisonResults,
            stats: window.getComparisonStats()
        });
    };
    
    console.log('Comparator.js carregado com sucesso');
});
