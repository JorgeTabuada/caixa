// Comparador entre Odoo e Back Office
document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface de comparação
    const odooCountElement = document.getElementById('odoo-count');
    const backofficeCountElement = document.getElementById('backoffice-count');
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
    
    // Função principal de comparação
    window.compareOdooBackOffice = function(odooData, backOfficeData) {
        // Limpar resultados anteriores
        comparisonResults = {
            all: [],
            inconsistent: [],
            missing: [],
            valid: []
        };
        
        // Atualizar contadores
        odooCountElement.textContent = odooData.length;
        backofficeCountElement.textContent = backOfficeData.length;
        
        // Criar mapa de registros do Odoo por matrícula (insensível a maiúsculas/minúsculas)
        const odooMap = new Map();
        odooData.forEach(record => {
            if (record.licensePlate) {
                odooMap.set(record.licensePlate.toString().toLowerCase(), record);
            }
        });
        
        // Criar mapa de registros do Back Office por matrícula (insensível a maiúsculas/minúsculas)
        const backOfficeMap = new Map();
        backOfficeData.forEach(record => {
            if (record.licensePlate) {
                backOfficeMap.set(record.licensePlate.toString().toLowerCase(), record);
            }
        });
        
        // Verificar registros do Back Office
        backOfficeData.forEach(boRecord => {
            if (!boRecord.licensePlate) return;
            
            const licensePlate = boRecord.licensePlate;
            const licensePlateLower = licensePlate.toString().toLowerCase();
            const odooRecord = odooMap.get(licensePlateLower);
            
            if (!odooRecord) {
                // Registro presente no Back Office mas ausente no Odoo
                comparisonResults.missing.push({
                    source: 'backoffice',
                    licensePlate: licensePlate,
                    alocation: boRecord.alocation || 'N/A',
                    bookingPriceBO: boRecord.bookingPrice || 0,
                    bookingPriceOdoo: 'N/A',
                    parkBrand: boRecord.parkBrand || 'N/A',
                    status: 'missing_in_odoo',
                    boRecord: boRecord,
                    odooRecord: null,
                    resolution: null
                });
            } else {
                // Registro presente em ambos, verificar inconsistências
                const inconsistencies = [];
                
                // Verificar apenas preço de booking (conforme solicitado)
                if (boRecord.bookingPrice !== odooRecord.bookingPrice) {
                    inconsistencies.push('bookingPrice');
                }
                
                if (inconsistencies.length > 0) {
                    // Registro com inconsistências
                    comparisonResults.inconsistent.push({
                        source: 'both',
                        licensePlate: licensePlate,
                        alocation: boRecord.alocation || 'N/A',
                        bookingPriceBO: boRecord.bookingPrice || 0,
                        bookingPriceOdoo: odooRecord.bookingPrice || 0,
                        parkBrand: boRecord.parkBrand || 'N/A',
                        parkBrandOdoo: odooRecord.parkBrand || 'N/A',
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
                        licensePlate: licensePlate,
                        alocation: boRecord.alocation || 'N/A',
                        bookingPriceBO: boRecord.bookingPrice || 0,
                        bookingPriceOdoo: odooRecord.bookingPrice || 0,
                        parkBrand: boRecord.parkBrand || 'N/A',
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
            if (!odooRecord.licensePlate) return;
            
            const licensePlate = odooRecord.licensePlate;
            const licensePlateLower = licensePlate.toString().toLowerCase();
            const boRecord = backOfficeMap.get(licensePlateLower);
            
            if (!boRecord) {
                // Registro presente no Odoo mas ausente no Back Office
                comparisonResults.missing.push({
                    source: 'odoo',
                    licensePlate: licensePlate,
                    alocation: 'N/A',
                    bookingPriceBO: 'N/A',
                    bookingPriceOdoo: odooRecord.bookingPrice || 0,
                    parkBrand: odooRecord.parkBrand || 'N/A',
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
        inconsistencyCountElement.textContent = comparisonResults.inconsistent.length;
        missingCountElement.textContent = comparisonResults.missing.length;
        
        // Renderizar tabela com todos os registros
        renderComparisonTable(comparisonResults.all);
        
        // Habilitar botão de validação se não houver problemas ou se todos os problemas tiverem resolução
        updateValidateButton();
    };
    
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
                <td>${record.bookingPriceBO} €</td>
                <td>${record.bookingPriceOdoo} €</td>
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
        
        // Detalhes do Back Office
        if (record.boRecord) {
            const boDetails = document.createElement('div');
            boDetails.innerHTML = `
                <h4 class="mt-20">Detalhes do Back Office</h4>
                <table class="table">
                    <tr><th>Alocação</th><td>${record.boRecord.alocation || 'N/A'}</td></tr>
                    <tr><th>Preço Booking</th><td>${record.boRecord.bookingPrice || 'N/A'} €</td></tr>
                    <tr><th>Marca</th><td>${record.boRecord.parkBrand || 'N/A'}</td></tr>
                    <tr><th>Campanha</th><td>${record.boRecord.campaign || 'N/A'}</td></tr>
                    <tr><th>Check-In</th><td>${record.boRecord.checkIn || 'N/A'}</td></tr>
                </table>
            `;
            content.appendChild(boDetails);
        }
        
        // Detalhes do Odoo
        if (record.odooRecord) {
            const odooDetails = document.createElement('div');
            odooDetails.innerHTML = `
                <h4 class="mt-20">Detalhes do Odoo</h4>
                <table class="table">
                    <tr><th>ID</th><td>${record.odooRecord.ID || 'N/A'}</td></tr>
                    <tr><th>Preço Booking</th><td>${record.odooRecord.bookingPrice || 'N/A'} €</td></tr>
                    <tr><th>Preço na Entrega</th><td>${record.odooRecord.priceOnDelivery || 'N/A'} €</td></tr>
                    <tr><th>Marca</th><td>${record.odooRecord.parkBrand || 'N/A'}</td></tr>
                    <tr><th>Check-In</th><td>${record.odooRecord.checkIn || 'N/A'}</td></tr>
                    <tr><th>Check-Out</th><td>${record.odooRecord.checkOut || 'N/A'}</td></tr>
                </table>
            `;
            content.appendChild(odooDetails);
        }
        
        // Inconsistências
        if (record.inconsistencies && record.inconsistencies.length > 0) {
            const inconsistenciesDiv = document.createElement('div');
            inconsistenciesDiv.innerHTML = `
                <h4 class="mt-20">Inconsistências</h4>
                <ul>
                    ${record.inconsistencies.map(inc => {
                        if (inc === 'bookingPrice') {
                            return `<li>Preço de Booking: ${record.bookingPriceBO} € (BO) vs ${record.bookingPriceOdoo} € (Odoo)</li>`;
                        } else if (inc === 'parkBrand') {
                            return `<li>Marca: ${record.parkBrand} (BO) vs ${record.parkBrandOdoo} (Odoo)</li>`;
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
        const modalOverlay = document.getElementById('details-modal-overlay');
        if (modalOverlay) {
            modalOverlay.style.display = 'flex';
        } else {
            console.warn('Elemento details-modal-overlay não encontrado');
        }
    }
    
    // Função para mostrar modal de resolução
    function showResolveModal(licensePlate) {
        const record = comparisonResults.all.find(r => r.licensePlate.toString().toLowerCase() === licensePlate.toString().toLowerCase());
        if (!record) return;
        
        const modalBody = document.getElementById('edit-modal-body');
        if (!modalBody) {
            console.warn('Elemento edit-modal-body não encontrado');
            return;
        }
        
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
                        <input type="radio" id="prefer-backoffice" name="data-source" value="backoffice" checked>
                        <label for="prefer-backoffice">Usar dados do Back Office</label>
                    </div>
                    <div>
                        <input type="radio" id="prefer-odoo" name="data-source" value="odoo">
                        <label for="prefer-odoo">Usar dados do Odoo</label>
                    </div>
                    <div>
                        <input type="radio" id="prefer-custom" name="data-source" value="custom">
                        <label for="prefer-custom">Personalizar</label>
                    </div>
                </div>
                
                <div id="custom-fields" class="hidden">
                    ${record.inconsistencies.includes('bookingPrice') ? `
                        <div class="form-group">
                            <label class="form-label">Preço de Booking:</label>
                            <input type="number" class="form-control" id="custom-booking-price" value="${record.bookingPriceBO}">
                        </div>
                    ` : ''}
                </div>
                
                <div class="form-group">
                    <label class="form-label">Observações:</label>
                    <textarea class="form-control" id="resolution-notes"></textarea>
                </div>
            `;
        } else if (record.status.includes('missing')) {
            // Formulário para registros ausentes
            form.innerHTML = `
                <p>Resolva o problema para o registro com matrícula <strong>${record.licensePlate}</strong> que está ${record.status === 'missing_in_odoo' ? 'ausente no Odoo' : 'ausente no Back Office'}:</p>
                
                <div class="form-group">
                    <label class="form-label">Escolha uma ação:</label>
                    <div>
                        <input type="radio" id="action-include" name="missing-action" value="include" checked>
                        <label for="action-include">Incluir o registro</label>
                    </div>
                    <div>
                        <input type="radio" id="action-ignore" name="missing-action" value="ignore">
                        <label for="action-ignore">Ignorar (não incluir)</label>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Observações:</label>
                    <textarea class="form-control" id="resolution-notes"></textarea>
                </div>
            `;
        }
        
        modalBody.appendChild(form);
        
        // Adicionar evento para mostrar/ocultar campos personalizados
        if (record.status === 'inconsistent') {
            const radioButtons = form.querySelectorAll('input[name="data-source"]');
            const customFields = form.querySelector('#custom-fields');
            
            radioButtons.forEach(radio => {
                radio.addEventListener('change', function() {
                    if (this.value === 'custom') {
                        customFields.classList.remove('hidden');
                    } else {
                        customFields.classList.add('hidden');
                    }
                });
            });
        }
        
        // Configurar botão de salvar
        const saveButton = document.getElementById('save-resolution-btn');
        saveButton.onclick = function() {
            resolveIssue(record);
        };
        
        // Mostrar modal
        document.getElementById('edit-modal-overlay').style.display = 'flex';
    }
    
    // Função para resolver problemas
    function resolveIssue(record) {
        if (record.status === 'inconsistent') {
            const dataSource = document.querySelector('input[name="data-source"]:checked').value;
            const notes = document.getElementById('resolution-notes').value;
            
            if (dataSource === 'backoffice') {
                // Usar dados do Back Office
                record.resolution = 'use_backoffice';
                record.resolutionNotes = notes;
                
                // Atualizar registro do Odoo com dados do Back Office
                if (record.inconsistencies.includes('bookingPrice')) {
                    record.odooRecord.bookingPrice = record.boRecord.bookingPrice;
                }
                
            } else if (dataSource === 'odoo') {
                // Usar dados do Odoo
                record.resolution = 'use_odoo';
                record.resolutionNotes = notes;
                
                // Atualizar registro do Back Office com dados do Odoo
                if (record.inconsistencies.includes('bookingPrice')) {
                    record.boRecord.bookingPrice = record.odooRecord.bookingPrice;
                    record.bookingPriceBO = record.odooRecord.bookingPrice;
                }
                
            } else if (dataSource === 'custom') {
                // Usar dados personalizados
                record.resolution = 'use_custom';
                record.resolutionNotes = notes;
                
                // Atualizar com valores personalizados
                if (record.inconsistencies.includes('bookingPrice')) {
                    const customPrice = parseFloat(document.getElementById('custom-booking-price').value);
                    record.boRecord.bookingPrice = customPrice;
                    record.odooRecord.bookingPrice = customPrice;
                    record.bookingPriceBO = customPrice;
                    record.bookingPriceOdoo = customPrice;
                }
            }
            
            // Mover registro para válidos
            moveRecordToValid(record);
            
        } else if (record.status.includes('missing')) {
            const action = document.querySelector('input[name="missing-action"]:checked').value;
            const notes = document.getElementById('resolution-notes').value;
            
            if (action === 'include') {
                // Incluir registro
                record.resolution = 'include';
                record.resolutionNotes = notes;
                
                if (record.status === 'missing_in_odoo') {
                    // Criar registro no Odoo baseado no Back Office
                    record.odooRecord = {
                        ID: 'AUTO_' + Math.floor(Math.random() * 1000000),
                        licensePlate: record.licensePlate,
                        bookingPrice: record.boRecord.bookingPrice,
                        parkBrand: record.boRecord.parkBrand,
                        checkIn: record.boRecord.checkIn,
                        stats: 'Auto-created'
                    };
                    record.bookingPriceOdoo = record.boRecord.bookingPrice;
                } else {
                    // Criar registro no Back Office baseado no Odoo
                    record.boRecord = {
                        licensePlate: record.licensePlate,
                        alocation: 'AUTO_' + Math.floor(Math.random() * 1000000),
                        bookingPrice: record.odooRecord.bookingPrice,
                        parkBrand: record.odooRecord.parkBrand,
                        checkIn: record.odooRecord.checkIn,
                        stats: 'Auto-created'
                    };
                    record.alocation = record.boRecord.alocation;
                    record.bookingPriceBO = record.odooRecord.bookingPrice;
                }
                
                // Mover registro para válidos
                moveRecordToValid(record);
                
            } else if (action === 'ignore') {
                // Ignorar registro
                record.resolution = 'ignore';
                record.resolutionNotes = notes;
                
                // Mover registro para válidos (mas marcado como ignorado)
                moveRecordToValid(record);
            }
        }
        
        // Fechar modal
        document.getElementById('edit-modal-overlay').style.display = 'none';
        
        // Atualizar tabela
        renderComparisonTable(comparisonResults.all);
        
        // Atualizar contadores
        updateCounters();
        
        // Verificar se todos os problemas foram resolvidos
        updateValidateButton();
    }
    
    // Função para mover um registro para a lista de válidos
    function moveRecordToValid(record) {
        // Remover das listas de problemas
        if (record.status === 'inconsistent') {
            comparisonResults.inconsistent = comparisonResults.inconsistent.filter(r => r.licensePlate.toString().toLowerCase() !== record.licensePlate.toString().toLowerCase());
        } else if (record.status.includes('missing')) {
            comparisonResults.missing = comparisonResults.missing.filter(r => r.licensePlate.toString().toLowerCase() !== record.licensePlate.toString().toLowerCase());
        }
        
        // Atualizar status
        record.status = 'valid';
        
        // Adicionar à lista de válidos se ainda não estiver
        if (!comparisonResults.valid.some(r => r.licensePlate.toString().toLowerCase() === record.licensePlate.toString().toLowerCase())) {
            comparisonResults.valid.push(record);
        }
    }
    
    // Função para atualizar contadores
    function updateCounters() {
        inconsistencyCountElement.textContent = comparisonResults.inconsistent.length;
        missingCountElement.textContent = comparisonResults.missing.length;
    }
    
    // Função para atualizar botão de validação
    function updateValidateButton() {
        const allResolved = comparisonResults.inconsistent.length === 0 && 
                           comparisonResults.missing.length === 0;
        
        validateComparisonBtn.disabled = !allResolved;
    }
    
    // Função para obter texto de status
    function getStatusText(status) {
        switch (status) {
            case 'valid':
                return 'Válido';
            case 'inconsistent':
                return 'Inconsistente';
            case 'missing_in_odoo':
                return 'Ausente no Odoo';
            case 'missing_in_backoffice':
                return 'Ausente no Back Office';
            default:
                return status;
        }
    }
    
    // Função para mudar de aba
    function changeTab(tabElement) {
        // Remover classe ativa de todas as abas
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Adicionar classe ativa à aba selecionada
        tabElement.classList.add('active');
        
        // Obter ID da seção correspondente
        const sectionId = tabElement.getAttribute('data-tab') + '-section';
        
        // Ocultar todas as seções
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Mostrar seção correspondente
        document.getElementById(sectionId).classList.add('active');
    }
    
    // Eventos para botões de filtro
    showAllBtn.addEventListener('click', function() {
        renderComparisonTable(comparisonResults.all);
    });
    
    showMissingBtn.addEventListener('click', function() {
        renderComparisonTable(comparisonResults.missing);
    });
    
    showInconsistentBtn.addEventListener('click', function() {
        renderComparisonTable(comparisonResults.inconsistent);
    });
    
    // Evento para botão de validação
    validateComparisonBtn.addEventListener('click', function() {
        // Atualizar dados do Odoo e Back Office com as resoluções
        window.fileProcessor.setOdooData(comparisonResults.all.map(r => r.odooRecord).filter(Boolean));
        window.fileProcessor.setBackOfficeData(comparisonResults.all.map(r => r.boRecord).filter(Boolean));
        
        // Mudar para a aba de validação de caixa
        const validateTab = document.querySelector('.nav-tab[data-tab="validate"]');
        changeTab(validateTab);
    });
    
    // Eventos para modais
    document.querySelectorAll('.modal-close, .modal-close-btn').forEach(element => {
        element.addEventListener('click', function() {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
    
    // Exportar resultados para uso global
    window.comparator = {
        getResults: () => comparisonResults
    };
});
