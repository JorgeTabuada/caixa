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
    
    // Variável para armazenar dados de comparação
    let comparisonData = [];
    
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
        
        // Atualizar dados de comparação
        comparisonData = comparisonResults.all;
        
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
        const record = comparisonData.find(r => r.licensePlate === licensePlate);
        if (!record) return;
        
        // Obter ou criar elementos do modal
        const modalOverlay = document.getElementById('edit-modal-overlay');
        const modalBody = document.getElementById('edit-modal-body');
        
        if (!modalBody) {
            console.warn('Elemento edit-modal-body não encontrado');
            return;
        }
        
        // Limpar conteúdo anterior
        modalBody.innerHTML = '';
        
        // Criar formulário de edição
        const form = document.createElement('form');
        form.id = 'edit-record-form';
        
        // Adicionar campos
        form.innerHTML = `
            <h4>Resolver Inconsistência</h4>
            <p>Matrícula: ${record.licensePlate}</p>
            <p>Alocação: ${record.alocation}</p>
            
            <div class="form-group">
                <label class="form-label">Preço Booking (BO):</label>
                <input type="number" class="form-control" id="edit-bo-price" value="${record.bookingPriceBO || 0}">
            </div>
            
            <div class="form-group">
                <label class="form-label">Preço Booking (Odoo):</label>
                <input type="number" class="form-control" id="edit-odoo-price" value="${record.bookingPriceOdoo || 0}">
            </div>
            
            <div class="form-group">
                <label class="form-label">Observações:</label>
                <textarea class="form-control" id="edit-notes"></textarea>
            </div>
        `;
        
        modalBody.appendChild(form);
        
        // Criar ou configurar botão de salvar
        const modalFooter = document.querySelector('#edit-modal-overlay .modal-footer') || document.createElement('div');
        
        if (!modalFooter.classList.contains('modal-footer')) {
            modalFooter.className = 'modal-footer';
            if (modalBody.parentNode && !modalBody.parentNode.querySelector('.modal-footer')) {
                modalBody.parentNode.appendChild(modalFooter);
            }
        }
        
        // Limpar e adicionar botão de salvar
        modalFooter.innerHTML = '';
        const saveButton = document.createElement('button');
        saveButton.id = 'save-edit-btn';
        saveButton.className = 'btn btn-primary';
        saveButton.textContent = 'Salvar';
        saveButton.onclick = function() {
            resolveInconsistency(record);
        };
        modalFooter.appendChild(saveButton);
        
        // Mostrar modal
        if (modalOverlay) {
            modalOverlay.style.display = 'flex';
        } else {
            console.warn('Elemento edit-modal-overlay não encontrado');
        }
    }
    
    // Função para resolver inconsistência
    function resolveInconsistency(record) {
        // Obter valores do formulário
        const boPriceElement = document.getElementById('edit-bo-price');
        const odooPriceElement = document.getElementById('edit-odoo-price');
        const notesElement = document.getElementById('edit-notes');
        
        if (!boPriceElement || !odooPriceElement) {
            console.warn('Elementos de formulário não encontrados');
            return;
        }
        
        const boPrice = parseFloat(boPriceElement.value);
        const odooPrice = parseFloat(odooPriceElement.value);
        const notes = notesElement ? notesElement.value : '';
        
        // Atualizar registro
        record.bookingPriceBO = boPrice;
        record.bookingPriceOdoo = odooPrice;
        record.resolution = 'manual';
        record.resolutionNotes = notes;
        
        // Verificar se ainda há inconsistências
        if (boPrice === odooPrice) {
            record.status = 'valid';
            record.inconsistencies = [];
            
            // Mover para lista de válidos
            const index = comparisonResults.inconsistent.findIndex(r => r.licensePlate === record.licensePlate);
            if (index !== -1) {
                comparisonResults.inconsistent.splice(index, 1);
                comparisonResults.valid.push(record);
            }
        }
        
        // Atualizar tabela
        renderComparisonTable(comparisonResults.all);
        
        // Atualizar contadores
        inconsistencyCountElement.textContent = comparisonResults.inconsistent.length;
        
        // Atualizar botão de validação
        updateValidateButton();
        
        // Fechar modal
        const modalOverlay = document.getElementById('edit-modal-overlay');
        if (modalOverlay) {
            modalOverlay.style.display = 'none';
        }
    }
    
    // Função para atualizar botão de validação
    function updateValidateButton() {
        const hasUnresolvedIssues = comparisonResults.inconsistent.some(r => !r.resolution) || 
                                   comparisonResults.missing.some(r => !r.resolution);
        
        if (validateComparisonBtn) {
            validateComparisonBtn.disabled = hasUnresolvedIssues;
        }
    }
    
    // Função para obter texto do status
    function getStatusText(status) {
        switch (status) {
            case 'valid': return 'Válido';
            case 'inconsistent': return 'Inconsistente';
            case 'missing_in_odoo': return 'Ausente no Odoo';
            case 'missing_in_backoffice': return 'Ausente no Back Office';
            default: return status;
        }
    }
    
    // Eventos para botões de filtro
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
    
    // Evento para botão de validação
    if (validateComparisonBtn) {
        validateComparisonBtn.addEventListener('click', function() {
            // Verificar se há inconsistências não resolvidas
            const hasUnresolvedIssues = comparisonResults.inconsistent.some(r => !r.resolution) || 
                                       comparisonResults.missing.some(r => !r.resolution);
            
            if (hasUnresolvedIssues) {
                alert('Existem inconsistências não resolvidas. Por favor, resolva todas as inconsistências antes de prosseguir.');
                return;
            }
            
            // Avançar para a próxima etapa
            const compareSection = document.getElementById('compare-section');
            const validateSection = document.getElementById('validate-section');
            
            if (compareSection) {
                compareSection.classList.add('hidden');
            }
            
            if (validateSection) {
                validateSection.classList.remove('hidden');
            }
            
            // Iniciar validação de caixa automaticamente se houver dados
            if (window.fileProcessor && window.fileProcessor.getCaixaData()) {
                console.log('Iniciando validação de caixa automaticamente');
                window.validateCaixa(window.fileProcessor.getCaixaData());
            }
        });
    }
    
    // Eventos para fechar modais
    document.querySelectorAll('.modal-close, .modal-overlay').forEach(element => {
        element.addEventListener('click', function(e) {
            // Fechar apenas se clicou diretamente no overlay ou no botão de fechar
            if (e.target === this) {
                const modalOverlay = this.classList.contains('modal-overlay') ? 
                    this : this.closest('.modal-overlay');
                
                if (modalOverlay) {
                    modalOverlay.style.display = 'none';
                }
            }
        });
    });
    
    // Fechar modais com tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
    
    // Exportar funções para uso global
    window.comparatorUtils = {
        getComparisonResults: function() {
            return comparisonResults;
        },
        getValidatedRecords: function() {
            return comparisonResults.all.filter(r => r.status === 'valid' || r.resolution);
        }
    };
});
