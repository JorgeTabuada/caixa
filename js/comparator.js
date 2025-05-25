// Comparador entre Odoo e Back Office
document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface de comparação
    const odooCountElement = document.getElementById('odoo-count');
    const backofficeCountElement = document.getElementById('backoffice-count');
    const inconsistencyCountElement = document.getElementById('inconsistency-count');
    const missingCountElement = document.getElementById('missing-count');
    const comparisonTable = document.getElementById('comparison-table').querySelector('tbody');
    const validateComparisonBtn = document.getElementById('validate-comparison-btn');

    if (validateComparisonBtn) {
        validateComparisonBtn.addEventListener('click', () => {
            if (validateComparisonBtn.disabled) {
                console.log('Botão Validar e Avançar está desabilitado.');
                return; // Do nothing if disabled
            }

            console.log('Botão Validar e Avançar clicado. Navegando para a aba de Validação de Caixa.');
            
            // Switch to the "Validação de Caixa" tab
            const validateTab = document.querySelector('.nav-tab[data-tab="validate"]');
            if (validateTab) {
                validateTab.click();
            } else {
                console.error('Não foi possível encontrar a aba de Validação de Caixa.');
                // Optionally, show an error to the user via showError or alert.
            }
        });
    }
    
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
                // Normalizar matrícula: remover espaços, traços, pontos e outros caracteres especiais
                const normalizedPlate = String(record.licensePlate).replace(/[\s\-\.\,\/\\\(\)\[\]\{\}\+\*\?\^\$\|]/g, '').toLowerCase();
                odooMap.set(normalizedPlate, record);
            }
        });
        
        // Criar mapa de registros do Back Office por matrícula (insensível a maiúsculas/minúsculas)
        const backOfficeMap = new Map();
        backOfficeData.forEach(record => {
            if (record.licensePlate) {
                // Normalizar matrícula: remover espaços, traços, pontos e outros caracteres especiais
                const normalizedPlate = String(record.licensePlate).replace(/[\s\-\.\,\/\\\(\)\[\]\{\}\+\*\?\^\$\|]/g, '').toLowerCase();
                backOfficeMap.set(normalizedPlate, record);
            }
        });
        
        // Verificar registros do Back Office
        backOfficeData.forEach(boRecord => {
            if (!boRecord.licensePlate) return;
            
            const licensePlate = boRecord.licensePlate;
            // Normalizar matrícula: remover espaços, traços, pontos e outros caracteres especiais
            const normalizedPlate = String(licensePlate).replace(/[\s\-\.\,\/\\\(\)\[\]\{\}\+\*\?\^\$\|]/g, '').toLowerCase();
            const odooRecord = odooMap.get(normalizedPlate);
            
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
                if (normalizeValue(boRecord.bookingPrice) !== normalizeValue(odooRecord.bookingPrice)) {
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
            // Normalizar matrícula: remover espaços, traços, pontos e outros caracteres especiais
            const normalizedPlate = String(licensePlate).replace(/[\s\-\.\,\/\\\(\)\[\]\{\}\+\*\?\^\$\|]/g, '').toLowerCase();
            const boRecord = backOfficeMap.get(normalizedPlate);
            
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
                        <input type="radio" id="prefer-backoffice" name="data-source" value="backoffice" checked>
                        <label for="prefer-backoffice">Usar dados do Back Office</label>
                    </div>
                    <div>
                        <input type="radio" id="prefer-odoo" name="data-source" value="odoo">
                        <label f
(Content truncated due to size limit. Use line ranges to read in chunks)