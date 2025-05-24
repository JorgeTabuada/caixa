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
    
    // Função para determinar inconsistências permanentes
    function getPermanentInconsistency(delivery, validatedRecord) {
        // Verificar pagamento "no pay"
        if (delivery.paymentMethod && delivery.paymentMethod.toLowerCase() === 'no pay') {
            // Verificar se campaignPay é false
            const hasCampaignPayFalse = validatedRecord && validatedRecord.boRecord && 
                                      validatedRecord.boRecord.campaignPay && 
                                      validatedRecord.boRecord.campaignPay.toString().toLowerCase() === 'false';
            
            // Verificar se os valores de campanha são iguais nos dois lados
            const campaignMatch = validatedRecord && validatedRecord.boRecord && 
                                validatedRecord.boRecord.campaign && 
                                delivery.campaign &&
                                validatedRecord.boRecord.campaign.toLowerCase() === delivery.campaign.toLowerCase();
            
            if (!campaignMatch && validatedRecord && validatedRecord.boRecord) {
                return 'cliente_campanha_diferente';
            }
            
            if (!hasCampaignPayFalse) {
                return 'cliente_no_pay_sem_campaignpay_false';
            }
        }
        
        // Verificar pagamento "online"
        if (delivery.paymentMethod && delivery.paymentMethod.toLowerCase() === 'online') {
            // Verificar se hasOnlinePayment é true
            const hasOnlinePaymentTrue = validatedRecord && validatedRecord.boRecord && 
                                       validatedRecord.boRecord.hasOnlinePayment && 
                                       validatedRecord.boRecord.hasOnlinePayment.toString().toLowerCase() === 'true';
            
            if (!hasOnlinePaymentTrue) {
                return 'cliente_online_sem_hasonlinepayment_true';
            }
        }
        
        return null;
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
                
                // Verificar se o modo de pagamento "no pay" tem campaignPay = false e campanha igual
                if (delivery.paymentMethod && delivery.paymentMethod.toLowerCase() === 'no pay') {
                    // Verificar se os valores de campanha são iguais nos dois lados
                    const campaignMatch = validatedRecord.boRecord && 
                                        validatedRecord.boRecord.campaign && 
                                        delivery.campaign &&
                                        validatedRecord.boRecord.campaign.toLowerCase() === delivery.campaign.toLowerCase();
                    
                    const hasCampaignPayFalse = validatedRecord.boRecord && 
                                              validatedRecord.boRecord.campaignPay && 
                                              validatedRecord.boRecord.campaignPay.toString().toLowerCase() === 'false';
                    
                    if (!campaignMatch && validatedRecord.boRecord) {
                        inconsistencies.push('campanha_diferente');
                    }
                    
                    if (!hasCampaignPayFalse) {
                        inconsistencies.push('no_pay_without_campaignpay_false');
                    }
                }
                
                // Verificar se o modo de pagamento "online" tem hasOnlinePayment = true
                if (delivery.paymentMethod && delivery.paymentMethod.toLowerCase() === 'online') {
                    const hasOnlinePaymentTrue = validatedRecord.boRecord && 
                                               validatedRecord.boRecord.hasOnlinePayment && 
                                               validatedRecord.boRecord.hasOnlinePayment.toString().toLowerCase() === 'true';
                    
                    if (!hasOnlinePaymentTrue) {
                        inconsistencies.push('online_without_hasonlinepayment_true');
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
                permanentInconsistency: getPermanentInconsistency(delivery, validatedRecord)
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
        console.log("Adicionando eventos aos botões da tabela");
        
        // Botões de detalhes
        document.querySelectorAll('.view-delivery-details').forEach(button => {
            button.addEventListener('click', function() {
                const alocation = this.getAttribute('data-alocation');
                console.log("Botão de detalhes clicado para alocação:", alocation);
                showDeliveryDetailsModal(alocation);
            });
        });
        
        // Botões de validação
        document.querySelectorAll('.validate-delivery').forEach(button => {
            console.log("Adicionando evento ao botão de validação:", button);
            button.addEventListener('click', function() {
                const alocation = this.getAttribute('data-alocation');
                console.log("Botão de validação clicado para alocação:", alocation);
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
                ${delivery.paymentMethod && delivery.paymentMethod.toLowerCase() === 'online' ? 
                  `<tr><th>Pagamento Online</th><td>${delivery.validatedRecord && delivery.validatedRecord.boRecord && delivery.validatedRecord.boRecord.hasOnlinePayment || 'N/A'}</td></tr>` : ''}
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
                    <tr><th>CampaignPay (BO)</th><td>${delivery.validatedRecord.boRecord && delivery.validatedRecord.boRecord.campaignPay ? delivery.validatedRecord.boRecord.campaignPay : 'N/A'}</td></tr>
                    <tr><th>HasOnlinePayment (BO)</th><td>${delivery.validatedRecord.boRecord && delivery.validatedRecord.boRecord.hasOnlinePayment ? delivery.validatedRecord.boRecord.hasOnlinePayment : 'N/A'}</td></tr>
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
                        } else if (inc === 'no_pay_without_campaignpay_false') {
                            return `<li>Método de Pagamento "no pay" sem campaignPay=false no Back Office</li>`;
                        } else if (inc === 'online_without_hasonlinepayment_true') {
                            return `<li>Método de Pagamento "online" sem hasOnlinePayment=true no Back Office</li>`;
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
        console.log("Abrindo modal de validação para alocação:", alocation);
        const delivery = currentDriverDeliveries.find(d => d.alocation === alocation);
        
        if (!delivery) {
            console.error("Entrega não encontrada para alocação:", alocation);
            return;
        }
        
        const modalOverlay = document.getElementById('validate-modal-overlay');
        const modalBody = document.getElementById('validate-modal-body');
        
        if (!modalOverlay || !modalBody) {
            console.error("Elementos do modal não encontrados:", {modalOverlay, modalBody});
            return;
        }
        
        modalBody.innerHTML = '';
        
        // Criar conteúdo do modal
        const content = document.createElement('div');
        
        // Informações gerais
        content.innerHTML = `
            <h4>Validar Entrega: ${delivery.alocation}</h4>
            <p>Matrícula: ${delivery.licensePlate}</p>
            <p>Método de Pagamento: ${delivery.paymentMethod}</p>
            <p>Valor na Entrega: ${delivery.priceOnDelivery} €</p>
        `;
        
        // Verificar se há inconsistências permanentes
        if (delivery.permanentInconsistency) {
            content.innerHTML += `
                <div class="status-error mt-20">
                    <p><strong>Atenção:</strong> Esta entrega tem uma inconsistência permanente que não pode ser resolvida:</p>
                    <p>${getPermanentInconsistencyText(delivery.permanentInconsistency)}</p>
                    <p>Você ainda pode validar esta entrega, mas a inconsistência será registrada.</p>
                </div>
            `;
        }
        
        // Verificar se há inconsistências
        if (delivery.inconsistencies && delivery.inconsistencies.length > 0) {
            content.innerHTML += `
                <div class="status-warning mt-20">
                    <p><strong>Atenção:</strong> Esta entrega tem inconsistências que precisam ser resolvidas:</p>
                    <ul>
                        ${delivery.inconsistencies.map(inc => {
                            if (inc === 'bookingPriceBO') {
                                return `<li>Preço na Entrega: ${delivery.priceOnDelivery} € (Caixa) vs Preço Booking: ${delivery.validatedRecord.bookingPriceBO} € (BO)</li>`;
                            } else if (inc === 'bookingPriceOdoo') {
                                return `<li>Preço na Entrega: ${delivery.priceOnDelivery} € (Caixa) vs Preço Booking: ${delivery.validatedRecord.bookingPriceOdoo} € (Odoo)</li>`;
                            } else if (inc === 'priceOnDeliveryOdoo') {
                                const priceOnDeliveryOdoo = delivery.validatedRecord.odooRecord ? delivery.validatedRecord.odooRecord.priceOnDelivery : 'N/A';
                                return `<li>Preço na Entrega: ${delivery.priceOnDelivery} € (Caixa) vs Preço na Entrega: ${priceOnDeliveryOdoo} € (Odoo)</li>`;
                            } else if (inc === 'campanha_diferente') {
                                return `<li>Valores de campanha diferentes entre Caixa e Back Office</li>`;
                            } else if (inc === 'no_pay_without_campaignpay_false') {
                                return `<li>Método de Pagamento "no pay" sem campaignPay=false no Back Office</li>`;
                            } else if (inc === 'online_without_hasonlinepayment_true') {
                                return `<li>Método de Pagamento "online" sem hasOnlinePayment=true no Back Office</li>`;
                            } else if (inc === 'missing_record') {
                                return `<li>Registro não encontrado na comparação Odoo vs Back Office</li>`;
                            } else {
                                return `<li>${inc}</li>`;
                            }
                        }).join('')}
                    </ul>
                </div>
            `;
        }
        
        // Formulário de validação
        const form = document.createElement('form');
        form.id = 'validate-delivery-form';
        form.innerHTML = `
            <div class="form-group mt-20">
                <label for="resolution">Resolução:</label>
                <select id="resolution" class="form-control" required>
                    <option value="">Selecione uma resolução</option>
                    <option value="valid">Validar sem correções</option>
                    <option value="corrected">Validar com correções</option>
                    <option value="invalid">Marcar como inválido</option>
                </select>
            </div>
            
            <div id="correction-fields" class="hidden mt-10">
                <div class="form-group">
                    <label for="corrected-price">Valor Corrigido:</label>
                    <input type="number" id="corrected-price" class="form-control" step="0.01" min="0" value="${delivery.priceOnDelivery}">
                </div>
                
                <div class="form-group mt-10">
                    <label for="corrected-payment-method">Método de Pagamento Corrigido:</label>
                    <select id="corrected-payment-method" class="form-control">
                        <option value="${delivery.paymentMethod}" selected>${delivery.paymentMethod}</option>
                        <option value="numerário">numerário</option>
                        <option value="multibanco">multibanco</option>
                        <option value="no pay">no pay</option>
                        <option value="online">online</option>
                    </select>
                </div>
                
                <div class="form-group mt-10">
                    <label for="correction-notes">Notas de Correção:</label>
                    <textarea id="correction-notes" class="form-control" rows="3" placeholder="Descreva as alterações realizadas..."></textarea>
                </div>
            </div>
            
            <div class="form-group mt-20">
                <button type="submit" class="btn btn-primary">Confirmar</button>
                <button type="button" class="btn btn-secondary" id="cancel-validate">Cancelar</button>
            </div>
        `;
        
        content.appendChild(form);
        modalBody.appendChild(content);
        
        // Mostrar modal
        modalOverlay.style.display = 'flex';
        console.log("Modal de validação exibido com sucesso");
        
        // Adicionar eventos ao formulário
        const validateForm = document.getElementById('validate-delivery-form');
        const resolutionSelect = document.getElementById('resolution');
        const correctionFields = document.getElementById('correction-fields');
        const cancelBtn = document.getElementById('cancel-validate');
        
        if (!validateForm || !resolutionSelect || !correctionFields || !cancelBtn) {
            console.error("Elementos do formulário não encontrados:", {validateForm, resolutionSelect, correctionFields, cancelBtn});
            return;
        }
        
        // Evento para mostrar/ocultar campos de correção
        resolutionSelect.addEventListener('change', function() {
            console.log("Resolução selecionada:", this.value);
            if (this.value === 'corrected') {
                correctionFields.classList.remove('hidden');
            } else {
                correctionFields.classList.add('hidden');
            }
        });
        
        // Evento para cancelar validação
        cancelBtn.addEventListener('click', function() {
            console.log("Cancelando validação");
            document.getElementById('validate-modal-overlay').style.display = 'none';
        });
        
        // Evento para submeter formulário
        validateForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log("Formulário de validação submetido");
            
            const resolution = resolutionSelect.value;
            
            if (!resolution) {
                alert('Por favor, selecione uma resolução.');
                return;
            }
            
            // Obter valores de correção se necessário
            let correctedPrice = delivery.priceOnDelivery;
            let correctionNotes = '';
            let correctedPaymentMethod = delivery.paymentMethod;
            
            if (resolution === 'corrected') {
                correctedPrice = parseFloat(document.getElementById('corrected-price').value) || 0;
                correctedPaymentMethod = document.getElementById('corrected-payment-method').value;
                correctionNotes = document.getElementById('correction-notes').value || '';
            }
            
            // Validar entrega
            validateDelivery(delivery, resolution, correctedPrice, correctionNotes, correctedPaymentMethod);
            
            // Fechar modal
            document.getElementById('validate-modal-overlay').style.display = 'none';
        });
    }
    
    // Função para validar entrega
    function validateDelivery(delivery, resolution, correctedPrice, correctionNotes, correctedPaymentMethod) {
        // Guardar valores originais antes de alterar
        if (resolution === 'corrected') {
            delivery.originalPrice = delivery.priceOnDelivery;
            delivery.originalPaymentMethod = delivery.paymentMethod;
            
            // Registrar inconsistências originais
            if (delivery.inconsistencies && delivery.inconsistencies.length > 0) {
                delivery.originalInconsistencies = [...delivery.inconsistencies];
            }
        }
        
        // Atualizar status e resolução
        delivery.status = 'validated';
        delivery.resolution = resolution;
        
        // Atualizar preço e método de pagamento corrigidos se necessário
        if (resolution === 'corrected') {
            // Atualizar preço
            delivery.priceOnDelivery = correctedPrice;
            delivery.correctedPrice = correctedPrice;
            
            // Atualizar método de pagamento
            if (correctedPaymentMethod && correctedPaymentMethod !== delivery.paymentMethod) {
                // Normalizar método de pagamento para minúsculas
                delivery.paymentMethod = correctedPaymentMethod.toLowerCase();
            }
            
            // Guardar notas de correção
            delivery.resolutionNotes = correctionNotes;
            delivery.userNotes = correctionNotes;
            
            // Criar descrição das alterações
            let changesDescription = [];
            
            if (delivery.originalPrice !== correctedPrice) {
                changesDescription.push(`Preço alterado de ${delivery.originalPrice}€ para ${correctedPrice}€`);
            }
            
            if (delivery.originalPaymentMethod !== correctedPaymentMethod && correctedPaymentMethod) {
                changesDescription.push(`Método de pagamento alterado de ${delivery.originalPaymentMethod} para ${correctedPaymentMethod}`);
            }
            
            if (changesDescription.length > 0) {
                delivery.changesDescription = changesDescription.join('; ');
            }
        }
        
        // Remover da lista de entregas pendentes
        const index = currentDriverDeliveries.findIndex(d => d.alocation === delivery.alocation);
        if (index !== -1) {
            currentDriverDeliveries.splice(index, 1);
        }
        
        // Adicionar à lista de entregas validadas
        validatedDeliveries.push(delivery);
        
        // Atualizar tabela
        renderDeliveriesTable(currentDriverDeliveries);
        
        // Atualizar contador
        deliveryCountElement.textContent = currentDriverDeliveries.length;
        
        console.log('Entrega validada:', delivery);
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
            case 'valid':
                return 'Validado sem correções';
            case 'corrected':
                return 'Validado com correções';
            case 'invalid':
                return 'Marcado como inválido';
            default:
                return resolution;
        }
    }
    
    // Função para obter texto de inconsistência permanente
    function getPermanentInconsistencyText(inconsistency) {
        switch (inconsistency) {
            case 'cliente_campanha_diferente':
                return 'Cliente com valores de campanha diferentes entre Caixa e Back Office';
            case 'cliente_no_pay_sem_campaignpay_false':
                return 'Cliente com método de pagamento "no pay" sem campaignPay=false no Back Office';
            case 'cliente_online_sem_hasonlinepayment_true':
                return 'Cliente com método de pagamento "online" sem hasOnlinePayment=true no Back Office';
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
        
        // Habilitar botão de fechar caixa
        closeCaixaBtn.disabled = false;
        closeCaixaBtn.classList.remove('btn-disabled');
        
        console.log("Botão Adicionar clicado, botão Fechar Caixa habilitado");
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
        
        // Exportar automaticamente para Excel
        if (window.exporter && typeof window.exporter.exportToExcel === 'function') {
            // Exportar para Excel
            window.exporter.exportToExcel();
            
            console.log(`Exportação automática realizada`);
        } else {
            console.warn('Funções de exportação não disponíveis');
        }
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
    
    // Evento para fechar modais
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.modal-overlay').style.display = 'none';
        });
    });
    
    // Expor funções para uso externo
    window.validator = {
        initCaixaValidation: initCaixaValidation,
        getValidatedDeliveries: function() {
            return validatedDeliveries;
        },
        getPendingDeliveries: function() {
            return pendingDeliveries;
        }
    };
});
