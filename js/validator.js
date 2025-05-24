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