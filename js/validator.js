// Validador de Caixa
document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface de validação de caixa
    const driverSelect = document.getElementById('driver-select');
    const driverSelection = document.getElementById('driver-selection');
    const driverDeliveries = document.getElementById('driver-deliveries');
    const deliveriesTable = document.getElementById('deliveries-table').querySelector('tbody');
    const deliveryCountElement = document.getElementById('delivery-count');
    const addCaixaBtn = document.getElementById('add-caixa-btn');
    const closeCaixaBtn = document.getElementById('close-caixa-btn');
    
    // Variáveis para armazenar dados da validação
    let validatedDeliveries = [];
    let pendingDeliveries = [];
    let currentDriverDeliveries = [];
    let drivers = [];
    
    // Função para iniciar validação de caixa
    function initCaixaValidation(caixaData) {
        console.log("Iniciando validação de caixa com dados:", caixaData);
        
        if (!caixaData || caixaData.length === 0) {
            alert('Nenhum dado de caixa disponível. Por favor, importe o arquivo de caixa.');
            return;
        }
        
        // Obter dados validados da comparação
        const comparisonResults = window.comparator ? window.comparator.getResults() : null;
        const validatedData = comparisonResults ? comparisonResults.all : [];
        
        if (!validatedData || validatedData.length === 0) {
            console.warn("Dados de comparação não disponíveis. A validação pode ser limitada.");
        }
        
        // Extrair condutores únicos
        drivers = [...new Set(caixaData.map(item => item.condutorEntrega).filter(Boolean))];
        console.log("Condutores encontrados:", drivers);
        
        // Preencher select de condutores
        populateDriverSelect(drivers);
        
        // Mostrar seção de seleção de condutor
        driverSelection.classList.remove('hidden');
        
        // Processar entregas
        processDeliveries(caixaData, validatedData);
        
        // Mostrar botões
        addCaixaBtn.classList.remove('hidden');
        closeCaixaBtn.classList.remove('hidden');
    }
    
    // Função para preencher select de condutores
    function populateDriverSelect(driversList) {
        // Limpar opções existentes
        driverSelect.innerHTML = '<option value="">Selecione um condutor</option>';
        
        // Adicionar cada condutor como opção
        driversList.forEach(driver => {
            const option = document.createElement('option');
            option.value = driver;
            option.textContent = driver;
            driverSelect.appendChild(option);
        });
    }
    
    // Função para processar entregas
    function processDeliveries(caixaData, validatedData) {
        // Criar mapa de registros validados por matrícula (insensível a maiúsculas/minúsculas)
        const validatedMap = new Map();
        if (validatedData && validatedData.length > 0) {
            validatedData.forEach(record => {
                if (record.licensePlate) {
                    validatedMap.set(record.licensePlate.toString().toLowerCase(), record);
                }
            });
        }
        
        // Processar cada entrega da caixa
        pendingDeliveries = caixaData.map(delivery => {
            if (!delivery.licensePlate) return null;
            
            const licensePlateLower = delivery.licensePlate.toString().toLowerCase();
            const validatedRecord = validatedMap.get(licensePlateLower);
            
            // Verificar inconsistências
            const inconsistencies = [];
            
            if (validatedRecord) {
                // Verificar se o valor da caixa é igual aos três valores:
                // booking Price do backoffice, booking Price do Odoo e delivery Price do Odoo
                const deliveryPrice = parseFloat(delivery.priceOnDelivery) || 0;
                const bookingPriceBO = parseFloat(validatedRecord.bookingPriceBO) || 0;
                const bookingPriceOdoo = parseFloat(validatedRecord.bookingPriceOdoo) || 0;
                const priceOnDeliveryOdoo = validatedRecord.odooRecord ? 
                    (parseFloat(validatedRecord.odooRecord.priceOnDelivery) || 0) : 0;
                
                if (deliveryPrice !== bookingPriceBO) {
                    inconsistencies.push('bookingPriceBO');
                }
                
                if (deliveryPrice !== bookingPriceOdoo) {
                    inconsistencies.push('bookingPriceOdoo');
                }
                
                if (deliveryPrice !== priceOnDeliveryOdoo && priceOnDeliveryOdoo !== 0) {
                    inconsistencies.push('priceOnDeliveryOdoo');
                }
                
                // Verificar se o modo de pagamento "no pay" tem uma campanha correspondente
                if (delivery.paymentMethod === 'no pay') {
                    const hasCampaign = validatedRecord.boRecord && 
                                       validatedRecord.boRecord.campaign && 
                                       validatedRecord.boRecord.campaign.toLowerCase().includes('no pay');
                    
                    if (!hasCampaign) {
                        inconsistencies.push('no_pay_without_campaign');
                    }
                }
            } else {
                inconsistencies.push('missing_record');
            }
            
            // Determinar status
            let status = 'pending';
            if (inconsistencies.length > 0) {
                status = 'inconsistent';
            } else {
                // Se não há inconsistências, marcar como pronto para validação (não validado automaticamente)
                status = 'ready';
            }
            
            // Criar objeto de entrega
            return {
                licensePlate: delivery.licensePlate,
                alocation: delivery.alocation,
                checkOut: delivery.checkOut,
                paymentMethod: delivery.paymentMethod || 'N/A',
                priceOnDelivery: delivery.priceOnDelivery || delivery.correctedPrice || 0,
                condutorEntrega: delivery.condutorEntrega,
                campaign: delivery.campaign,
                campaignPay: delivery.campaignPay,
                parkBrand: delivery.parkBrand,
                status: status,
                inconsistencies: inconsistencies,
                validatedRecord: validatedRecord,
                originalDelivery: delivery,
                resolution: null,
                permanentInconsistency: delivery.paymentMethod === 'no pay' && 
                                       (!validatedRecord || !validatedRecord.boRecord || 
                                        !validatedRecord.boRecord.campaign || 
                                        !validatedRecord.boRecord.campaign.toLowerCase().includes('no pay'))
                                       ? 'cliente_sem_campanha_falta_pagamento' : null
            };
        }).filter(Boolean);
        
        console.log('Entregas processadas:', pendingDeliveries);
    }
    
    // Evento para seleção de condutor
    driverSelect.addEventListener('change', function() {
        const selectedDriver = this.value;
        
        if (selectedDriver) {
            // Filtrar entregas do condutor selecionado
            currentDriverDeliveries = pendingDeliveries.filter(delivery => 
                delivery.condutorEntrega === selectedDriver && 
                !validatedDeliveries.some(vd => vd.alocation === delivery.alocation)
            );
            
            // Mostrar seção de entregas
            driverDeliveries.classList.remove('hidden');
            
            // Atualizar contador
            deliveryCountElement.textContent = currentDriverDeliveries.length;
            
            // Renderizar tabela de entregas
            renderDeliveriesTable(currentDriverDeliveries);
        } else {
            // Ocultar seção de entregas
            driverDeliveries.classList.add('hidden');
        }
    });
    
    // Função para renderizar tabela de entregas
    function renderDeliveriesTable(deliveries) {
        // Limpar tabela
        deliveriesTable.innerHTML = '';
        
        if (deliveries.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" class="text-center">Nenhuma entrega pendente para este condutor.</td>';
            deliveriesTable.appendChild(row);
            return;
        }
        
        // Adicionar cada entrega à tabela
        deliveries.forEach(delivery => {
            const row = document.createElement('tr');
            
            // Adicionar classe de status
            if (delivery.status === 'inconsistent') {
                row.classList.add('status-warning'); // Amarelo para inconsistências
            } else if (delivery.status === 'ready') {
                row.classList.add('status-success'); // Verde para prontos para validação
            } else if (delivery.status === 'validated') {
                row.classList.add('status-success'); // Verde para validados
            }
            
            // Criar células
            row.innerHTML = `
                <td>${delivery.alocation}</td>
                <td>${delivery.licensePlate}</td>
                <td>${delivery.checkOut}</td>
                <td>${delivery.paymentMethod}</td>
                <td>${delivery.priceOnDelivery} €</td>
                <td>${getStatusText(delivery.status)}</td>
                <td>
                    <button class="btn btn-secondary btn-sm view-delivery-details" data-alocation="${delivery.alocation}">Detalhes</button>
                    <button class="btn ${delivery.status === 'ready' ? 'btn-success' : 'btn-primary'} btn-sm validate-delivery" data-alocation="${delivery.alocation}">Validar</button>
                </td>
            `;
            
            deliveriesTable.appendChild(row);
        });
        
        // Adicionar eventos aos botões
        addDeliveryTableButtonEvents();
    }
    
    // Função para adicionar eventos aos botões da tabela
    function addDeliveryTableButtonEvents() {
        // Botões de detalhes
        document.querySelectorAll('.view-delivery-details').forEach(button => {
            button.addEventListener('click', function() {
                const alocation = this.getAttribute('data-alocation');
                showDeliveryDetailsModal(alocation);
            });
        });
        
        // Botões de validação
        document.querySelectorAll('.validate-delivery').forEach(button => {
            button.addEventListener('click', function() {
                const alocation = this.getAttribute('data-alocation');
                showValidateDeliveryModal(alocation);
            });
        });
    }
    
    // Função para mostrar modal de detalhes da entrega
    function showDeliveryDetailsModal(alocation) {
        const delivery = currentDriverDeliveries.find(d => d.alocation === alocation) || 
                        validatedDeliveries.find(d => d.alocation === alocation);
        
        if (!delivery) return;
        
        const modalBody = document.getElementById('details-modal-body');
        modalBody.innerHTML = '';
        
        // Criar conteúdo do modal
        const content = document.createElement('div');
        
        // Informações gerais
        content.innerHTML = `
            <h4>Entrega: ${delivery.alocation}</h4>
            <p>Matrícula: ${delivery.licensePlate}</p>
            <p>Data de Checkout: ${delivery.checkOut}</p>
            <p>Condutor: ${delivery.condutorEntrega}</p>
            <p>Status: ${getStatusText(delivery.status)}</p>
            ${delivery.resolution ? `<p>Resolução: ${getResolutionText(delivery.resolution)}</p>` : ''}
            ${delivery.permanentInconsistency ? `<p class="status-error">Inconsistência permanente: ${getPermanentInconsistencyText(delivery.permanentInconsistency)}</p>` : ''}
        `;
        
        // Detalhes de pagamento
        const paymentDetails = document.createElement('div');
        paymentDetails.innerHTML = `
            <h4 class="mt-20">Detalhes de Pagamento</h4>
            <table class="table">
                <tr><th>Método de Pagamento</th><td>${delivery.paymentMethod}</td></tr>
                <tr><th>Valor na Entrega</th><td>${delivery.priceOnDelivery} €</td></tr>
                <tr><th>Campanha</th><td>${delivery.campaign || 'N/A'}</td></tr>
                <tr><th>Tipo de Campanha</th><td>${delivery.campaignPay || 'N/A'}</td></tr>
            </table>
        `;
        content.appendChild(paymentDetails);
        
        // Detalhes do registro validado
        if (delivery.validatedRecord) {
            const validatedDetails = document.createElement('div');
            validatedDetails.innerHTML = `
                <h4 class="mt-20">Detalhes do Registro Validado</h4>
                <table class="table">
                    <tr><th>Preço Booking (BO)</th><td>${delivery.validatedRecord.bookingPriceBO} €</td></tr>
                    <tr><th>Preço Booking (Odoo)</th><td>${delivery.validatedRecord.bookingPriceOdoo} €</td></tr>
                    <tr><th>Preço na Entrega (Odoo)</th><td>${delivery.validatedRecord.odooRecord && delivery.validatedRecord.odooRecord.priceOnDelivery ? delivery.validatedRecord.odooRecord.priceOnDelivery + ' €' : 'N/A'}</td></tr>
                    <tr><th>Marca</th><td>${delivery.validatedRecord.parkBrand}</td></tr>
                    <tr><th>Campanha (BO)</th><td>${delivery.validatedRecord.boRecord && delivery.validatedRecord.boRecord.campaign ? delivery.validatedRecord.boRecord.campaign : 'N/A'}</td></tr>
                </table>
            `;
            content.appendChild(validatedDetails);
        }
        
        // Inconsistências
        if (delivery.inconsistencies && delivery.inconsistencies.length > 0) {
            const inconsistenciesDiv = document.createElement('div');
            inconsistenciesDiv.innerHTML = `
                <h4 class="mt-20">Inconsistências</h4>
                <ul>
                    ${delivery.inconsistencies.map(inc => {
                        if (inc === 'bookingPriceBO') {
                            return `<li>Preço na Entrega: ${delivery.priceOnDelivery} € (Caixa) vs Preço Booking: ${delivery.validatedRecord.bookingPriceBO} € (BO)</li>`;
                        } else if (inc === 'bookingPriceOdoo') {
                            return `<li>Preço na Entrega: ${delivery.priceOnDelivery} € (Caixa) vs Preço Booking: ${delivery.validatedRecord.bookingPriceOdoo} € (Odoo)</li>`;
                        } else if (inc === 'priceOnDeliveryOdoo') {
                            const priceOnDeliveryOdoo = delivery.validatedRecord.odooRecord ? delivery.validatedRecord.odooRecord.priceOnDelivery : 'N/A';
                            return `<li>Preço na Entrega: ${delivery.priceOnDelivery} € (Caixa) vs Preço na Entrega: ${priceOnDeliveryOdoo} € (Odoo)</li>`;
                        } else if (inc === 'no_pay_without_campaign') {
                            return `<li>Método de Pagamento "no pay" sem campanha correspondente no Back Office</li>`;
                        } else if (inc === 'missing_record') {
                            return `<li>Registro não encontrado na comparação Odoo vs Back Office</li>`;
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
    
    // Função para mostrar modal de validação de entrega
    function showValidateDeliveryModal(alocation) {
        const delivery = currentDriverDeliveries.find(d => d.alocation === alocation);
        if (!delivery) return;
        
        const modalBody = document.getElementById('validate-delivery-modal-body');
        modalBody.innerHTML = '';
        
        // Criar formulário de validação
        const form = document.createElement('form');
        form.id = 'validate-delivery-form';
        
        // Adicionar campos conforme o tipo de problema
        if (delivery.status === 'inconsistent') {
            // Formulário para inconsistências
            form.innerHTML = `
                <p>Valide a entrega com alocação <strong>${delivery.alocation}</strong> (matrícula: ${delivery.licensePlate}):</p>
                
                <div class="form-group">
                    <label class="form-label">Escolha uma ação:</label>
                    <div>
                        <input type="radio" id="action-confirm" name="delivery-action" value="confirm" checked>
                        <label for="action-confirm">Confirmar entrega (corrigir inconsistências)</label>
                    </div>
                    <div>
                        <input type="radio" id="action-missing-value" name="delivery-action" value="missing-value">
                        <label for="action-missing-value">Marcar como valor em falta</label>
                    </div>
                    <div>
                        <input type="radio" id="action-not-delivered" name="delivery-action" value="not-delivered">
                        <label for="action-not-delivered">Marcar como veículo não entregue</label>
                    </div>
                </div>
                
                <div id="confirm-fields">
                    <div class="form-group">
                        <label class="form-label">Método de Pagamento:</label>
                        <select class="form-control" id="payment-method">
                            <option value="numerário" ${delivery.paymentMethod === 'numerário' ? 'selected' : ''}>Numerário</option>
                            <option value="multibanco" ${delivery.paymentMethod === 'multibanco' ? 'selected' : ''}>Multibanco</option>
                            <option value="no pay" ${delivery.paymentMethod === 'no pay' ? 'selected' : ''}>No Pay</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Valor na Entrega:</label>
                        <input type="number" class="form-control" id="price-on-delivery" value="${delivery.priceOnDelivery}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Observações:</label>
                    <textarea class="form-control" id="validation-notes"></textarea>
                </div>
            `;
        } else {
            // Formulário para entregas sem inconsistências ou prontas para validação
            form.innerHTML = `
                <p>Valide a entrega com alocação <strong>${delivery.alocation}</strong> (matrícula: ${delivery.licensePlate}):</p>
                
                <div class="form-group">
                    <label class="form-label">Método de Pagamento:</label>
                    <select class="form-control" id="payment-method">
                        <option value="numerário" ${delivery.paymentMethod === 'numerário' ? 'selected' : ''}>Numerário</option>
                        <option value="multibanco" ${delivery.paymentMethod === 'multibanco' ? 'selected' : ''}>Multibanco</option>
                        <option value="no pay" ${delivery.paymentMethod === 'no pay' ? 'selected' : ''}>No Pay</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Valor na Entrega:</label>
                    <input type="number" class="form-control" id="price-on-delivery" value="${delivery.priceOnDelivery}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Observações:</label>
                    <textarea class="form-control" id="validation-notes"></textarea>
                </div>
            `;
        }
        
        modalBody.appendChild(form);
        
        // Adicionar evento para mostrar/ocultar campos
        if (delivery.status === 'inconsistent') {
            const radioButtons = form.querySelectorAll('input[name="delivery-action"]');
            const confirmFields = form.querySelector('#confirm-fields');
            
            radioButtons.forEach(radio => {
                radio.addEventListener('change', function() {
                    if (this.value === 'confirm') {
                        confirmFields.classList.remove('hidden');
                    } else {
                        confirmFields.classList.add('hidden');
                    }
                });
            });
        }
        
        // Configurar botão de salvar
        const saveButton = document.getElementById('save-validation-btn');
        saveButton.onclick = function() {
            validateDelivery(delivery);
        };
        
        // Mostrar modal
        document.getElementById('validate-delivery-modal-overlay').style.display = 'flex';
    }
    
    // Função para validar entrega
    function validateDelivery(delivery) {
        if (delivery.status === 'inconsistent') {
            const action = document.querySelector('input[name="delivery-action"]:checked').value;
            const notes = document.getElementById('validation-notes').value;
            
            if (action === 'confirm') {
                // Confirmar entrega
                const paymentMethod = document.getElementById('payment-method').value;
                const priceOnDelivery = parseFloat(document.getElementById('price-on-delivery').value);
                
                delivery.resolution = 'confirmed';
                delivery.resolutionNotes = notes;
                delivery.paymentMethod = paymentMethod;
                delivery.priceOnDelivery = priceOnDelivery;
                
                // Verificar se método de pagamento é compatível com campanha
                if (paymentMethod === 'no pay') {
                    const hasCampaign = delivery.validatedRecord && 
                                       delivery.validatedRecord.boRecord && 
                                       delivery.validatedRecord.boRecord.campaign && 
                                       delivery.validatedRecord.boRecord.campaign.toLowerCase().includes('no pay');
                    
                    if (!hasCampaign) {
                        delivery.permanentInconsistency = 'cliente_sem_campanha_falta_pagamento';
                    }
                }
                
            } else if (action === 'missing-value') {
                // Marcar como valor em falta
                delivery.resolution = 'missing_value';
                delivery.resolutionNotes = notes;
                
            } else if (action === 'not-delivered') {
                // Marcar como veículo não entregue
                delivery.resolution = 'not_delivered';
                delivery.resolutionNotes = notes;
            }
            
        } else {
            // Entrega sem inconsistências ou pronta para validação
            const paymentMethod = document.getElementById('payment-method').value;
            const priceOnDelivery = parseFloat(document.getElementById('price-on-delivery').value);
            const notes = document.getElementById('validation-notes').value;
            
            delivery.resolution = 'confirmed';
            delivery.resolutionNotes = notes;
            delivery.paymentMethod = paymentMethod;
            delivery.priceOnDelivery = priceOnDelivery;
            
            // Verificar se método de pagamento é compatível com campanha
            if (paymentMethod === 'no pay') {
                const hasCampaign = delivery.validatedRecord && 
                                   delivery.validatedRecord.boRecord && 
                                   delivery.validatedRecord.boRecord.campaign && 
                                   delivery.validatedRecord.boRecord.campaign.toLowerCase().includes('no pay');
                
                if (!hasCampaign) {
                    delivery.permanentInconsistency = 'cliente_sem_campanha_falta_pagamento';
                }
            }
        }
        
        // Atualizar status
        delivery.status = 'validated';
        
        // Mover para entregas validadas
        moveToValidated(delivery);
        
        // Fechar modal
        document.getElementById('validate-delivery-modal-overlay').style.display = 'none';
        
        // Atualizar tabela
        renderDeliveriesTable(currentDriverDeliveries);
        
        // Atualizar contador
        deliveryCountElement.textContent = currentDriverDeliveries.length;
    }
    
    // Função para mover entrega para validadas
    function moveToValidated(delivery) {
        // Adicionar à lista de validadas
        validatedDeliveries.push(delivery);
        
        // Remover das entregas atuais do condutor
        currentDriverDeliveries = currentDriverDeliveries.filter(d => d.alocation !== delivery.alocation);
    }
    
    // Função para obter texto de status
    function getStatusText(status) {
        switch (status) {
            case 'pending':
                return 'Pendente';
            case 'inconsistent':
                return 'Inconsistente';
            case 'ready':
                return 'Pronto para Validação';
            case 'validated':
                return 'Validado';
            default:
                return status;
        }
    }
    
    // Função para obter texto de resolução
    function getResolutionText(resolution) {
        switch (resolution) {
            case 'confirmed':
                return 'Confirmado';
            case 'missing_value':
                return 'Valor em Falta';
            case 'not_delivered':
                return 'Não Entregue';
            case 'auto_validated':
                return 'Validado Automaticamente';
            default:
                return resolution;
        }
    }
    
    // Função para obter texto de inconsistência permanente
    function getPermanentInconsistencyText(inconsistency) {
        switch (inconsistency) {
            case 'cliente_sem_campanha_falta_pagamento':
                return 'Cliente sem campanha, falta pagamento';
            default:
                return inconsistency;
        }
    }
    
    // Evento para botão de adicionar nova folha de caixa
    addCaixaBtn.addEventListener('click', function() {
        // Limpar seleção de condutor
        driverSelect.value = '';
        
        // Ocultar seção de entregas
        driverDeliveries.classList.add('hidden');
        
        // Mostrar seção de upload de caixa
        document.getElementById('caixa-upload').classList.remove('hidden');
        document.getElementById('caixa-file-info').classList.add('hidden');
    });
    
    // Evento para botão de encerrar caixa
    closeCaixaBtn.addEventListener('click', function() {
        // Verificar se há entregas pendentes
        const totalPending = pendingDeliveries.filter(d => 
            d.status !== 'validated' && 
            !validatedDeliveries.some(vd => vd.alocation === d.alocation)
        ).length;
        
        if (totalPending > 0) {
            if (!confirm(`Ainda existem ${totalPending} entregas não validadas. Deseja realmente encerrar a caixa?`)) {
                return;
            }
        }
        
        // Preparar dados para dashboard
        prepareDashboardData();
        
        // Mudar para a aba de dashboard
        const dashboardTab = document.querySelector('.nav-tab[data-tab="dashboard"]');
        changeTab(dashboardTab);
    });
    
    // Função para preparar dados para dashboard
    function prepareDashboardData() {
        // Combinar entregas validadas com pendentes
        const allDeliveries = [
            ...validatedDeliveries,
            ...pendingDeliveries.filter(d => 
                !validatedDeliveries.some(vd => vd.alocation === d.alocation)
            )
        ];
        
        // Exportar dados para o dashboard
        window.dashboard.setDeliveryData(allDeliveries);
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
    
    // Evento para upload de arquivo de caixa
    document.getElementById('caixa-file').addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            
            // Ler arquivo
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Obter a primeira planilha
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Converter para JSON
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    
                    // Armazenar dados
                    window.fileProcessor.setCaixaData(jsonData);
                    
                    // Iniciar validação
                    initCaixaValidation(jsonData);
                    
                } catch (error) {
                    console.error('Erro ao processar o arquivo:', error);
                    alert('Erro ao processar o arquivo. Verifique se é um arquivo Excel válido.');
                }
            };
            
            reader.readAsArrayBuffer(file);
        }
    });
    
    // Exportar funções para uso global
    window.validator = {
        initCaixaValidation: initCaixaValidation,
        getValidatedDeliveries: () => validatedDeliveries,
        getPendingDeliveries: () => pendingDeliveries
    };
});
