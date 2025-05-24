// Dashboard e Estatísticas
document.addEventListener('DOMContentLoaded', function() {
    // Elementos do dashboard
    const totalCaixaElement = document.getElementById('total-caixa');
    const totalNumerarioElement = document.getElementById('total-numerario');
    const totalMultibancoElement = document.getElementById('total-multibanco');
    const totalNopayElement = document.getElementById('total-nopay');
    const totalOnlineElement = document.getElementById('total-online');
    
    const countNumerarioElement = document.getElementById('count-numerario');
    const countMultibancoElement = document.getElementById('count-multibanco');
    const countNopayElement = document.getElementById('count-nopay');
    const countOnlineElement = document.getElementById('count-online');
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
        totalOnline: 0,
        
        countNumerario: 0,
        countMultibanco: 0,
        countNopay: 0,
        countOnline: 0,
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
            totalOnline: 0,
            
            countNumerario: 0,
            countMultibanco: 0,
            countNopay: 0,
            countOnline: 0,
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
                const paymentMethod = delivery.paymentMethod.toLowerCase();
                if (paymentMethod === 'numerário') {
                    dashboardStats.totalNumerario += parseFloat(delivery.priceOnDelivery) || 0;
                    dashboardStats.countNumerario++;
                } else if (paymentMethod === 'multibanco') {
                    dashboardStats.totalMultibanco += parseFloat(delivery.priceOnDelivery) || 0;
                    dashboardStats.countMultibanco++;
                } else if (paymentMethod === 'no pay') {
                    // Contabilizar valores de "No Pay" nos totais
                    dashboardStats.totalNopay += parseFloat(delivery.priceOnDelivery) || 0;
                    dashboardStats.countNopay++;
                } else if (paymentMethod === 'online') {
                    // Adicionar suporte para pagamentos "Online"
                    dashboardStats.totalOnline += parseFloat(delivery.priceOnDelivery) || 0;
                    dashboardStats.countOnline++;
                }
                
                // Total da caixa (incluindo todos os métodos de pagamento)
                dashboardStats.totalCaixa += parseFloat(delivery.priceOnDelivery) || 0;
                
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
                dashboardStats.byBrand[brand].total += parseFloat(delivery.priceOnDelivery) || 0;
                
                // Estatísticas por método de pagamento
                const method = paymentMethod || 'Desconhecido';
                if (!dashboardStats.byPaymentMethod[method]) {
                    dashboardStats.byPaymentMethod[method] = {
                        count: 0,
                        total: 0
                    };
                }
                dashboardStats.byPaymentMethod[method].count++;
                dashboardStats.byPaymentMethod[method].total += parseFloat(delivery.priceOnDelivery) || 0;
                
                // Estatísticas por condutor
                const driver = delivery.condutorEntrega || 'Desconhecido';
                if (!dashboardStats.byDriver[driver]) {
                    dashboardStats.byDriver[driver] = {
                        count: 0,
                        total: 0,
                        numerario: { count: 0, total: 0 },
                        multibanco: { count: 0, total: 0 },
                        nopay: { count: 0, total: 0 },
                        online: { count: 0, total: 0 }
                    };
                }
                
                dashboardStats.byDriver[driver].count++;
                
                if (paymentMethod === 'numerário') {
                    dashboardStats.byDriver[driver].numerario.count++;
                    dashboardStats.byDriver[driver].numerario.total += parseFloat(delivery.priceOnDelivery) || 0;
                    dashboardStats.byDriver[driver].total += parseFloat(delivery.priceOnDelivery) || 0;
                } else if (paymentMethod === 'multibanco') {
                    dashboardStats.byDriver[driver].multibanco.count++;
                    dashboardStats.byDriver[driver].multibanco.total += parseFloat(delivery.priceOnDelivery) || 0;
                    dashboardStats.byDriver[driver].total += parseFloat(delivery.priceOnDelivery) || 0;
                } else if (paymentMethod === 'no pay') {
                    dashboardStats.byDriver[driver].nopay.count++;
                    dashboardStats.byDriver[driver].nopay.total += parseFloat(delivery.priceOnDelivery) || 0;
                    dashboardStats.byDriver[driver].total += parseFloat(delivery.priceOnDelivery) || 0;
                } else if (paymentMethod === 'online') {
                    dashboardStats.byDriver[driver].online.count++;
                    dashboardStats.byDriver[driver].online.total += parseFloat(delivery.priceOnDelivery) || 0;
                    dashboardStats.byDriver[driver].total += parseFloat(delivery.priceOnDelivery) || 0;
                }
            }
            
            // Valores previstos
            if (delivery.validatedRecord) {
                dashboardStats.previstoBO += parseFloat(delivery.validatedRecord.bookingPriceBO) || 0;
                dashboardStats.previstoOdoo += parseFloat(delivery.validatedRecord.bookingPriceOdoo) || 0;
            }
            
            // Valor efetivo da caixa (incluindo todos os métodos de pagamento)
            if (delivery.status === 'validated') {
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
        if (totalOnlineElement) {
            totalOnlineElement.textContent = formatCurrency(dashboardStats.totalOnline);
        }
        
        // Atualizar contagens
        countNumerarioElement.textContent = dashboardStats.countNumerario;
        countMultibancoElement.textContent = dashboardStats.countMultibanco;
        countNopayElement.textContent = dashboardStats.countNopay;
        if (countOnlineElement) {
            countOnlineElement.textContent = dashboardStats.countOnline;
        }
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
                            <p>Total No Pay: <strong>${driverData.nopay.count}</strong> (${formatCurrency(driverData.nopay.total)})</p>
                            <p>Total Online: <strong>${driverData.online ? driverData.online.count : 0}</strong> (${formatCurrency(driverData.online ? driverData.online.total : 0)})</p>
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
        const methodData = methodLabels.map(method => dashboardStats.byPaymentMethod[method].total);
        
        new Chart(document.getElementById('chart-payments'), {
            type: 'pie',
            data: {
                labels: methodLabels,
                datasets: [{
                    label: 'Total por Método de Pagamento (€)',
                    data: methodData,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Total por Método de Pagamento'
                    }
                }
            }
        });
    }
    
    // Função para renderizar tabela de todas as entregas
    function renderAllDeliveriesTable() {
        // Limpar tabela
        allDeliveriesTable.innerHTML = '';
        
        // Verificar se há dados de entregas
        if (deliveryData.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" class="text-center">Nenhuma entrega disponível.</td>';
            allDeliveriesTable.appendChild(row);
            return;
        }
        
        // Renderizar cada entrega
        deliveryData.forEach(delivery => {
            const row = document.createElement('tr');
            
            // Definir classe com base no status
            if (delivery.permanentInconsistency) {
                row.className = 'status-error';
            } else if (delivery.status === 'inconsistent' && !delivery.resolution) {
                row.className = 'status-error';
            } else if (delivery.resolution && delivery.resolution !== 'confirmed' && delivery.resolution !== 'auto_validated') {
                row.className = 'status-warning';
            } else if (delivery.status === 'validated' || delivery.resolution === 'confirmed' || delivery.resolution === 'auto_validated') {
                row.className = 'status-success';
            }
            
            // Preencher células
            row.innerHTML = `
                <td>${delivery.licensePlate || 'N/A'}</td>
                <td>${delivery.checkOut || 'N/A'}</td>
                <td>${delivery.parkBrand || 'N/A'}</td>
                <td>${delivery.paymentMethod || 'N/A'}</td>
                <td>${formatCurrency(delivery.priceOnDelivery)}</td>
                <td>${delivery.condutorEntrega || 'N/A'}</td>
                <td>${getStatusText(delivery)}</td>
            `;
            
            allDeliveriesTable.appendChild(row);
        });
    }
    
    // Função para obter texto de status
    function getStatusText(delivery) {
        if (delivery.permanentInconsistency) {
            return 'Inconsistência Permanente';
        } else if (delivery.status === 'inconsistent' && !delivery.resolution) {
            return 'Inconsistente';
        } else if (delivery.resolution === 'confirmed') {
            return 'Confirmado';
        } else if (delivery.resolution === 'auto_validated') {
            return 'Validado Automaticamente';
        } else if (delivery.resolution === 'corrected') {
            return 'Corrigido';
        } else if (delivery.status === 'validated') {
            return 'Validado';
        } else {
            return delivery.status || 'N/A';
        }
    }
    
    // Função para formatar valor monetário
    function formatCurrency(value) {
        const numValue = parseFloat(value) || 0;
        return numValue.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
    }
    
    // Função para preparar dados para exportação
    function prepareExportData() {
        // Verificar se o exportador está disponível
        if (window.exporter && typeof window.exporter.setExportData === 'function') {
            // Passar dados para o exportador
            window.exporter.setExportData(deliveryData, dashboardStats);
        }
    }
    
    // Expor funções para uso em outros módulos
    window.dashboard = {
        setDeliveryData: setDeliveryData,
        getStats: function() {
            return dashboardStats;
        }
    };
});
