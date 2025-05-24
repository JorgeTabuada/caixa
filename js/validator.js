// Validador de Caixa com integração Supabase
import { getCashRecords, getComparisonResults, saveValidationResults } from './supabase.js';

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
    async function initCaixaValidation(cashData) {
        console.log("Iniciando validação de caixa com dados:", cashData);
        
        if (!cashData || cashData.length === 0) {
            alert('Nenhum dado de caixa disponível. Por favor, importe o arquivo de caixa.');
            return;
        }
        
        try {
            // Obter dados validados da comparação do Supabase
            const batchId = window.fileProcessor.getCurrentBatchId();
            if (!batchId) {
                console.error('Nenhum lote de importação disponível');
                return;
            }
            
            // Obter resultados da comparação
            const comparisonResults = await getComparisonResults();
            
            if (!comparisonResults || comparisonResults.length === 0) {
                console.warn("Dados de comparação não disponíveis. A validação pode ser limitada.");
            }
            
            // Obter dados de caixa do Supabase
            const cashRecords = await getCashRecords(batchId);
            
            if (!cashRecords || cashRecords.length === 0) {
                alert('Nenhum dado de caixa disponível no Supabase. Por favor, importe o arquivo de caixa.');
                return;
            }
            
            // Extrair condutores únicos
            drivers = [...new Set(cashRecords.map(item => item.driver).filter(Boolean))];
            console.log("Condutores encontrados:", drivers);
            
            // Preencher select de condutores
            populateDriverSelect(drivers);
            
            // Mostrar seção de seleção de condutor
            driverSelection.classList.remove('hidden');
            
            // Processar entregas
            processDeliveries(cashRecords, comparisonResults);
            
            // Mostrar botões
            addCaixaBtn.classList.remove('hidden');
            closeCaixaBtn.classList.remove('hidden');
        } catch (error) {
            console.error('Erro ao iniciar validação de caixa:', error);
            alert('Erro ao iniciar validação de caixa. Verifique o console para mais detalhes.');
        }
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
    
    // Função para determinar inconsistências permanentes
    function getPermanentInconsistency(delivery, validatedRecord) {
        // Verificar pagamento "no pay"
        if (delivery.payment_method && delivery.payment_method.toLowerCase() === 'no pay') {
            // Verificar se campaignPay é false
            const hasCampaignPayFalse = validatedRecord && validatedRecord.delivery && 
                                      validatedRecord.delivery.campaign_pay === false;
            
            // Verificar se os valores de campanha são iguais nos dois lados
            const campaignMatch = validatedRecord && validatedRecord.delivery && 
                                validatedRecord.delivery.campaign && 
                                delivery.campaign &&
                                validatedRecord.delivery.campaign.toLowerCase() === delivery.campaign.toLowerCase();
            
            if (!campaignMatch && validatedRecord && validatedRecord.delivery) {
                return 'cliente_campanha_diferente';
            }
            
            if (!hasCampaignPayFalse) {
                return 'cliente_no_pay_sem_campaignpay_false';
            }
        }
        
        // Verificar pagamento "online"
        if (delivery.payment_method && delivery.payment_method.toLowerCase() === 'online') {
            // Verificar se hasOnlinePayment é true
            const hasOnlinePaymentTrue = validatedRecord && validatedRecord.delivery && 
                                       validatedRecord.delivery.has_online_payment === true;
            
            if (!hasOnlinePaymentTrue) {
                return 'cliente_online_sem_hasonlinepayment_true';
            }
        }
        
        return null;
    }
    
    // Função para processar entregas
    function processDeliveries(cashRecords, comparisonResults) {
        // Limpar dados anteriores
        validatedDeliveries = [];
        pendingDeliveries = [];
        
        // Criar mapa de registros de comparação por matrícula
        const comparisonMap = new Map();
        comparisonResults.forEach(record => {
            if (record.license_plate) {
                const normalizedPlate = String(record.license_plate).replace(/[\s\-\.\,\/\\\(\)\[\]\{\}\+\*\?\^\$\|]/g, '').toLowerCase();
                comparisonMap.set(normalizedPlate, record);
            }
        });
        
        // Processar cada registro de caixa
        cashRecords.forEach(cashRecord => {
            if (!cashRecord.license_plate) return;
            
            const licensePlate = cashRecord.license_plate;
            const normalizedPlate = String(licensePlate).replace(/[\s\-\.\,\/\\\(\)\[\]\{\}\+\*\?\^\$\|]/g, '').toLowerCase();
            const comparisonRecord = comparisonMap.get(normalizedPlate);
            
            // Verificar inconsistências permanentes
            const permanentInconsistency = getPermanentInconsistency(cashRecord, comparisonRecord);
            
            // Criar registro de entrega
            const deliveryRecord = {
                id: cashRecord.id,
                licensePlate: licensePlate,
                driver: cashRecord.driver || 'N/A',
                paymentMethod: cashRecord.payment_method || 'N/A',
                bookingPrice: cashRecord.booking_price || 0,
                priceOnDelivery: cashRecord.price_on_delivery || 0,
                priceDifference: (cashRecord.price_on_delivery || 0) - (cashRecord.booking_price || 0),
                campaign: cashRecord.campaign || 'N/A',
                status: permanentInconsistency ? 'permanent_inconsistency' : 'pending',
                inconsistencyType: permanentInconsistency,
                cashRecord: cashRecord,
                comparisonRecord: comparisonRecord,
                resolution: null
            };
            
            // Adicionar à lista apropriada
            if (permanentInconsistency) {
                validatedDeliveries.push(deliveryRecord);
            } else {
                pendingDeliveries.push(deliveryRecord);
            }
        });
        
        console.log('Entregas processadas:', {
            validatedDeliveries: validatedDeliveries.length,
            pendingDeliveries: pendingDeliveries.length
        });
    }
    
    // Evento de seleção de condutor
    driverSelect.addEventListener('change', function() {
        const selectedDriver = this.value;
        
        if (!selectedDriver) {
            driverDeliveries.classList.add('hidden');
            return;
        }
        
        // Filtrar entregas pendentes por condutor
        currentDriverDeliveries = pendingDeliveries.filter(delivery => 
            delivery.driver.toLowerCase() === selectedDriver.toLowerCase()
        );
        
        // Atualizar contador
        deliveryCountElement.textContent = currentDriverDeliveries.length;
        
        // Renderizar tabela
        renderDeliveriesTable(currentDriverDeliveries);
        
        // Mostrar seção de entregas
        driverDeliveries.classList.remove('hidden');
    });
    
    // Função para renderizar tabela de entregas
    function renderDeliveriesTable(deliveries) {
        // Limpar tabela
        deliveriesTable.innerHTML = '';
        
        if (deliveries.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" class="text-center">Nenhuma entrega encontrada para este condutor.</td>';
            deliveriesTable.appendChild(row);
            return;
        }
        
        // Adicionar cada entrega à tabela
        deliveries.forEach(delivery => {
            const row = document.createElement('tr');
            
            // Criar células
            row.innerHTML = `
                <td>${delivery.licensePlate}</td>
                <td>${delivery.paymentMethod}</td>
                <td>${delivery.bookingPrice} €</td>
                <td>${delivery.priceOnDelivery} €</td>
                <td>${delivery.priceDifference} €</td>
                <td>${delivery.campaign}</td>
                <td>
                    <button class="btn btn-primary btn-sm validate-delivery" data-id="${delivery.id}">Validar</button>
                </td>
            `;
            
            deliveriesTable.appendChild(row);
        });
        
        // Adicionar eventos aos botões
        addValidateButtonEvents();
    }
    
    // Função para adicionar eventos aos botões de validação
    function addValidateButtonEvents() {
        document.querySelectorAll('.validate-delivery').forEach(button => {
            button.addEventListener('click', function() {
                const deliveryId = this.getAttribute('data-id');
                const delivery = currentDriverDeliveries.find(d => d.id === deliveryId);
                if (delivery) {
                    showValidateModal(delivery);
                }
            });
        });
    }
    
    // Função para mostrar modal de validação
    function showValidateModal(delivery) {
        const modalBody = document.getElementById('validate-modal-body');
        modalBody.innerHTML = '';
        
        // Criar formulário de validação
        const form = document.createElement('form');
        form.id = 'validate-form';
        
        // Adicionar campos
        form.innerHTML = `
            <p>Validar entrega com matrícula <strong>${delivery.licensePlate}</strong>:</p>
            
            <div class="form-group">
                <label for="payment-method" class="form-label">Método de Pagamento:</label>
                <select id="payment-method" class="form-control">
                    <option value="cash" ${delivery.paymentMethod.toLowerCase() === 'cash' ? 'selected' : ''}>Cash</option>
                    <option value="card" ${delivery.paymentMethod.toLowerCase() === 'card' ? 'selected' : ''}>Cartão</option>
                    <option value="online" ${delivery.paymentMethod.toLowerCase() === 'online' ? 'selected' : ''}>Online</option>
                    <option value="no pay" ${delivery.paymentMethod.toLowerCase() === 'no pay' ? 'selected' : ''}>No Pay</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="price-on-delivery" class="form-label">Preço na Entrega:</label>
                <input type="number" id="price-on-delivery" class="form-control" value="${delivery.priceOnDelivery}" step="0.01">
            </div>
            
            <div class="form-group">
                <label for="validation-notes" class="form-label">Notas:</label>
                <textarea id="validation-notes" class="form-control" rows="3"></textarea>
            </div>
            
            <div class="form-actions">
                <button type="button" id="cancel-validate" class="btn btn-secondary">Cancelar</button>
                <button type="button" id="submit-validate" class="btn btn-primary">Validar</button>
            </div>
        `;
        
        modalBody.appendChild(form);
        
        // Mostrar modal
        document.getElementById('validate-modal-overlay').style.display = 'flex';
        
        // Adicionar eventos aos botões
        document.getElementById('cancel-validate').addEventListener('click', function() {
            document.getElementById('validate-modal-overlay').style.display = 'none';
        });
        
        document.getElementById('submit-validate').addEventListener('click', function() {
            validateDelivery(delivery);
        });
    }
    
    // Função para validar entrega
    async function validateDelivery(delivery) {
        try {
            const paymentMethod = document.getElementById('payment-method').value;
            const priceOnDelivery = parseFloat(document.getElementById('price-on-delivery').value);
            const notes = document.getElementById('validation-notes').value;
            
            // Verificar se houve alterações
            const hasChanges = paymentMethod !== delivery.paymentMethod || priceOnDelivery !== delivery.priceOnDelivery;
            
            // Atualizar dados da entrega
            delivery.originalPaymentMethod = delivery.paymentMethod;
            delivery.correctedPaymentMethod = paymentMethod;
            delivery.originalPrice = delivery.priceOnDelivery;
            delivery.correctedPrice = priceOnDelivery;
            delivery.paymentMethod = paymentMethod;
            delivery.priceOnDelivery = priceOnDelivery;
            delivery.priceDifference = priceOnDelivery - delivery.bookingPrice;
            delivery.notes = notes;
            delivery.status = hasChanges ? 'corrected' : 'validated';
            delivery.resolution = 'validated';
            
            // Verificar inconsistências permanentes após correção
            const permanentInconsistency = getPermanentInconsistency(
                { ...delivery.cashRecord, payment_method: paymentMethod },
                delivery.comparisonRecord
            );
            
            if (permanentInconsistency) {
                delivery.status = 'permanent_inconsistency';
                delivery.inconsistencyType = permanentInconsistency;
            }
            
            // Remover da lista de entregas pendentes
            const index = pendingDeliveries.findIndex(d => d.id === delivery.id);
            if (index !== -1) {
                pendingDeliveries.splice(index, 1);
            }
            
            // Remover da lista de entregas do condutor atual
            const driverIndex = currentDriverDeliveries.findIndex(d => d.id === delivery.id);
            if (driverIndex !== -1) {
                currentDriverDeliveries.splice(driverIndex, 1);
            }
            
            // Adicionar à lista de entregas validadas
            validatedDeliveries.push(delivery);
            
            // Atualizar tabela
            renderDeliveriesTable(currentDriverDeliveries);
            
            // Atualizar contador
            deliveryCountElement.textContent = currentDriverDeliveries.length;
            
            // Fechar modal
            document.getElementById('validate-modal-overlay').style.display = 'none';
            
            // Salvar resultados da validação no Supabase
            const batchId = window.fileProcessor.getCurrentBatchId();
            if (batchId) {
                const validationResult = {
                    licensePlate: delivery.licensePlate,
                    status: delivery.status,
                    inconsistencyType: delivery.inconsistencyType,
                    originalPaymentMethod: delivery.originalPaymentMethod,
                    correctedPaymentMethod: delivery.correctedPaymentMethod,
                    originalPrice: delivery.originalPrice,
                    correctedPrice: delivery.correctedPrice,
                    notes: delivery.notes
                };
                
                try {
                    await saveValidationResults([validationResult], batchId);
                    console.log('Resultado da validação salvo no Supabase');
                } catch (error) {
                    console.error('Erro ao salvar resultado da validação:', error);
                }
            }
        } catch (error) {
            console.error('Erro ao validar entrega:', error);
            alert('Erro ao validar entrega. Verifique o console para mais detalhes.');
        }
    }
    
    // Botão de adicionar caixa
    addCaixaBtn.addEventListener('click', function() {
        // Navegar para a aba de importação
        document.querySelector('.nav-tab[data-tab="import"]').click();
    });
    
    // Botão de fechar caixa
    closeCaixaBtn.addEventListener('click', async function() {
        try {
            // Verificar se há entregas pendentes
            if (pendingDeliveries.length > 0) {
                if (!confirm(`Ainda há ${pendingDeliveries.length} entregas pendentes. Deseja fechar a caixa mesmo assim?`)) {
                    return;
                }
            }
            
            // Navegar para a aba de exportação
            document.querySelector('.nav-tab[data-tab="export"]').click();
            
            // Iniciar exportação
            if (window.exporter && typeof window.exporter.initExport === 'function') {
                window.exporter.initExport(validatedDeliveries, pendingDeliveries);
            }
        } catch (error) {
            console.error('Erro ao fechar caixa:', error);
            alert('Erro ao fechar caixa. Verifique o console para mais detalhes.');
        }
    });
    
    // Eventos de fechamento de modais
    document.querySelectorAll('.modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal-overlay').style.display = 'none';
        });
    });
    
    // Expor funções e variáveis para uso externo
    window.validator = {
        initCaixaValidation: initCaixaValidation,
        getValidatedDeliveries: () => validatedDeliveries,
        getPendingDeliveries: () => pendingDeliveries
    };
});
