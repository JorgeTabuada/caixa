// Dashboard com integração Supabase
import { getSalesOrders, getDeliveries, getCashRecords, getComparisonResults, getValidationResults } from './supabase.js';

document.addEventListener('DOMContentLoaded', function() {
    // Elementos do dashboard
    const totalSalesElement = document.getElementById('total-sales');
    const totalDeliveriesElement = document.getElementById('total-deliveries');
    const totalCashElement = document.getElementById('total-cash');
    const totalOnlineElement = document.getElementById('total-online');
    const totalCardElement = document.getElementById('total-card');
    const totalNoPayElement = document.getElementById('total-no-pay');
    const totalInconsistenciesElement = document.getElementById('total-inconsistencies');
    const parkBreakdownElement = document.getElementById('park-breakdown');
    
    // Função para atualizar o dashboard
    async function updateDashboard() {
        try {
            const batchId = window.fileProcessor ? window.fileProcessor.getCurrentBatchId() : null;
            
            if (!batchId) {
                console.warn('Nenhum lote de importação disponível para o dashboard');
                return;
            }
            
            // Obter dados do Supabase
            const salesOrders = await getSalesOrders(batchId);
            const deliveries = await getDeliveries(batchId);
            const cashRecords = await getCashRecords(batchId);
            const comparisonResults = await getComparisonResults();
            const validationResults = await getValidationResults();
            
            // Atualizar contadores
            totalSalesElement.textContent = salesOrders.length;
            totalDeliveriesElement.textContent = deliveries.length;
            
            // Calcular totais por método de pagamento
            let cashTotal = 0;
            let onlineTotal = 0;
            let cardTotal = 0;
            let noPayTotal = 0;
            
            // Usar os resultados de validação para contabilizar os métodos de pagamento
            cashRecords.forEach(record => {
                const validation = validationResults.find(v => v.cash_record_id === record.id);
                const paymentMethod = validation ? 
                    (validation.corrected_payment_method || record.payment_method) : 
                    record.payment_method;
                
                const amount = validation ? 
                    (validation.corrected_price || record.price_on_delivery) : 
                    record.price_on_delivery;
                
                if (paymentMethod) {
                    const method = paymentMethod.toLowerCase();
                    if (method === 'cash') {
                        cashTotal += amount || 0;
                    } else if (method === 'online') {
                        onlineTotal += amount || 0;
                    } else if (method === 'card') {
                        cardTotal += amount || 0;
                    } else if (method === 'no pay') {
                        noPayTotal += amount || 0;
                    }
                }
            });
            
            // Atualizar elementos de totais
            totalCashElement.textContent = cashTotal.toFixed(2) + ' €';
            totalOnlineElement.textContent = onlineTotal.toFixed(2) + ' €';
            totalCardElement.textContent = cardTotal.toFixed(2) + ' €';
            totalNoPayElement.textContent = noPayTotal.toFixed(2) + ' €';
            
            // Contar inconsistências
            const inconsistencyCount = comparisonResults.filter(r => 
                r.status === 'inconsistent' || r.status.includes('missing')
            ).length;
            
            totalInconsistenciesElement.textContent = inconsistencyCount;
            
            // Gerar breakdown por parque
            generateParkBreakdown(salesOrders, deliveries, cashRecords);
            
        } catch (error) {
            console.error('Erro ao atualizar dashboard:', error);
        }
    }
    
    // Função para gerar breakdown por parque
    function generateParkBreakdown(salesOrders, deliveries, cashRecords) {
        // Limpar conteúdo atual
        parkBreakdownElement.innerHTML = '';
        
        // Agrupar por parque
        const parkMap = new Map();
        
        // Processar registros de vendas
        salesOrders.forEach(record => {
            const parkName = record.park_brand || 'Desconhecido';
            if (!parkMap.has(parkName)) {
                parkMap.set(parkName, {
                    name: parkName,
                    salesCount: 0,
                    deliveriesCount: 0,
                    cashCount: 0,
                    totalAmount: 0
                });
            }
            
            const parkData = parkMap.get(parkName);
            parkData.salesCount++;
        });
        
        // Processar registros de entregas
        deliveries.forEach(record => {
            const parkName = record.park_brand || 'Desconhecido';
            if (!parkMap.has(parkName)) {
                parkMap.set(parkName, {
                    name: parkName,
                    salesCount: 0,
                    deliveriesCount: 0,
                    cashCount: 0,
                    totalAmount: 0
                });
            }
            
            const parkData = parkMap.get(parkName);
            parkData.deliveriesCount++;
        });
        
        // Processar registros de caixa
        cashRecords.forEach(record => {
            // Tentar encontrar o parque correspondente nos registros de vendas ou entregas
            const licensePlate = record.license_plate;
            let parkName = 'Desconhecido';
            
            // Procurar nos registros de vendas
            const salesRecord = salesOrders.find(r => r.license_plate === licensePlate);
            if (salesRecord && salesRecord.park_brand) {
                parkName = salesRecord.park_brand;
            } else {
                // Procurar nos registros de entregas
                const deliveryRecord = deliveries.find(r => r.license_plate === licensePlate);
                if (deliveryRecord && deliveryRecord.park_brand) {
                    parkName = deliveryRecord.park_brand;
                }
            }
            
            if (!parkMap.has(parkName)) {
                parkMap.set(parkName, {
                    name: parkName,
                    salesCount: 0,
                    deliveriesCount: 0,
                    cashCount: 0,
                    totalAmount: 0
                });
            }
            
            const parkData = parkMap.get(parkName);
            parkData.cashCount++;
            parkData.totalAmount += record.price_on_delivery || 0;
        });
        
        // Converter para array e ordenar por nome
        const parkArray = Array.from(parkMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        
        // Criar tabela
        const table = document.createElement('table');
        table.className = 'table';
        
        // Cabeçalho
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Parque</th>
                <th>Vendas</th>
                <th>Entregas</th>
                <th>Caixa</th>
                <th>Total</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Corpo
        const tbody = document.createElement('tbody');
        parkArray.forEach(park => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${park.name}</td>
                <td>${park.salesCount}</td>
                <td>${park.deliveriesCount}</td>
                <td>${park.cashCount}</td>
                <td>${park.totalAmount.toFixed(2)} €</td>
            `;
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        
        // Adicionar tabela ao elemento
        parkBreakdownElement.appendChild(table);
    }
    
    // Atualizar dashboard quando a aba for selecionada
    document.querySelector('.nav-tab[data-tab="dashboard"]').addEventListener('click', updateDashboard);
    
    // Expor funções para uso externo
    window.dashboard = {
        update: updateDashboard
    };
});
