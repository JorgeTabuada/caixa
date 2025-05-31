// Configuração e funções do Supabase para Caixa Multipark
// As credenciais estão definidas no HTML principal

// Aguardar que o Supabase esteja disponível
function waitForSupabase() {
    return new Promise((resolve) => {
        const checkSupabase = () => {
            if (window.supabase) {
                resolve(window.supabase);
            } else {
                setTimeout(checkSupabase, 100);
            }
        };
        checkSupabase();
    });
}

// Funções para interagir com o Supabase

/**
 * Cria um novo lote de importação
 */
async function createImportBatch(batchInfo) {
    const supabase = await waitForSupabase();
    
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
 */
async function importSalesOrders(salesData, batchId) {
    const supabase = await waitForSupabase();
    
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
 */
async function importDeliveries(deliveriesData, batchId) {
    const supabase = await waitForSupabase();
    
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
 */
async function importCashRecords(cashData, batchId) {
    const supabase = await waitForSupabase();
    
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
 * Obtém os dados de vendas (sales orders) do Supabase
 */
async function getSalesOrders(batchId = null) {
    const supabase = await waitForSupabase();

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
 */
async function getDeliveries(batchId = null) {
    const supabase = await waitForSupabase();

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
 */
async function getCashRecords(batchId = null) {
    const supabase = await waitForSupabase();

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
 * Salva os resultados da comparação no Supabase
 */
async function saveComparisonResults(comparisonResults, batchId) {
    const supabase = await waitForSupabase();
    
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
 * Obtém os lotes de importação do Supabase
 */
async function getImportBatches() {
    const supabase = await waitForSupabase();

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

/**
 * Obtém os resultados de comparação do Supabase
 */
async function getComparisonResults() {
    const supabase = await waitForSupabase();

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

// Expor funções globalmente para compatibilidade
window.supabaseUtils = {
    createImportBatch,
    importSalesOrders,
    importDeliveries,
    importCashRecords,
    saveComparisonResults,
    getSalesOrders,
    getDeliveries,
    getCashRecords,
    getComparisonResults,
    getImportBatches
};

console.log('Supabase utils carregado com sucesso!');
