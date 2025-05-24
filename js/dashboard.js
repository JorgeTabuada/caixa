// Dashboard e Estatísticas
document.addEventListener('DOMContentLoaded', function() {
    // Elementos do dashboard
    const totalCaixaElement = document.getElementById('total-caixa');
    const totalNumerarioElement = document.getElementById('total-numerario');
    const totalMultibancoElement = document.getElementById('total-multibanco');
    const totalNopayElement = document.getElementById('total-nopay');
    
    const countNumerarioElement = document.getElementById('count-numerario');
    const countMultibancoElement = document.getElementById('count-multibanco');
    const countNopayElement = document.getElementById('count-nopay');
    const countTotalElement = document.getElementById('count-total');
    
    const previstoBOElement = document.getElementById('previsto-bo');
    const previstoOdooElement = document.getElementById('previsto-odoo');
    const efetivaCaixaElement = document.getElementById('efetiva-caixa');
    const diferencaCaixaElement = document.getElementById('diferenca-caixa');
    
    const allDeliveriesTable = document.getElementById('all-deliveries-table').querySelector('tbody');
    
    // Elementos para estatísticas adicionais
    const entregasEfetuadasElement = document.getElementById('entregas-efetuadas');
    const entregasPrevistasElement = document.getElementById('entregas-previstas');
    const percentualEntregasElement = document.getElementById('percentual-entregas');
    
    // Elemento para estatísticas por condutor
    const condutorStatsContainer = document.getElementById('condutor-stats-container');
    
    // Variáveis para armazenar dados
    let deliveryData = [];
    let allReservations = []; // Para armazenar todas as reservas (entregues e não entregues)
    let dashboardStats = {
        totalCaixa: 0,
        totalNumerario: 0,
        totalMultibanco: 0,
        totalNopay: 0,
        
        countNumerario: 0,
        countMultibanco: 0,
        countNopay: 0,
        countTotal: 0,
        
        previstoBO: 0,
        previstoOdoo: 0,
        efetivaCaixa: 0,
        
        entregasEfetuadas: 0,
        entregasPrevistas: 0,
        
        byBrand: {},
        byPaymentMethod: {},
        byDriver: {},
        
        notDelivered: [] // Reservas não entregues
    };
    
    // Função para definir dados de entregas
    function setDeliveryData(data) {
        deliveryData = data;
        
        // Obter dados de comparação para estatísticas de entregas previstas
        const comparisonResults = window.comparator ? window.comparator.getResults() : null;
        if (comparisonResults) {
            allReservations = comparisonResults.all || [];
        }
        
        // Calcular estatísticas
        calculateStats();
        
        // Renderizar dashboard
        renderDashboard();
        
        // Preparar dados para exportação
        prepareExportData();
    }
    
    // Função para calcular estatísticas
    function calculateStats() {
        // Resetar estatísticas
        dashboardStats = {
            totalCaixa: 0,
            totalNumerario: 0,
            totalMultibanco: 0,
            totalNopay: 0,
            
            countNumerario: 0,
            countMultibanco: 0,
            countNopay: 0,
            countTotal: 0,
            
            previstoBO: 0,
            previstoOdoo: 0,
            efetivaCaixa: 0,
            
            entregasEfetuadas: 0,
            entregasPrevistas: allReservations.length,
            
            byBrand: {},
            byPaymentMethod: {},
            byDriver: {},
            
            notDelivered: []
        };
        
        // Criar mapa de entregas por matrícula (insensível a maiúsculas/minúsculas)
        const deliveryMap = new Map();
        deliveryData.forEach(delivery => {
            if (delivery.licensePlate) {
                deliveryMap.set(delivery.licensePlate.toString().toLowerCase(), delivery);
            }
        });
        
        // Identificar reservas não entregues
        if (allReservations.length > 0) {
            allReservations.forEach(reservation => {
                if (!reservation.licensePlate) return;
                
                const licensePlateLower = reservation.licensePlate.toString().toLowerCase();
                const isDelivered = deliveryMap.has(licensePlateLower);
                
                if (!isDelivered) {
                    // Adicionar à lista de reservas não entregues
                    dashboardStats.notDelivered.push({
                        licensePlate: reservation.licensePlate,
                        alocation: reservation.alocation || 'N/A',
                        inOdoo: !!reservation.odooRecord,
                        inBackOffice: !!reservation.boRecord,
                        bookingPriceBO: reservation.bookingPriceBO || 'N/A',
                        bookingPriceOdoo: reservation.bookingPriceOdoo || 'N/A',
                        parkBrand: reservation.parkBrand || 'N/A'
                    });
                }
            });
        }
        
        // Processar cada entrega
        deliveryData.forEach(delivery => {
            // Contar apenas entregas validadas ou com resolução
            if (delivery.status === 'validated' || delivery.resolution) {
                // Totais por método de pagamento
                if (delivery.paymentMethod === 'numerário') {
                    dashboardStats.totalNumerario += parseFloat(delivery.priceOnDelivery) || 0;
                    dashboardStats.countNumerario++;
                } else if (delivery.paymentMethod === 'multibanco') {
                    dashboardStats.totalMultibanco += parseFloat(delivery.priceOnDelivery) || 0;
                    dashboardStats.countMultibanco++;
                } else if (delivery.paymentMethod === 'no pay') {
                    dashboardStats.countNopay++;
                }
                
                // Total da caixa (excluindo no pay)
                if (delivery.paymentMethod !== 'no pay') {
                    dashboardStats.totalCaixa += parseFloat(delivery.priceOnDelivery) || 0;
                }
                
                // Contagem total
                dashboardStats.countTotal++;
                dashboardStats.entregasEfetuadas++;
                
                // Estatísticas por marca
                const brand = delivery.parkBrand || 'Desconhecido';
                if (!dashboardStats.byBrand[brand]) {
                    dashboardStats.byBrand[brand] = {
                        count: 0,
                        total: 0
                    };
                }
                dashboardStats.byBrand[brand].count++;
                if (delivery.paymentMethod !== 'no pay') {
                    dashboardStats.byBrand[brand].total += parseFloat(delivery.priceOnDelivery) || 0;
                }
                
                // Estatísticas por método de pagamento
                const method = delivery.paymentMethod || 'Desconhecido';
                if (!dashboardStats.byPaymentMethod[method]) {
                    dashboardStats.byPaymentMethod[method] = {
                        count: 0,
                        total: 0
                    };
                }
                dashboardStats.byPaymentMethod[method].count++;
                if (method !== 'no pay') {
                    dashboardStats.byPaymentMethod[method].total += parseFloat(delivery.priceOnDelivery) || 0;
                }
                
                // Estatísticas por condutor
                const driver = delivery.condutorEntrega || 'Desconhecido';
                if (!dashboardStats.byDriver[driver]) {
                    dashboardStats.byDriver[driver] = {
                        count: 0,
                        total: 0,
                        numerario: { count: 0, total: 0 },
                        multibanco: { count: 0, total: 0 },
                        nopay: { count: 0, total: 0 }
                    };
                }
                
                dashboardStats.byDriver[driver].count++;
                
                if (delivery.paymentMethod === 'numerário') {
                    dashboardStats.byDriver[driver].numerario.count++;
                    dashboardStats.byDriver[driver].numerario.total += parseFloat(delivery.priceOnDelivery) || 0;
                    dashboardStats.byDriver[driver].total += parseFloat(delivery.priceOnDelivery) || 0;
                } else if (delivery.paymentMethod === 'multibanco') {
                    dashboardStats.byDriver[driver].multibanco.count++;
                    dashboardStats.byDriver[driver].multibanco.total += parseFloat(delivery.priceOnDelivery) || 0;
                    dashboardStats.byDriver[driver].total += parseFloat(delivery.priceOnDelivery) || 0;
                } else if (delivery.paymentMethod === 'no pay') {
                    dashboardStats.byDriver[driver].nopay.count++;
                }
            }
            
            // Valores previstos
            if (delivery.validatedRecord) {
                dashboardStats.previstoBO += parseFloat(delivery.validatedRecord.bookingPriceBO) || 0;
                dashboardStats.previstoOdoo += parseFloat(delivery.validatedRecord.bookingPriceOdoo) || 0;
            }
            
            // Valor efetivo da caixa
            if (delivery.status === 'validated' && delivery.paymentMethod !== 'no pay') {
                dashboardStats.efetivaCaixa += parseFloat(delivery.priceOnDelivery) || 0;
            }
        });
        
        console.log('Estatísticas calculadas:', dashboardStats);
    }
    
    // Função para renderizar dashboard
    function renderDashboard() {
        // Atualizar totais
        totalCaixaElement.textContent = formatCurrency(dashboardStats.totalCaixa);
        totalNumerarioElement.textContent = formatCurrency(dashboardStats.totalNumerario);
        totalMultibancoElement.textContent = formatCurrency(dashboardStats.totalMultibanco);
        totalNopayElement.textContent = formatCurrency(dashboardStats.totalNopay);
        
        // Atualizar contagens
        countNumerarioElement.textContent = dashboardStats.countNumerario;
        countMultibancoElement.textContent = dashboardStats.countMultibanco;
        countNopayElement.textContent = dashboardStats.countNopay;
        countTotalElement.textContent = dashboardStats.countTotal;
        
        // Atualizar comparativo
        previstoBOElement.textContent = formatCurrency(dashboardStats.previstoBO);
        previstoOdooElement.textContent = formatCurrency(dashboardStats.previstoOdoo);
        efetivaCaixaElement.textContent = formatCurrency(dashboardStats.efetivaCaixa);
        
        // Calcular diferença
        const diferenca = dashboardStats.efetivaCaixa - dashboardStats.previstoBO;
        diferencaCaixaElement.textContent = formatCurrency(diferenca);
        diferencaCaixaElement.classList.remove('status-error', 'status-success');
        diferencaCaixaElement.classList.add(diferenca < 0 ? 'status-error' : 'status-success');
        
        // Atualizar estatísticas de entregas efetuadas vs previstas
        entregasEfetuadasElement.textContent = dashboardStats.entregasEfetuadas;
        entregasPrevistasElement.textContent = dashboardStats.entregasPrevistas;
        
        // Calcular percentual de entregas
        const percentual = dashboardStats.entregasPrevistas > 0 
            ? (dashboardStats.entregasEfetuadas / dashboardStats.entregasPrevistas * 100).toFixed(1) 
            : 0;
        percentualEntregasElement.textContent = percentual + '%';
        percentualEntregasElement.classList.remove('status-error', 'status-warning', 'status-success');
        
        if (percentual < 70) {
            percentualEntregasElement.classList.add('status-error');
        } else if (percentual < 90) {
            percentualEntregasElement.classList.add('status-warning');
        } else {
            percentualEntregasElement.classList.add('status-success');
        }
        
        // Renderizar estatísticas por condutor
        renderDriverStats();
        
        // Renderizar gráficos
        renderCharts();
        
        // Renderizar tabela de todas as entregas
        renderAllDeliveriesTable();
    }
    
    // Função para renderizar estatísticas por condutor
    function renderDriverStats() {
        // Limpar container
        condutorStatsContainer.innerHTML = '';
        
        // Verificar se há dados de condutores
        if (Object.keys(dashboardStats.byDriver).length === 0) {
            condutorStatsContainer.innerHTML = '<p class="text-center">Nenhum dado de condutor disponível.</p>';
            return;
        }
        
        // Criar tabela para cada condutor
        Object.keys(dashboardStats.byDriver).forEach(driver => {
            const driverData = dashboardStats.byDriver[driver];
            
            const driverCard = document.createElement('div');
            driverCard.className = 'card mb-20';
            
            driverCard.innerHTML = `
                <div class="card-header">
                    <h3 class="card-title">Condutor: ${driver}</h3>
                </div>
                <div class="card-body">
                    <div class="flex flex-between">
                        <div>
                            <p>Total de Entregas: <strong>${driverData.count}</strong></p>
                            <p>Total em Numerário: <strong>${driverData.numerario.count}</strong> (${formatCurrency(driverData.numerario.total)})</p>
                            <p>Total em Multibanco: <strong>${driverData.multibanco.count}</strong> (${formatCurrency(driverData.multibanco.total)})</p>
                            <p>Total No Pay: <strong>${driverData.nopay.count}</strong></p>
                        </div>
                        <div>
                            <p>Valor Total: <strong>${formatCurrency(driverData.total)}</strong></p>
                        </div>
                    </div>
                </div>
            `;
            
            condutorStatsContainer.appendChild(driverCard);
        });
    }
    
    // Função para renderizar gráficos
    function renderCharts() {
        // Limpar gráficos existentes
        const chartBrands = Chart.getChart('chart-brands');
        if (chartBrands) chartBrands.destroy();
        
        const chartPayments = Chart.getChart('chart-payments');
        if (chartPayments) chartPayments.destroy();
        
        // Gráfico por marca
        const brandLabels = Object.keys(dashboardStats.byBrand);
        const brandData = brandLabels.map(brand => dashboardStats.byBrand[brand].total);
        
        new Chart(document.getElementById('chart-brands'), {
            type: 'bar',
            data: {
                labels: brandLabels,
                datasets: [{
                    label: 'Total por Marca (€)',
                    data: brandData,
                    backgroundColor: [
                        'rgba(26, 115, 232, 0.7)',
                        'rgba(66, 133, 244, 0.7)',
                        'rgba(13, 71, 161, 0.7)'
                    ],
                    borderColor: [
                        'rgba(26, 115, 232, 1)',
                        'rgba(66, 133, 244, 1)',
                        'rgba(13, 71, 161, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Total por Marca'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
        // Gráfico por método de pagamento
        const methodLabels = Object.keys(dashboardStats.byPaymentMethod);
        const methodData = methodLabels.map(method => dashboardStats.byPaymentMethod[method].count);
        
        new Chart(document.getElementById('chart-payments'), {
            type: 'pie',
            data: {
                labels: methodLabels,
                datasets: [{
                    label: 'Entregas por Método',
                    data: methodData,
                    backgroundColor: [
                        'rgba(52, 168, 83, 0.7)',
                        'rgba(251, 188, 5, 0.7)',
                        'rgba(234, 67, 53, 0.7)'
                    ],
                    borderColor: [
                        'rgba(52, 168, 83, 1)',
                        'rgba(251, 188, 5, 1)',
                        'rgba(234, 67, 53, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Entregas por Método de Pagamento'
                    }
                }
            }
        });
    }
    
    // Função para renderizar tabela de todas as entregas
    function renderAllDeliveriesTable() {
        // Limpar tabela
        allDeliveriesTable.innerHTML = '';
        
        if (deliveryData.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" class="text-center">Nenhuma entrega encontrada.</td>';
            allDeliveriesTable.appendChild(row);
            return;
        }
        
        // Adicionar cada entrega à tabela
        deliveryData.forEach(delivery => {
            const row = document.createElement('tr');
            
            // Adicionar classe de status
            if (delivery.permanentInconsistency) {
                // Inconsistência permanente (no pay sem campanha) sempre em vermelho
                row.classList.add('status-error');
            } else if (delivery.status === 'inconsistent' && !delivery.resolution) {
                row.classList.add('status-error');
            } else if (delivery.resolution && delivery.resolution !== 'confirmed' && delivery.resolution !== 'auto_validated') {
                row.classList.add('status-warning');
            } else if (delivery.status === 'validated' || delivery.resolution === 'confirmed' || delivery.resolution === 'auto_validated') {
                row.classList.add('status-success');
            }
            
            // Criar células
            row.innerHTML = `
                <td>${delivery.alocation}</td>
                <td>${delivery.licensePlate}</td>
                <td>${delivery.checkOut}</td>
                <td>${delivery.parkBrand || 'N/A'}</td>
                <td>${delivery.paymentMethod}</td>
                <td>${delivery.priceOnDelivery} €</td>
                <td>${getStatusText(delivery)}</td>
            `;
            
            allDeliveriesTable.appendChild(row);
        });
    }
    
    // Função para preparar dados para exportação
    function prepareExportData() {
        // Contar registros por status
        const inconsistentCount = deliveryData.filter(d => 
            (d.status === 'inconsistent' && !d.resolution) || d.permanentInconsistency
        ).length;
        
        const correctedCount = deliveryData.filter(d => 
            d.resolution && d.resolution !== 'confirmed' && d.resolution !== 'auto_validated'
        ).length;
        
        const successCount = deliveryData.filter(d => 
            (d.status === 'validated' || d.resolution === 'confirmed' || d.resolution === 'auto_validated') && 
            !d.permanentInconsistency
        ).length;
        
        // Atualizar contadores na seção de exportação
        document.getElementById('export-total-records').textContent = deliveryData.length;
        document.getElementById('export-inconsistency-count').textContent = inconsistentCount;
        document.getElementById('export-corrected-count').textContent = correctedCount;
        document.getElementById('export-success-count').textContent = successCount;
        
        // Exportar dados para o módulo de exportação
        window.exporter.setExportData(deliveryData, dashboardStats);
    }
    
    // Função para formatar valores monetários
    function formatCurrency(value) {
        return value.toFixed(2).replace('.', ',') + ' €';
    }
    
    // Função para obter texto de status
    function getStatusText(delivery) {
        if (delivery.permanentInconsistency === 'cliente_sem_campanha_falta_pagamento') {
            return 'Cliente sem campanha, falta pagamento';
        } else if (delivery.resolution === 'auto_validated') {
            return 'Validado Automaticamente';
        } else if (delivery.status === 'validated' || delivery.resolution === 'confirmed') {
            return 'Validado';
        } else if (delivery.resolution === 'missing_value') {
            return 'Valor em Falta';
        } else if (delivery.resolution === 'not_delivered') {
            return 'Não Entregue';
        } else if (delivery.resolution === 'ignore') {
            return 'Ignorado';
        } else if (delivery.status === 'inconsistent') {
            return 'Inconsistente';
        } else if (delivery.status === 'ready') {
            return 'Pronto para Validação';
        } else {
            return 'Pendente';
        }
    }
    
    // Exportar funções para uso global
    window.dashboard = {
        setDeliveryData: setDeliveryData,
        getStats: () => dashboardStats
    };
});
