// Validador de Caixa
document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface de validação
    const driverSelect = document.getElementById('driver-select');
    const driverSelection = document.getElementById('driver-selection');
    const deliveriesTable = document.getElementById('deliveries-table').querySelector('tbody');
    const validateCaixaBtn = document.getElementById('validate-caixa-btn');
    const closeValidationBtn = document.getElementById('close-validation-btn');
    
    // Variáveis para armazenar dados de validação
    let caixaData = [];
    let currentDriverDeliveries = [];
    let validatedDeliveries = [];
    
    // Função principal de validação de caixa
    window.validateCaixa = function(data) {
        console.log('Iniciando validação de caixa com dados:', data);
        
        // Limpar dados anteriores
        caixaData = data;
        currentDriverDeliveries = [];
        validatedDeliveries = [];
        
        // Extrair condutores únicos
        const drivers = [...new Set(data.map(item => item.condutorEntrega))].filter(Boolean);
        console.log('Condutores encontrados:', drivers);
        
        // Preencher seletor de condutores
        if (driverSelect) {
            driverSelect.innerHTML = '<option value="">Selecione um condutor</option>';
            
            drivers.forEach(driver => {
                const option = document.createElement('option');
                option.value = driver;
                option.textContent = driver;
                driverSelect.appendChild(option);
            });
            
            // Mostrar seleção de condutores
            if (driverSelection) {
                driverSelection.classList.remove('hidden');
            }
            
            // Adicionar evento de seleção de condutor
            driverSelect.addEventListener('change', function() {
                const selectedDriver = this.value;
                if (selectedDriver) {
                    loadDriverDeliveries(selectedDriver);
                } else {
                    // Limpar tabela se nenhum condutor selecionado
                    if (deliveriesTable) {
                        deliveriesTable.innerHTML = '<tr><td colspan="7" class="text-center">Selecione um condutor para ver suas entregas.</td></tr>';
                    }
                }
            });
        }
        
        // Processar dados para validação
        processDeliveryData(data);
        
        return true;
    };
    
    // Função para processar dados de entrega
    function processDeliveryData(data) {
        // Processar cada entrega
        data.forEach(delivery => {
            // Verificar se já foi validada
            if (delivery.status !== 'validated') {
                // Definir status inicial
                delivery.status = 'ready';
                
                // Verificar inconsistências
                if (delivery.validatedRecord) {
                    // Verificar método de pagamento vs campanha
                    if (delivery.paymentMethod === 'no pay') {
                        // Se método é 'no pay', verificar se campanha também indica isso
                        const boRecord = delivery.validatedRecord.boRecord;
                        const odooRecord = delivery.validatedRecord.odooRecord;
                        
                        if (boRecord && boRecord.campaign !== 'no pay') {
                            delivery.status = 'inconsistent';
                            delivery.inconsistencyReason = 'payment_campaign_mismatch';
                        }
                        
                        if (odooRecord && odooRecord.campaign !== 'no pay') {
                            delivery.status = 'inconsistent';
                            delivery.inconsistencyReason = 'payment_campaign_mismatch';
                        }
                    }
                    
                    // Verificar preço
                    if (delivery.validatedRecord.bookingPriceBO !== delivery.validatedRecord.bookingPriceOdoo) {
                        delivery.status = 'inconsistent';
                        delivery.inconsistencyReason = 'price_mismatch';
                    }
                }
            }
        });
        
        console.log('Entregas processadas:', data);
    }
    
    // Função para carregar entregas de um condutor
    function loadDriverDeliveries(driver) {
        // Filtrar entregas do condutor
        currentDriverDeliveries = caixaData.filter(delivery => delivery.condutorEntrega === driver);
        
        // Atualizar tabela
        updateDeliveriesTable();
    }
    
    // Função para atualizar tabela de entregas
    function updateDeliveriesTable() {
        if (!deliveriesTable) return;
        
        // Limpar tabela
        deliveriesTable.innerHTML = '';
        
        // Verificar se há entregas
        if (currentDriverDeliveries.length === 0) {
            deliveriesTable.innerHTML = '<tr><td colspan="7" class="text-center">Nenhuma entrega encontrada para este condutor.</td></tr>';
            return;
        }
        
        // Adicionar cada entrega à tabela
        currentDriverDeliveries.forEach(delivery => {
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
        if (!modalBody) {
            console.warn('Elemento details-modal-body não encontrado');
            return;
        }
        
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
        
        modalBody.appendChild(content);
        
        // Mostrar modal
        const modalOverlay = document.getElementById('details-modal-overlay');
        if (modalOverlay) {
            modalOverlay.style.display = 'flex';
        } else {
            console.warn('Elemento details-modal-overlay não encontrado');
        }
    }
    
    // Função para mostrar modal de validação de entrega
    function showValidateDeliveryModal(alocation) {
        const delivery = currentDriverDeliveries.find(d => d.alocation === alocation);
        if (!delivery) return;
        
        // Obter ou criar elementos do modal
        const modalOverlay = document.getElementById('validate-delivery-modal-overlay');
        const modalBody = document.getElementById('validate-delivery-modal-body');
        const modalFooter = document.querySelector('.modal-footer') || document.createElement('div');
        
        if (!modalBody) {
            console.warn('Elemento validate-delivery-modal-body não encontrado');
            return;
        }
        
        // Limpar conteúdo anterior
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
                
                <div id="confirm-fields" class="mt-10">
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
        
        // Adicionar formulário ao modal
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
        
        // Configurar o footer do modal e botão de salvar
        if (!modalFooter.classList.contains('modal-footer')) {
            modalFooter.className = 'modal-footer';
            if (modalBody.parentNode && !modalBody.parentNode.querySelector('.modal-footer')) {
                modalBody.parentNode.appendChild(modalFooter);
            }
        }
        
        // Limpar e adicionar botão de salvar
        modalFooter.innerHTML = '';
        const saveButton = document.createElement('button');
        saveButton.id = 'save-validation-btn';
        saveButton.className = 'btn btn-primary';
        saveButton.textContent = 'Salvar';
        saveButton.onclick = function() {
            validateDelivery(delivery);
        };
        modalFooter.appendChild(saveButton);
        
        // Mostrar modal
        if (modalOverlay) {
            modalOverlay.style.display = 'flex';
        } else {
            console.warn('Elemento validate-delivery-modal-overlay não encontrado');
        }
    }
    
    // Função para validar entrega
    function validateDelivery(delivery) {
        if (delivery.status === 'inconsistent') {
            const actionElement = document.querySelector('input[name="delivery-action"]:checked');
            if (!actionElement) {
                console.warn('Nenhuma ação de validação selecionada');
                return;
            }
            const action = actionElement.value;
            
            const notesElement = document.getElementById('validation-notes');
            const notes = notesElement ? notesElement.value : '';
            
            if (action === 'confirm') {
                // Confirmar entrega
                const paymentMethodElement = document.getElementById('payment-method');
                if (!paymentMethodElement) {
                    console.warn('Elemento payment-method não encontrado');
                    return;
                }
                const paymentMethod = paymentMethodElement.value;
                const priceElement = document.getElementById('price-on-delivery');
                if (!priceElement) {
                    console.warn('Elemento price-on-delivery não encontrado');
                    return;
                }
                const priceOnDelivery = parseFloat(priceElement.value);
                
                delivery.resolution = 'confirmed';
                delivery.resolutionNotes = notes;
                delivery.paymentMethod = paymentMethod;
                delivery.priceOnDelivery = priceOnDelivery;
                delivery.status = 'validated';
            } else if (action === 'missing-value') {
                // Marcar como valor em falta
                delivery.resolution = 'missing-value';
                delivery.resolutionNotes = notes;
                delivery.status = 'validated';
                delivery.permanentInconsistency = 'missing-value';
            } else if (action === 'not-delivered') {
                // Marcar como não entregue
                delivery.resolution = 'not-delivered';
                delivery.resolutionNotes = notes;
                delivery.status = 'validated';
                delivery.permanentInconsistency = 'not-delivered';
            }
        } else {
            // Validar entrega sem inconsistências
            const paymentMethodElement = document.getElementById('payment-method');
            if (!paymentMethodElement) {
                console.warn('Elemento payment-method não encontrado');
                return;
            }
            const paymentMethod = paymentMethodElement.value;
            const priceElement = document.getElementById('price-on-delivery');
            if (!priceElement) {
                console.warn('Elemento price-on-delivery não encontrado');
                return;
            }
            const priceOnDelivery = parseFloat(priceElement.value);
            const notesElement = document.getElementById('validation-notes');
            const notes = notesElement ? notesElement.value : '';
            
            delivery.paymentMethod = paymentMethod;
            delivery.priceOnDelivery = priceOnDelivery;
            delivery.resolutionNotes = notes;
            delivery.status = 'validated';
        }
        
        // Adicionar à lista de entregas validadas
        if (!validatedDeliveries.includes(delivery)) {
            validatedDeliveries.push(delivery);
        }
        
        // Atualizar tabela
        updateDeliveriesTable();
        
        // Fechar modal
        const modalOverlay = document.getElementById('validate-delivery-modal-overlay');
        if (modalOverlay) {
            modalOverlay.style.display = 'none';
        }
        
        // Verificar se todas as entregas foram validadas
        checkAllValidated();
    }
    
    // Função para verificar se todas as entregas foram validadas
    function checkAllValidated() {
        const allValidated = currentDriverDeliveries.every(delivery => delivery.status === 'validated');
        
        // Habilitar botão de encerrar validação se todas estiverem validadas
        if (closeValidationBtn) {
            closeValidationBtn.disabled = !allValidated;
        }
    }
    
    // Função para obter texto do status
    function getStatusText(status) {
        switch (status) {
            case 'validated': return 'Validado';
            case 'inconsistent': return 'Inconsistente';
            case 'missing': return 'Em Falta';
            case 'ready': return 'Pronto para Validação';
            default: return status;
        }
    }
    
    // Função para obter texto da resolução
    function getResolutionText(resolution) {
        switch (resolution) {
            case 'confirmed': return 'Confirmado';
            case 'missing-value': return 'Valor em Falta';
            case 'not-delivered': return 'Não Entregue';
            default: return resolution;
        }
    }
    
    // Função para obter texto da inconsistência permanente
    function getPermanentInconsistencyText(inconsistency) {
        switch (inconsistency) {
            case 'missing-value': return 'Valor em Falta';
            case 'not-delivered': return 'Não Entregue';
            default: return inconsistency;
        }
    }
    
    // Evento para botão de encerrar validação
    if (closeValidationBtn) {
        closeValidationBtn.addEventListener('click', function() {
            // Verificar se há entregas validadas
            if (validatedDeliveries.length === 0) {
                alert('Nenhuma entrega foi validada. Por favor, valide pelo menos uma entrega antes de encerrar.');
                return;
            }
            
            // Atualizar dados de caixa com entregas validadas
            validatedDeliveries.forEach(validatedDelivery => {
                const index = caixaData.findIndex(d => d.alocation === validatedDelivery.alocation);
                if (index !== -1) {
                    caixaData[index] = validatedDelivery;
                }
            });
            
            // Enviar dados para o Supabase se disponível
            if (window.supabaseUtils) {
                window.supabaseUtils.checkSession().then(session => {
                    if (session) {
                        window.supabaseUtils.importDeliveries(validatedDeliveries).then(res => {
                            if (!res.error) {
                                console.log('Dados exportados com sucesso para o Supabase:', res.data);
                            } else {
                                console.error('Erro ao exportar para o Supabase:', res.error);
                            }
                        });
                    }
                });
            }
            
            // Avançar para o dashboard
            if (window.dashboard) {
                window.dashboard.init(caixaData);
            }
            
            // Mostrar seção de dashboard
            const validateSection = document.getElementById('validate-section');
            const dashboardSection = document.getElementById('dashboard-section');
            
            if (validateSection) {
                validateSection.classList.add('hidden');
            }
            
            if (dashboardSection) {
                dashboardSection.classList.remove('hidden');
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
    window.validatorUtils = {
        validateCaixa,
        getValidatedDeliveries: function() {
            return validatedDeliveries;
        },
        getAllDeliveries: function() {
            return caixaData;
        }
    };
});
