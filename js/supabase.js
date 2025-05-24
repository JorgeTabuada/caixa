// Configuração e inicialização do cliente Supabase
// Versão adaptada para uso com CDN em ambiente estático

// Constantes de configuração do Supabase
const SUPABASE_URL = 'https://uvcmgzhwiibjcygqsjrm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2Y21nemh3aWliamN5Z3FzanJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNDE3NTUsImV4cCI6MjA2MzYxNzc1NX0.br9Ah2nlwNNfigdLo8uSWgWavZU4wlvWMxDMyClQVoQ';

// Inicializar o cliente Supabase
let supabase;

// Função para inicializar o cliente Supabase
function initSupabase() {
    if (typeof window.supabase !== 'undefined') {
        // Usar o objeto global supabase diretamente
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Cliente Supabase inicializado com sucesso (método global)');
    } else if (typeof supabaseClient !== 'undefined') {
        // Fallback para supabaseClient se disponível
        supabase = supabaseClient.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Cliente Supabase inicializado com sucesso (método cliente)');
    } else if (typeof window.supabaseJs !== 'undefined') {
        // Fallback para supabaseJs se disponível
        supabase = window.supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Cliente Supabase inicializado com sucesso (método JS)');
    } else {
        console.error('Biblioteca Supabase não carregada. Verifique se o script do CDN está incluído.');
    }
}

// Inicializar quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    initSupabase();
});

// Funções para interagir com o Supabase

/**
 * Cria um novo lote de importação
 * @param {Object} batchInfo - Informações sobre o lote de importação
 * @returns {Promise<Object>} - O lote de importação criado
 */
async function createImportBatch(batchInfo) {
    if (!supabase) {
        console.error('Cliente Supabase não inicializado');
        return null;
    }

    const { data, error } = await supabase
        .from('import_batches')
        .insert({
            batch_date: batchInfo.batchDate || new Date().toISOString().split('T')[0],
            sales_filename: batchInfo.salesFilename || null,
            deliveries_filename: batchInfo.deliveriesFilename || null,
            cash_filename: batchInfo.cashFilename || null,
            status: 'pending'
        })
        .select()
        .single();

    if (error) {
        console.error('Erro ao criar lote de importação:', error);
        throw error;
    }

    return data;
}

/**
 * Importa dados de vendas (sales orders) para o Supabase
 * @param {Array} salesData - Dados do ficheiro de vendas
 * @param {string} batchId - ID do lote de importação
 * @returns {Promise<Object>} - Resultado da importação
 */
async function importSalesOrders(salesData, batchId) {
    if (!supabase) {
        console.error('Cliente Supabase não inicializado');
        return { count: 0 };
    }

    if (!salesData || salesData.length === 0) {
        console.warn('Nenhum dado de vendas para importar');
        return { count: 0 };
    }

    // Preparar dados para inserção
    const formattedData = salesData.map(record => ({
        license_plate: record.licensePlate || '',
        booking_price: record.bookingPrice || 0,
        park_brand: record.parkBrand || '',
        share: record.share || 0,
        booking_date: record.bookingDate || null,
        check_in: record.checkIn || null,
        check_out: record.checkOut || null,
        price_on_delivery: record.priceOnDelivery || 0,
        payment_method: record.paymentMethod ? record.paymentMethod.toLowerCase() : '',
        driver: record.driver || '',
        campaign: record.campaign || '',
        campaign_pay: record.campaignPay === 'true' || record.campaignPay === true,
        has_online_payment: record.hasOnlinePayment === 'true' || record.hasOnlinePayment === true,
        original_data: record,
        import_batch_id: batchId
    }));

    // Inserir dados no Supabase
    const { data, error } = await supabase
        .from('sales_orders')
        .insert(formattedData)
        .select('id');

    if (error) {
        console.error('Erro ao importar dados de vendas:', error);
        throw error;
    }

    // Atualizar contagem no lote de importação
    await supabase
        .from('import_batches')
        .update({ sales_count: formattedData.length })
        .eq('id', batchId);

    return { count: data.length };
}

/**
 * Importa dados de entregas para o Supabase
 * @param {Array} deliveriesData - Dados do ficheiro de entregas
 * @param {string} batchId - ID do lote de importação
 * @returns {Promise<Object>} - Resultado da importação
 */
async function importDeliveries(deliveriesData, batchId) {
    if (!supabase) {
        console.error('Cliente Supabase não inicializado');
        return { count: 0 };
    }

    if (!deliveriesData || deliveriesData.length === 0) {
        console.warn('Nenhum dado de entregas para importar');
        return { count: 0 };
    }

    // Preparar dados para inserção
    const formattedData = deliveriesData.map(record => ({
        license_plate: record.licensePlate || '',
        alocation: record.alocation || '',
        booking_price: record.bookingPrice || 0,
        park_brand: record.parkBrand || '',
        campaign: record.campaign || '',
        check_in: record.checkIn || null,
        driver: record.driver || '',
        campaign_pay: record.campaignPay === 'true' || record.campaignPay === true,
        has_online_payment: record.hasOnlinePayment === 'true' || record.hasOnlinePayment === true,
        original_data: record,
        import_batch_id: batchId
    }));

    // Inserir dados no Supabase
    const { data, error } = await supabase
        .from('deliveries')
        .insert(formattedData)
        .select('id');

    if (error) {
        console.error('Erro ao importar dados de entregas:', error);
        throw error;
    }

    // Atualizar contagem no lote de importação
    await supabase
        .from('import_batches')
        .update({ deliveries_count: formattedData.length })
        .eq('id', batchId);

    return { count: data.length };
}

/**
 * Importa dados de caixa para o Supabase
 * @param {Array} cashData - Dados do ficheiro de caixa
 * @param {string} batchId - ID do lote de importação
 * @returns {Promise<Object>} - Resultado da importação
 */
async function importCashRecords(cashData, batchId) {
    if (!supabase) {
        console.error('Cliente Supabase não inicializado');
        return { count: 0 };
    }

    if (!cashData || cashData.length === 0) {
        console.warn('Nenhum dado de caixa para importar');
        return { count: 0 };
    }

    // Preparar dados para inserção
    const formattedData = cashData.map(record => ({
        license_plate: record.licensePlate || '',
        driver: record.condutorEntrega || record.driver || '',
        payment_method: record.paymentMethod ? record.paymentMethod.toLowerCase() : '',
        booking_price: record.bookingPrice || 0,
        price_on_delivery: record.priceOnDelivery || 0,
        price_difference: (record.priceOnDelivery || 0) - (record.bookingPrice || 0),
        campaign: record.campaign || '',
        import_batch_id: batchId
    }));

    // Inserir dados no Supabase
    const { data, error } = await supabase
        .from('cash_records')
        .insert(formattedData)
        .select('id');

    if (error) {
        console.error('Erro ao importar dados de caixa:', error);
        throw error;
    }

    // Atualizar contagem no lote de importação
    await supabase
        .from('import_batches')
        .update({ 
            cash_count: formattedData.length,
            status: 'completed'
        })
        .eq('id', batchId);

    return { count: data.length };
}

/**
 * Salva os resultados da comparação no Supabase
 * @param {Array} comparisonResults - Resultados da comparação
 * @param {string} batchId - ID do lote de importação
 * @returns {Promise<Object>} - Resultado da operação
 */
async function saveComparisonResults(comparisonResults, batchId) {
    if (!supabase) {
        console.error('Cliente Supabase não inicializado');
        return { count: 0 };
    }

    if (!comparisonResults || comparisonResults.length === 0) {
        console.warn('Nenhum resultado de comparação para salvar');
        return { count: 0 };
    }

    // Obter IDs de sales_orders e deliveries para este lote
    const { data: salesOrders } = await supabase
        .from('sales_orders')
        .select('id, license_plate')
        .eq('import_batch_id', batchId);
    
    const { data: deliveries } = await supabase
        .from('deliveries')
        .select('id, license_plate')
        .eq('import_batch_id', batchId);
    
    // Criar mapas para lookup rápido
    const salesMap = new Map(salesOrders.map(item => [item.license_plate.toLowerCase(), item.id]));
    const deliveriesMap = new Map(deliveries.map(item => [item.license_plate.toLowerCase(), item.id]));

    // Preparar dados para inserção
    const formattedData = comparisonResults.map(result => {
        const licensePlate = result.licensePlate.toLowerCase();
        return {
            license_plate: result.licensePlate,
            status: result.status,
            sales_order_id: salesMap.get(licensePlate) || null,
            delivery_id: deliveriesMap.get(licensePlate) || null,
            inconsistencies: result.inconsistencies || null,
            resolution: result.resolution || null,
            resolution_notes: result.resolutionNotes || null
        };
    });

    // Inserir dados no Supabase
    const { data, error } = await supabase
        .from('comparisons')
        .insert(formattedData)
        .select('id');

    if (error) {
        console.error('Erro ao salvar resultados de comparação:', error);
        throw error;
    }

    return { count: data.length };
}

/**
 * Salva os resultados da validação de caixa no Supabase
 * @param {Array} validationResults - Resultados da validação
 * @param {string} batchId - ID do lote de importação
 * @returns {Promise<Object>} - Resultado da operação
 */
async function saveValidationResults(validationResults, batchId) {
    if (!supabase) {
        console.error('Cliente Supabase não inicializado');
        return { count: 0 };
    }

    if (!validationResults || validationResults.length === 0) {
        console.warn('Nenhum resultado de validação para salvar');
        return { count: 0 };
    }

    // Obter IDs de comparisons e cash_records para este lote
    const { data: comparisons } = await supabase
        .from('comparisons')
        .select('id, license_plate');
    
    const { data: cashRecords } = await supabase
        .from('cash_records')
        .select('id, license_plate')
        .eq('import_batch_id', batchId);
    
    // Criar mapas para lookup rápido
    const comparisonsMap = new Map(comparisons.map(item => [item.license_plate.toLowerCase(), item.id]));
    const cashMap = new Map(cashRecords.map(item => [item.license_plate.toLowerCase(), item.id]));

    // Preparar dados para inserção
    const formattedData = validationResults.map(result => {
        const licensePlate = result.licensePlate.toLowerCase();
        return {
            license_plate: result.licensePlate,
            comparison_id: comparisonsMap.get(licensePlate) || null,
            cash_record_id: cashMap.get(licensePlate) || null,
            status: result.status,
            inconsistency_type: result.inconsistencyType || null,
            original_payment_method: result.originalPaymentMethod || null,
            corrected_payment_method: result.correctedPaymentMethod || null,
            original_price: result.originalPrice || null,
            corrected_price: result.correctedPrice || null,
            notes: result.notes || null
        };
    });

    // Inserir dados no Supabase
    const { data, error } = await supabase
        .from('validations')
        .insert(formattedData)
        .select('id');

    if (error) {
        console.error('Erro ao salvar resultados de validação:', error);
        throw error;
    }

    return { count: data.length };
}

/**
 * Salva os dados de exportação no Supabase
 * @param {Object} exportData - Dados da exportação
 * @returns {Promise<Object>} - Resultado da operação
 */
async function saveExportData(exportData) {
    if (!supabase) {
        console.error('Cliente Supabase não inicializado');
        return null;
    }

    const { data, error } = await supabase
        .from('exports')
        .insert({
            filename: exportData.filename,
            record_count: exportData.recordCount || 0,
            export_data: exportData.data
        })
        .select()
        .single();

    if (error) {
        console.error('Erro ao salvar dados de exportação:', error);
        throw error;
    }

    return data;
}

/**
 * Obtém os dados de vendas (sales orders) do Supabase
 * @param {string} batchId - ID do lote de importação (opcional)
 * @returns {Promise<Array>} - Dados de vendas
 */
async function getSalesOrders(batchId = null) {
    if (!supabase) {
        console.error('Cliente Supabase não inicializado');
        return [];
    }

    let query = supabase
        .from('sales_orders')
        .select('*');
    
    if (batchId) {
        query = query.eq('import_batch_id', batchId);
    }
    
    const { data, error } = await query;

    if (error) {
        console.error('Erro ao obter dados de vendas:', error);
        throw error;
    }

    return data;
}

/**
 * Obtém os dados de entregas do Supabase
 * @param {string} batchId - ID do lote de importação (opcional)
 * @returns {Promise<Array>} - Dados de entregas
 */
async function getDeliveries(batchId = null) {
    if (!supabase) {
        console.error('Cliente Supabase não inicializado');
        return [];
    }

    let query = supabase
        .from('deliveries')
        .select('*');
    
    if (batchId) {
        query = query.eq('import_batch_id', batchId);
    }
    
    const { data, error } = await query;

    if (error) {
        console.error('Erro ao obter dados de entregas:', error);
        throw error;
    }

    return data;
}

/**
 * Obtém os dados de caixa do Supabase
 * @param {string} batchId - ID do lote de importação (opcional)
 * @returns {Promise<Array>} - Dados de caixa
 */
async function getCashRecords(batchId = null) {
    if (!supabase) {
        console.error('Cliente Supabase não inicializado');
        return [];
    }

    let query = supabase
        .from('cash_records')
        .select('*');
    
    if (batchId) {
        query = query.eq('import_batch_id', batchId);
    }
    
    const { data, error } = await query;

    if (error) {
        console.error('Erro ao obter dados de caixa:', error);
        throw error;
    }

    return data;
}

/**
 * Obtém os resultados de comparação do Supabase
 * @returns {Promise<Array>} - Resultados de comparação
 */
async function getComparisonResults() {
    if (!supabase) {
        console.error('Cliente Supabase não inicializado');
        return [];
    }

    const { data, error } = await supabase
        .from('comparisons')
        .select(`
            *,
            sales_order:sales_order_id(*),
            delivery:delivery_id(*)
        `);

    if (error) {
        console.error('Erro ao obter resultados de comparação:', error);
        throw error;
    }

    return data;
}

/**
 * Obtém os resultados de validação do Supabase
 * @returns {Promise<Array>} - Resultados de validação
 */
async function getValidationResults() {
    if (!supabase) {
        console.error('Cliente Supabase não inicializado');
        return [];
    }

    const { data, error } = await supabase
        .from('validations')
        .select(`
            *,
            comparison:comparison_id(*),
            cash_record:cash_record_id(*)
        `);

    if (error) {
        console.error('Erro ao obter resultados de validação:', error);
        throw error;
    }

    return data;
}

/**
 * Obtém os lotes de importação do Supabase
 * @returns {Promise<Array>} - Lotes de importação
 */
async function getImportBatches() {
    if (!supabase) {
        console.error('Cliente Supabase não inicializado');
        return [];
    }

    const { data, error } = await supabase
        .from('import_batches')
        .select('*')
        .order('batch_date', { ascending: false });

    if (error) {
        console.error('Erro ao obter lotes de importação:', error);
        throw error;
    }

    return data;
}

// Expor funções globalmente
window.supabaseUtils = {
    initSupabase,
    createImportBatch,
    importSalesOrders,
    importDeliveries,
    importCashRecords,
    saveComparisonResults,
    saveValidationResults,
    saveExportData,
    getSalesOrders,
    getDeliveries,
    getCashRecords,
    getComparisonResults,
    getValidationResults,
    getImportBatches
};
