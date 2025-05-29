// Validador de Caixa - Versão corrigida
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando validator.js...');
    
    // Elementos da interface de validação de caixa
    const driverSelect = document.getElementById('driver-select');
    const driverSelection = document.getElementById('driver-selection');
    const driverDeliveries = document.getElementById('driver-deliveries');
    const deliveriesTable = document.getElementById('deliveries-table');
    const deliveriesTableBody = deliveriesTable ? deliveriesTable.querySelector('tbody') : null;
    const deliveryCountElement = document.getElementById('delivery-count');
    const addCaixaBtn = document.getElementById('add-caixa-btn');
    const closeCaixaBtn = document.getElementById('close-caixa-btn');
    
    // Variáveis para armazenar dados da validação
    let validatedDeliveries = [];
    let pendingDeliveries = [];
    let currentDriverDeliveries = [];
    let drivers = [];
    let allCaixaData = [];
    
    // Função para iniciar validação de caixa
    function initCaixaValidation(caixaData) {
        console.log("Iniciando validação de caixa com dados:", caixaData ? caixaData.length : 0);
        
        if (!caixaData || caixaData.length === 0) {
            if (window.appUtils) {
                window.appUtils.showError('Nenhum dado de caixa disponível. Por favor, importe o arquivo de caixa.');
            }
            return;
        }
        
        // Armazenar dados globalmente
        allCaixaData = caixaData;
        
        // Obter dados validados da comparação se disponível
        const comparisonResults = window.comparator ? window.comparator.getResults() : null;
        const validatedData = comparisonResults ? comparisonResults.all : [];
        
        if (!validatedData || validatedData.length === 0) {
            console.warn("Dados de comparação não disponíveis. A validação pode ser limitada.");
        }
        
        // Extrair condutores únicos
        drivers = [...new Set(caixaData.map(item => 
            item.condutorEntrega || item.driver || item['Condutor'] || item['Driver']
        ).filter(Boolean))];
        
        console.log("Condutores encontrados:", drivers);
        
        // Preencher select de condutores
        populateDriverSelect(drivers);
        
        // Mostrar seção de seleção de condutor
        if (driverSelection) {
            driverSelection.classList.remove('hidden');
        }
        
        // Processar entregas
        processDeliveries(caixaData, validatedData);
        
        // Mostrar botões
        if (addCaixaBtn) addCaixaBtn.classList.remove('hidden');
        if (closeCaixaBtn) closeCaixaBtn.classList.remove('hidden');
        
        // Configurar eventos
        setupValidatorEvents();
    }
    
    // Função para preencher select de condutores
    function populateDriverSelect(driversList) {
        if (!driverSelect) return;
        
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
        console.log("Processando entregas:", { caixa: caixaData.length, validated: validatedData.length });
        
        // Criar mapa de dados validados por matrícula
        const validatedMap = new Map();
        if (validatedData && validatedData.length > 0) {
            validatedData.forEach(record => {
                const plate = normalizeLicensePlate(record.licensePlate);
                validatedMap.set(plate, record);
            });
        }
        
        // Processar cada registro de caixa
        validatedDeliveries = [];
        pendingDeliveries = [];
        
        caixaData.forEach(caixaRecord => {
            const licensePlate = caixaRecord.licensePlate || caixaRecord['License Plate'] || caixaRecord['Matrícula'] || '';
            const driver = caixaRecord.condutorEntrega || caixaRecord.driver || caixaRecord['Condutor'] || caixaRecord['Driver'] || '';
            const paymentMethod = (caixaRecord.paymentMethod || caixaRecord['Payment Method'] || caixaRecord['Método Pagamento'] || '').toLowerCase();
            const bookingPrice = parseFloat(caixaRecord.bookingPrice || caixaRecord['Booking Price'] || caixaRecord['Preço Booking'] || 0);
            const priceOnDelivery = parseFloat(caixaRecord.priceOnDelivery || caixaRecord['Price on Delivery'] || caixaRecord['Preço na Entrega'] || 0);
            
            const normalizedPlate = normalizeLicensePlate(licensePlate);
            const validatedRecord = validatedMap.get(normalizedPlate);
            
            // Criar objeto de entrega processado
            const processedDelivery = {
                licensePlate: licensePlate,
                driver: driver,
                paymentMethod: paymentMethod,
                bookingPrice: bookingPrice,
                priceOnDelivery: priceOnDelivery,
                priceDifference: priceOnDelivery - bookingPrice,
                campaign: caixaRecord.campaign || caixaRecord['Campaign'] || caixaRecord['Campanha'] || '',
                validatedRecord: validatedRecord,
                inconsistencyType: null,
                status: 'pending'
            };
            
            // Determinar inconsistências e status
            const inconsistency = determineInconsistency(processedDelivery, validatedRecord);
            
            if (inconsistency) {
                processedDelivery.inconsistencyType = inconsistency.type;
                processedDelivery.status = inconsistency.permanent ? 'permanent_inconsistency' : 'inconsistent';
                processedDelivery.inconsistencyDescription = inconsistency.description;
            } else {
                processedDelivery.status = 'valid';
            }
            
            // Classificar entrega
            if (processedDelivery.status === 'valid') {
                validatedDeliveries.push(processedDelivery);
            } else {
                pendingDeliveries.push(processedDelivery);
            }
        });
        
        console.log("Entregas processadas:", {
            validated: validatedDeliveries.length,
            pending: pendingDeliveries.length
        });
    }
    
    // Função para determinar inconsistências
    function determineInconsistency(delivery, validatedRecord) {
        const paymentMethod = delivery.paymentMethod.toLowerCase();
        
        // Verificar pagamento "no pay"
        if (paymentMethod === 'no pay') {
            if (validatedRecord && validatedRecord.boRecord) {
                // Verificar se campaignPay é false
                const campaignPay = validatedRecord.boRecord.campaignPay || validatedRecord.boRecord['Campaign Pay'];
                const hasCampaignPayFalse = campaignPay && campaignPay.toString().toLowerCase() === 'false';
                
                // Verificar se as campanhas coincidem
                const validatedCampaign = (validatedRecord.boRecord.campaign || validatedRecord.boRecord['Campaign'] || '').toLowerCase();
                const deliveryCampaign = (delivery.campaign || '').toLowerCase();
                const campaignMatch = validatedCampaign === deliveryCampaign;
                
                if (!campaignMatch) {
                    return {
                        type: 'cliente_campanha_diferente',
                        permanent: true,
                        description: `Campanha no BO (${validatedCampaign}) diferente da campanha na caixa (${deliveryCampaign})`
                    };
                }
                
                if (!hasCampaignPayFalse) {
                    return {
                        type: 'cliente_no_pay_sem_campaignpay_false',
                        permanent: true,
                        description: 'Cliente pagou "No Pay" mas campaignPay não está marcado como false no BO'
                    };
                }
            } else {
                return {
                    type: 'no_validated_record',
                    permanent: false,
                    description: 'Não foi encontrado registro validado correspondente'
                };
            }
        }
        
        // Verificar pagamento "online"
        if (paymentMethod === 'online') {
            if (validatedRecord && validatedRecord.boRecord) {
                const hasOnlinePayment = validatedRecord.boRecord.hasOnlinePayment || validatedRecord.boRecord['Has Online Payment'];
                const hasOnlinePaymentTrue = hasOnlinePayment && hasOnlinePayment.toString().toLowerCase() === 'true';
                
                if (!hasOnlinePaymentTrue) {
                    return {
                        type: 'cliente_online_sem_hasonlinepayment_true',
                        permanent: true,
                        description: 'Cliente pagou Online mas hasOnlinePayment não está marcado como true no BO'
                    };
                }
            } else {
                return {
                    type: 'no_validated_record',
                    permanent: false,
                    description: 'Não foi encontrado registro validado correspondente'
                };
            }
        }
        
        // Verificar diferenças de preço significativas
        const priceDifference = Math.abs(delivery.priceDifference);
        if (priceDifference > 0.01) { // Diferença maior que 1 cêntimo
            return {
                type: 'price_difference',
                permanent: false,
                description: `Diferença de preço: ${delivery.priceDifference.toFixed(2)}€`
            };
        }
        
        return null; // Sem inconsistências
    }
    
    // Função para mostrar entregas de um condutor específico
    function showDriverDeliveries(driverName) {
        if (!driverName) {
            if (driverDeliveries) {
                driverDeliveries.classList.add('hidden');
            }
            return;
        }
        
        // Filtrar entregas do condutor
        const allDeliveries = [...validatedDeliveries, ...pendingDeliveries];
        currentDriverDeliveries = allDeliveries.filter(delivery => 
            delivery.driver.toLowerCase() === driverName.toLowerCase()
        );
        
        console.log(`Entregas do condutor ${driverName}:`, currentDriverDeliveries.length);
        
        // Atualizar contador
        if (deliveryCountElement) {
            deliveryCountElement.textContent = currentDriverDeliveries.length;
        }
        
        // Renderizar tabela
        renderDeliveriesTable(currentDriverDeliveries);
        
        // Mostrar seção de entregas
        if (driverDeliveries) {
            driverDeliveries.classList.remove('hidden');
        }
    }
    
    // Função para renderizar tabela de entregas
    function renderDeliveriesTable(deliveries) {
        if (!deliveriesTableBody) {
            console.error('Tabela de entregas não encontrada');
            return;
        }
        
        // Limpar tabela
        deliveriesTableBody.innerHTML = '';
        
        if (deliveries.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" class="text-center">Nenhuma entrega encontrada para este condutor.</td>';
            deliveriesTableBody.appendChild(row);
            return;
        }
        
        // Adicionar cada entrega à tabela
        deliveries.forEach(delivery => {
            const row = document.createElement('tr');
            
            // Adicionar classe de status
            if (delivery.status === 'permanent_inconsistency') {
                row.classList.add('status-error');
            } else if (delivery.status === 'inconsistent' || delivery.status === 'pending') {
                row.classList.add('status-warning');
            } else {
                row.classList.add('status-success');
            }
            
            // Criar células
            row.innerHTML = `
                <td>${delivery.validatedRecord ? (delivery.validatedRecord.alocation || 'N/A') : 'N/A'}</td>
                <td>${delivery.licensePlate}</td>
                <td>${formatDate(new Date())}</td>
                <td>${formatPaymentMethod(delivery.paymentMethod)}</td>
                <td>${formatPrice(delivery.priceOnDelivery)}</td>
                <td>${getDeliveryStatusText(delivery.status)}</td>
                <td>
                    <button class="btn btn-secondary btn-sm view-delivery-details" data-license="${delivery.licensePlate}" style="margin-right: 5px;">Detalhes</button>
                    ${delivery.status !== 'valid' ? `<button class="btn btn-primary btn-sm validate-delivery" data-license="${delivery.licensePlate}">Validar</button>` : ''}
                </td>
            `;
            
            deliveriesTableBody.appendChild(row);
        });
        
        // Adicionar eventos aos botões
        addDeliveryTableEvents();
    }
    
    // Função para adicionar eventos aos botões da tabela de entregas
    function addDeliveryTableEvents() {
        // Botões de detalhes
        document.querySelectorAll('.view-delivery-details').forEach(button => {
            button.addEventListener('click', function() {
                const licensePlate = this.getAttribute('data-license');
                showDeliveryDetailsModal(licensePlate);
            });
        });
        
        // Botões de validação
        document.querySelectorAll('.validate-delivery').forEach(button => {
            button.addEventListener('click', function() {
                const licensePlate = this.getAttribute('data-license');
                showValidateDeliveryModal(licensePlate);
            });
        });
    }
    
    // Função para mostrar modal de detalhes da entrega
    function showDeliveryDetailsModal(licensePlate) {
        const delivery = currentDriverDeliveries.find(d => 
            normalizeLicensePlate(d.licensePlate) === normalizeLicensePlate(licensePlate)
        );
        
        if (!delivery) {
            console.error('Entrega não encontrada:', licensePlate);
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
        content.innerHTML = `
            <h4>Detalhes da Entrega - ${delivery.licensePlate}</h4>
            
            <div style="margin: 15px 0;">
                <h5>Informações da Caixa</h5>
                <table class="table">
                    <tr><th>Condutor</th><td>${delivery.driver}</td></tr>
                    <tr><th>Método de Pagamento</th><td>${formatPaymentMethod(delivery.paymentMethod)}</td></tr>
                    <tr><th>Preço Booking</th><td>${formatPrice(delivery.bookingPrice)}</td></tr>
                    <tr><th>Preço na Entrega</th><td>${formatPrice(delivery.priceOnDelivery)}</td></tr>
                    <tr><th>Diferença</th><td>${formatPrice(delivery.priceDifference)}</td></tr>
                    <tr><th>Campanha</th><td>${delivery.campaign || 'N/A'}</td></tr>
                    <tr><th>Status</th><td>${getDeliveryStatusText(delivery.status)}</td></tr>
                </table>
            </div>
            
            ${delivery.inconsistencyDescription ? `
                <div style="margin: 15px 0;">
                    <h5>Inconsistência</h5>
                    <p>${delivery.inconsistencyDescription}</p>
                </div>
            ` : ''}
        `;
        
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
    
    // Função para mostrar modal de validação de entrega
    function showValidateDeliveryModal(licensePlate) {
        const delivery = currentDriverDeliveries.find(d => 
            normalizeLicensePlate(d.licensePlate) === normalizeLicensePlate(licensePlate)
        );
        
        if (!delivery) {
            console.error('Entrega não encontrada:', licensePlate);
            return;
        }
        
        const modalBody = document.getElementById('edit-modal-body');
        if (!modalBody) {
            console.error('Modal de edição não encontrado');
            return;
        }
        
        modalBody.innerHTML = '';
        
        // Criar formulário de validação
        const form = document.createElement('form');
        form.id = 'validate-delivery-form';
        
        // Título e informações gerais
        form.innerHTML = `
            <h4>Validar Entrega - ${delivery.licensePlate}</h4>
            
            <div style="margin: 15px 0;">
                <h5>Informações da Entrega</h5>
                <table class="table">
                    <tr><th>Condutor</th><td>${delivery.driver}</td></tr>
                    <tr><th>Método de Pagamento</th><td>
                        <select id="payment-method" class="form-control">
                            <option value="cash" ${delivery.paymentMethod === 'cash' ? 'selected' : ''}>Numerário</option>
                            <option value="multibanco" ${delivery.paymentMethod === 'multibanco' ? 'selected' : ''}>Multibanco</option>
                            <option value="online" ${delivery.paymentMethod === 'online' ? 'selected' : ''}>Online</option>
                            <option value="no pay" ${delivery.paymentMethod === 'no pay' ? 'selected' : ''}>No Pay</option>
                        </select>
                    </td></tr>
                    <tr><th>Preço Booking</th><td>${formatPrice(delivery.bookingPrice)}</td></tr>
                    <tr><th>Preço na Entrega</th><td>
                        <input type="number" id="price-on-delivery" class="form-control" value="${delivery.priceOnDelivery}" step="0.01" min="0">
                    </td></tr>
                    <tr><th>Campanha</th><td>
                        <input type="text" id="campaign" class="form-control" value="${delivery.campaign || ''}">
                    </td></tr>
                </table>
            </div>
            
            ${delivery.inconsistencyDescription ? `
                <div style="margin: 15px 0;">
                    <h5>Inconsistência</h5>
                    <p>${delivery.inconsistencyDescription}</p>
                </div>
            ` : ''}
            
            <div class="form-group">
                <label for="validation-notes">Notas de validação:</label>
                <textarea id="validation-notes" class="form-control" rows="3"></textarea>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-primary" id="confirm-validation">Confirmar</button>
                <button type="button" class="btn btn-secondary close-modal">Cancelar</button>
            </div>
        `;
        
        // Adicionar formulário ao modal
        modalBody.appendChild(form);
        
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
            
            // Configurar botão de confirmar
            const confirmBtn = modalOverlay.querySelector('#confirm-validation');
            if (confirmBtn) {
                confirmBtn.onclick = function() {
                    handleDeliveryValidation(delivery);
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
    
    // Função para processar validação de entrega
    function handleDeliveryValidation(delivery) {
        const paymentMethod = document.getElementById('payment-method').value;
        const priceOnDelivery = parseFloat(document.getElementById('price-on-delivery').value);
        const campaign = document.getElementById('campaign').value;
        const notes = document.getElementById('validation-notes').value;
        
        // Atualizar entrega
        delivery.paymentMethod = paymentMethod;
        delivery.priceOnDelivery = priceOnDelivery;
        delivery.priceDifference = priceOnDelivery - delivery.bookingPrice;
        delivery.campaign = campaign;
        delivery.validationNotes = notes;
        
        // Verificar inconsistências novamente
        const inconsistency = determineInconsistency(delivery, delivery.validatedRecord);
        
        if (inconsistency && inconsistency.permanent) {
            // Inconsistência permanente, não pode ser resolvida
            delivery.inconsistencyType = inconsistency.type;
            delivery.status = 'permanent_inconsistency';
            delivery.inconsistencyDescription = inconsistency.description;
            
            if (window.appUtils) {
                window.appUtils.showWarning('Esta entrega tem uma inconsistência permanente que não pode ser resolvida automaticamente.');
            }
        } else {
            // Marcar como válida
            delivery.status = 'valid';
            delivery.inconsistencyType = null;
            delivery.inconsistencyDescription = null;
            
            // Mover para entregas validadas
            const pendingIndex = pendingDeliveries.findIndex(d => 
                normalizeLicensePlate(d.licensePlate) === normalizeLicensePlate(delivery.licensePlate)
            );
            
            if (pendingIndex !== -1) {
                pendingDeliveries.splice(pendingIndex, 1);
                validatedDeliveries.push(delivery);
            }
            
            if (window.appUtils) {
                window.appUtils.showSuccess('Entrega validada com sucesso!');
            }
        }
        
        // Fechar modal
        const modalOverlay = document.getElementById('edit-modal-overlay');
        if (modalOverlay) {
            modalOverlay.style.display = 'none';
        }
        
        // Atualizar tabela
        renderDeliveriesTable(currentDriverDeliveries);
    }
    
    // Função para configurar eventos do validador
    function setupValidatorEvents() {
        // Evento para select de condutor
        if (driverSelect) {
            driverSelect.addEventListener('change', function() {
                const selectedDriver = this.value;
                showDriverDeliveries(selectedDriver);
            });
        }
        
        // Evento para botão de encerrar caixa
        if (closeCaixaBtn) {
            closeCaixaBtn.addEventListener('click', function() {
                handleCloseCaixa();
            });
        }
    }
    
    // Função para encerrar caixa
    function handleCloseCaixa() {
        // Verificar se há entregas pendentes
        if (pendingDeliveries.length > 0) {
            if (window.appUtils) {
                window.appUtils.showWarning(`Ainda existem ${pendingDeliveries.length} entregas não validadas. Tem certeza que deseja encerrar a caixa?`);
            }
            
            // Mostrar confirmação
            if (!confirm(`Ainda existem ${pendingDeliveries.length} entregas não validadas. Tem certeza que deseja encerrar a caixa?`)) {
                return;
            }
        }
        
        // Preparar dados para exportação
        const exportData = {
            validatedDeliveries: validatedDeliveries,
            pendingDeliveries: pendingDeliveries,
            allDeliveries: [...validatedDeliveries, ...pendingDeliveries],
            summary: {
                total: validatedDeliveries.length + pendingDeliveries.length,
                validated: validatedDeliveries.length,
                pending: pendingDeliveries.length
            }
        };
        
        console.log('Encerrando caixa:', exportData);
        
        // Exportar para Supabase se disponível
        if (window.supabaseUtils && window.fileProcessor) {
            const batchId = window.fileProcessor.getCurrentBatchId();
            if (batchId) {
                window.supabaseUtils.importCashRecords(exportData.allDeliveries, batchId)
                    .then(result => {
                        console.log(`${result.count} registros de caixa exportados para o Supabase`);
                        if (window.appUtils) {
                            window.appUtils.showSuccess(`Caixa encerrada com sucesso! ${result.count} registros exportados para o Supabase.`);
                        }
                    })
                    .catch(error => {
                        console.error('Erro ao exportar para o Supabase:', error);
                        if (window.appUtils) {
                            window.appUtils.showError('Erro ao exportar para o Supabase. Verifique o console para mais detalhes.');
                        }
                    });
            }
        }
        
        // Mudar para aba de dashboard
        const dashboardTab = document.querySelector('.nav-tab[data-tab="dashboard"]');
        if (dashboardTab) {
            dashboardTab.click();
        }
        
        // Exportar dados para uso global
        window.validatorData = exportData;
        
        // Disparar evento de caixa encerrada
        const event = new CustomEvent('caixaEncerrada', { detail: exportData });
        document.dispatchEvent(event);
    }
    
    // Função para normalizar matrícula
    function normalizeLicensePlate(plate) {
        if (!plate) return '';
        return String(plate).replace(/[\s\-\.\,\/\\\(\)\[\]\{\}\+\*\?\^\$\|]/g, '').toLowerCase();
    }
    
    // Função para formatar preço
    function formatPrice(price) {
        if (price === null || price === undefined || isNaN(price)) {
            return 'N/A';
        }
        
        return parseFloat(price).toFixed(2) + ' €';
    }
    
    // Função para formatar data
    function formatDate(date) {
        if (!date) return 'N/A';
        
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        if (!(date instanceof Date) || isNaN(date)) {
            return 'N/A';
        }
        
        return date.toLocaleDateString('pt-PT') + ' ' + date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    }
    
    // Função para formatar método de pagamento
    function formatPaymentMethod(method) {
        if (!method) return 'N/A';
        
        const methodMap = {
            'cash': 'Numerário',
            'multibanco': 'Multibanco',
            'online': 'Online',
            'no pay': 'No Pay'
        };
        
        return methodMap[method.toLowerCase()] || method;
    }
    
    // Função para obter texto de status da entrega
    function getDeliveryStatusText(status) {
        switch (status) {
            case 'valid':
                return '<span class="status-success">Válida</span>';
            case 'inconsistent':
                return '<span class="status-warning">Inconsistente</span>';
            case 'permanent_inconsistency':
                return '<span class="status-error">Inconsistência Permanente</span>';
            case 'pending':
                return '<span class="status-warning">Pendente</span>';
            default:
                return status;
        }
    }
    
    // Exportar funções para uso global
    window.validator = {
        initCaixaValidation: initCaixaValidation,
        getValidatedDeliveries: () => validatedDeliveries,
        getPendingDeliveries: () => pendingDeliveries,
        getAllDeliveries: () => [...validatedDeliveries, ...pendingDeliveries],
        getDrivers: () => drivers,
        resetValidation: () => {
            validatedDeliveries = [];
            pendingDeliveries = [];
            currentDriverDeliveries = [];
            drivers = [];
            allCaixaData = [];
            
            if (driverSelection) driverSelection.classList.add('hidden');
            if (driverDeliveries) driverDeliveries.classList.add('hidden');
            if (addCaixaBtn) addCaixaBtn.classList.add('hidden');
            if (closeCaixaBtn) closeCaixaBtn.classList.add('hidden');
            
            if (driverSelect) driverSelect.innerHTML = '<option value="">Selecione um condutor</option>';
            if (deliveriesTableBody) deliveriesTableBody.innerHTML = '';
            if (deliveryCountElement) deliveryCountElement.textContent = '0';
        }
    };
    
    console.log('validator.js carregado com sucesso');
});
