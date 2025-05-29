// Utilitários para Supabase - Versão corrigida sem ES6 imports
// Funções para interagir com o Supabase

/**
 * Cria um novo lote de importação
 * @param {Object} batchInfo - Informações sobre o lote de importação
 * @returns {Promise<Object>} - O lote de importação criado
 */
async function createImportBatch(batchInfo) {
    if (!window.supabase) {
        console.error('Cliente Supabase não inicializado');
        throw new Error('Cliente Supabase não inicializado');
    }

    const { data, error } = await window.supabase
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
    if (!window.supabase) {
        console.error('Cliente Supabase não inicializado');
        return { count: 0 };
    }

    if (!salesData || salesData.length === 0) {
        console.warn('Nenhum dado de vendas para importar');
        return { count: 0 };
    }

    // Preparar dados para inserção - mapear campos do Excel
    const formattedData = salesData.map(record => {
        // Assumir que os dados vêm com cabeçalhos em português/inglês do Excel
        return {
            license_plate: record['License Plate'] || record.licensePlate || record['Matrícula'] || '',
            booking_price: parseFloat(record['Booking Price'] || record.bookingPrice || record['Preço Booking'] || 0),
            park_brand: record['Park Brand'] || record.parkBrand || record['Marca'] || '',
            share: parseFloat(record['Share'] || record.share || 0),
            booking_date: record['Booking Date'] || record.bookingDate || null,
            check_in: record['Check In'] || record.checkIn || null,
            check_out: record['Check Out'] || record.checkOut || null,
            price_on_delivery: parseFloat(record['Price on Delivery'] || record.priceOnDelivery || record['Preço na Entrega'] || 0),
            payment_method: (record['Payment Method'] || record.paymentMethod || record['Método Pagamento'] || '').toLowerCase(),
            driver: record['Driver'] || record.driver || record['Condutor'] || '',
            campaign: record['Campaign'] || record.campaign || record['Campanha'] || '',
            campaign_pay: (record['Campaign Pay'] || record.campaignPay || 'false').toString().toLowerCase() === 'true',
            has_online_payment: (record['Has Online Payment'] || record.hasOnlinePayment || 'false').toString().toLowerCase() === 'true',
            original_data: record,
            import_batch_id: batchId
        };
    });

    // Inserir dados no Supabase
    const { data, error } = await window.supabase
        .from('sales_orders')
        .insert(formattedData)
        .select('id');

    if (error) {
        console.error('Erro ao importar dados de vendas:', error);
        throw error;
    }

    // Atualizar contagem no lote de importação
    await window.supabase
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
    if (!window.supabase) {
        console.error('Cliente Supabase não inicializado');
        return { count: 0 };
    }

    if (!deliveriesData || deliveriesData.length === 0) {
        console.warn('Nenhum dado de entregas para importar');
        return { count: 0 };
    }

    // Preparar dados para inserção
    const formattedData = deliveriesData.map(record => ({
        license_plate: record['License Plate'] || record.licensePlate || record['Matrícula'] || '',
        alocation: record['Alocation'] || record.alocation || record['Alocação'] || '',
        booking_price: parseFloat(record['Booking Price'] || record.bookingPrice || record['Preço Booking'] || 0),
        park_brand: record['Park Brand'] || record.parkBrand || record['Marca'] || '',
        campaign: record['Campaign'] || record.campaign || record['Campanha'] || '',
        check_in: record['Check In'] || record.checkIn || null,
        driver: record['Driver'] || record.driver || record['Condutor'] || '',
        campaign_pay: (record['Campaign Pay'] || record.campaignPay || 'false').toString().toLowerCase() === 'true',
        has_online_payment: (record['Has Online Payment'] || record.hasOnlinePayment || 'false').toString().toLowerCase() === 'true',
        original_data: record,
        import_batch_id: batchId
    }));

    // Inserir dados no Supabase
    const { data, error } = await window.supabase
        .from('deliveries')
        .insert(formattedData)
        .select('id');

    if (error) {
        console.error('Erro ao importar dados de entregas:', error);
        throw error;
    }

    // Atualizar contagem no lote de importação
    await window.supabase
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
    if (!window.supabase) {
        console.error('Cliente Supabase não inicializado');
        return { count: 0 };
    }

    if (!cashData || cashData.length === 0) {
        console.warn('Nenhum dado de caixa para importar');
        return { count: 0 };
    }

    // Preparar dados para inserção
    const formattedData = cashData.map(record => {
        const bookingPrice = parseFloat(record['Booking Price'] || record.bookingPrice || record['Preço Booking'] || 0);
        const priceOnDelivery = parseFloat(record['Price on Delivery'] || record.priceOnDelivery || record['Preço na Entrega'] || 0);
        
        return {
            license_plate: record['License Plate'] || record.licensePlate || record['Matrícula'] || '',
            driver: record['Driver'] || record.condutorEntrega || record.driver || record['Condutor'] || '',
            payment_method: (record['Payment Method'] || record.paymentMethod || record['Método Pagamento'] || '').toLowerCase(),
            booking_price: bookingPrice,
            price_on_delivery: priceOnDelivery,
            price_difference: priceOnDelivery - bookingPrice,
            campaign: record['Campaign'] || record.campaign || record['Campanha'] || '',
            import_batch_id: batchId
        };
    });

    // Inserir dados no Supabase
    const { data, error } = await window.supabase
        .from('cash_records')
        .insert(formattedData)
        .select('id');

    if (error) {
        console.error('Erro ao importar dados de caixa:', error);
        throw error;
    }

    // Atualizar contagem no lote de importação
    await window.supabase
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
 */
async function saveComparisonResults(comparisonResults, batchId) {
    if (!window.supabase) {
        console.error('Cliente Supabase não inicializado');
        return { count: 0 };
    }

    if (!comparisonResults || comparisonResults.length === 0) {
        console.warn('Nenhum resultado de comparação para salvar');
        return { count: 0 };
    }

    // Obter IDs de sales_orders e deliveries para este lote
    const { data: salesOrders } = await window.supabase
        .from('sales_orders')
        .select('id, license_plate')
        .eq('import_batch_id', batchId);
    
    const { data: deliveries } = await window.supabase
        .from('deliveries')
        .select('id, license_plate')
        .eq('import_batch_id', batchId);
    
    // Criar mapas para lookup rápido
    const salesMap = new Map(salesOrders?.map(item => [item.license_plate.toLowerCase(), item.id]) || []);
    const deliveriesMap = new Map(deliveries?.map(item => [item.license_plate.toLowerCase(), item.id]) || []);

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
    const { data, error } = await window.supabase
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
 * Obtém os dados de vendas (sales orders) do Supabase
 */
async function getSalesOrders(batchId = null) {
    if (!window.supabase) {
        console.error('Cliente Supabase não inicializado');
        return [];
    }

    let query = window.supabase
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

    return data || [];
}

/**
 * Obtém os dados de entregas do Supabase
 */
async function getDeliveries(batchId = null) {
    if (!window.supabase) {
        console.error('Cliente Supabase não inicializado');
        return [];
    }

    let query = window.supabase
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

    return data || [];
}

/**
 * Obtém os dados de caixa do Supabase
 */
async function getCashRecords(batchId = null) {
    if (!window.supabase) {
        console.error('Cliente Supabase não inicializado');
        return [];
    }

    let query = window.supabase
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

    return data || [];
}

// Expor funções globalmente
window.supabaseUtils = {
    createImportBatch,
    importSalesOrders,
    importDeliveries,
    importCashRecords,
    saveComparisonResults,
    getSalesOrders,
    getDeliveries,
    getCashRecords
};
