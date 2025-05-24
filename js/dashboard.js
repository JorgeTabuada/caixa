// Dashboard e Estatísticas
document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface de dashboard
    const entregasEfetuadasElement = document.getElementById('entregas-efetuadas');
    const entregasPrevistasElement = document.getElementById('entregas-previstas');
    const percentualEntregasElement = document.getElementById('percentual-entregas');
    
    const totalCaixaElement = document.getElementById('total-caixa');
    const totalNumerarioElement = document.getElementById('total-numerario');
    const totalMultibancoElement = document.getElementById('total-multibanco');
    const totalNoPayElement = document.getElementById('total-nopay');
    
    const countNumerarioElement = document.getElementById('count-numerario');
    const countMultibancoElement = document.getElementById('count-multibanco');
    const countNoPayElement = document.getElementById('count-nopay');
    const countTotalElement = document.getElementById('count-total');
    
    const previstoBOElement = document.getElementById('previsto-bo');
    const previstoOdooElement = document.getElementById('previsto-odoo');
    const efetivaCaixaElement = document.getElementById('efetiva-caixa');
    const diferencaCaixaElement = document.getElementById('diferenca-caixa');
    
    const condutorStatsContainer = document.getElementById('condutor-stats-container');
    const allDeliveriesTable = document.getElementById('all-deliveries-table').querySelector('tbody');
    
    // Variáveis para armazenar dados
    let deliveryData = [];
    let comparisonData = [];
    
    // Função para inicializar dashboard
    function initDashboard() {
        // Verificar se há dados disponíveis no Supabase
        if (window.supabaseUtils) {
            console.log('Verificando dados no Supabase...');
            
            window.supabaseUtils.getDeliveries().then(res => {
                if (res.data && res.data.length > 0) {
                    console.log('Dados encontrados no Supabase:', res.data);
                    
                    // Perguntar ao usuário se deseja carregar dados do Supabase
                    if (confirm('Foram encontrados dados armazenados no Supabase. Deseja carregá-los?')) {
                        // Usar dados do Supabase
                        setDeliveryData(res.data);
                        return;
                    }
                }
                
                // Se não houver dados no Supabase ou o usuário não quiser carregá-los,
                // continuar com o fluxo normal
                console.log('Usando dados locais para o dashboard');
            }).catch(error => {
                console.error('Erro ao buscar dados do Supabase:', error);
            });
        }
    }
    
    // Função para definir dados de entrega
    function setDeliveryData(data) {
        deliveryData = data;
        
        // Obter dados de comparação
        comparisonData = window.comparator ? window.comparator.getResults() : { all: [], inconsistent: [], missing: [] };
        
        // Renderizar dashboard
        renderDashboard();
    }
    
    // Função para renderizar dashboard
    function renderDashboard() {
        if (!deliveryData || deliveryData.length === 0) {
            console.warn('Nenhum dado de entrega disponível para o dashboard.');
            return;
        }
        
        // Calcular estatísticas
        const stats = calculateStats();
        
        // Atualizar elementos da interface
        updateDashboardUI(stats);
        
        // Renderizar gráficos
        renderCharts(stats);
        
        // Renderizar tabela de todas as entregas
        renderAllDeliveriesTable();
    }
    
    // Função para calcular estatísticas
    function calculateStats() {
        // Estatísticas de entregas
        const entregasEfetuadas = deliveryData.length;
        const entregasPrevistas = comparisonData.all ? comparisonData.all.length : 0;
        const percentualEntregas = entregasPrevistas > 0 ? Math.round((entregasEfetuadas / entregasPrevistas) * 100) : 0;
        
        // Estatísticas de valores
        let totalCaixa = 0;
        let totalNumerario = 0;
        let totalMultibanco = 0;
        let totalNoPay = 0;
        
        let countNumerario = 0;
        let countMultibanco = 0;
        let countNoPay = 0;
        
        // Estatísticas por condutor
        const condutorStats = {};
        
        // Estatísticas por marca
        const marcaStats = {};
        
        // Estatísticas por método de pagamento
        const paymentMethodStats = {};
        
        // Calcular estatísticas
        deliveryData.forEach(delivery => {
            const price = parseFloat(delivery.priceOnDelivery) || 0;
            
            // Total da caixa
            totalCaixa += price;
            
            // Por método de pagamento
            const paymentMethod = delivery.paymentMethod ? delivery.paymentMethod.toLowerCase() : '';
            
            if (paymentMethod.includes('numerario') || paymentMethod.includes('numerário') || paymentMethod === 'cash') {
                totalNumerario += price;
                countNumerario++;
            } else if (paymentMethod.includes('multibanco') || paymentMethod.includes('card') || paymentMethod === 'mb') {
                totalMultibanco += price;
                countMultibanco++;
            } else if (paymentMethod.includes('no pay') || paymentMethod === 'nopay') {
                totalNoPay += price;
                countNoPay++;
            }
            
            // Por condutor
            const condutor = delivery.condutorEntrega || 'Desconhecido';
            if (!condutorStats[condutor]) {
                condutorStats[condutor] = {
                    count: 0,
                    total: 0,
                    numerario: 0,
                    multibanco: 0,
                    nopay: 0
                };
            }
            
            condutorStats[condutor].count++;
            condutorStats[condutor].total += price;
            
            if (paymentMethod.includes('numerario') || paymentMethod.includes('numerário') || paymentMethod === 'cash') {
                condutorStats[condutor].numerario += price;
            } else if (paymentMethod.includes('multibanco') || paymentMethod.includes('card') || paymentMethod === 'mb') {
                condutorStats[condutor].multibanco += price;
            } else if (paymentMethod.includes('no pay') || paymentMethod === 'nopay') {
                condutorStats[condutor].nopay += price;
            }
            
            // Por marca
            const marca = delivery.parkBrand || (delivery.validatedRecord ? delivery.validatedRecord.parkBrand : 'Desconhecida');
            if (!marcaStats[marca]) {
                marcaStats[marca] = {
                    count: 0,
                    total: 0
                };
            }
            
            marcaStats[marca].count++;
            marcaStats[marca].total += price;
            
            // Por método de pagamento
            const methodKey = paymentMethod || 'Desconhecido';
            if (!paymentMethodStats[methodKey]) {
                paymentMethodStats[methodKey] = {
                    count: 0,
                    total: 0
                };
            }
            
            paymentMethodStats[methodKey].count++;
            paymentMethodStats[methodKey].total += price;
        });
        
        // Calcular valores previstos
        let previstoBo = 0;
        let previstoOdoo = 0;
        
        if (comparisonData.all) {
            comparisonData.all.forEach(record => {
                previstoBo += parseFloat(record.bookingPriceBO) || 0;
                previstoOdoo += parseFloat(record.bookingPriceOdoo) || 0;
            });
        }
        
        // Calcular diferença
        const diferenca = totalCaixa - previstoBo;
        
        return {
            entregasEfetuadas,
            entregasPrevistas,
            percentualEntregas,
            totalCaixa,
            totalNumerario,
            totalMultibanco,
            totalNoPay,
            countNumerario,
            countMultibanco,
            countNoPay,
            countTotal: entregasEfetuadas,
            previstoBo,
            previstoOdoo,
            efetivaCaixa: totalCaixa,
            diferenca,
            condutorStats,
            marcaStats,
            paymentMethodStats
        };
    }
    
    // Função para atualizar interface do dashboard
    function updateDashboardUI(stats) {
        // Atualizar estatísticas de entregas
        entregasEfetuadasElement.textContent = stats.entregasEfetuadas;
        entregasPrevistasElement.textContent = stats.entregasPrevistas;
        percentualEntregasElement.textContent = stats.percentualEntregas + '%';
        
        // Atualizar classe de status do percentual
        if (stats.percentualEntregas >= 90) {
            percentualEntregasElement.className = 'status-success';
        } else if (stats.percentualEntregas >= 70) {
            percentualEntregasElement.className = 'status-warning';
        } else {
            percentualEntregasElement.className = 'status-error';
        }
        
        // Atualizar estatísticas de valores
        totalCaixaElement.textContent = formatCurrency(stats.totalCaixa);
        totalNumerarioElement.textContent = formatCurrency(stats.totalNumerario);
        totalMultibancoElement.textContent = formatCurrency(stats.totalMultibanco);
        totalNoPayElement.textContent = formatCurrency(stats.totalNoPay);
        
        // Atualizar estatísticas de contagem
        countNumerarioElement.textContent = stats.countNumerario;
        countMultibancoElement.textContent = stats.countMultibanco;
        countNoPayElement.textContent = stats.countNoPay;
        countTotalElement.textContent = stats.countTotal;
        
        // Atualizar estatísticas comparativas
        previstoBOElement.textContent = formatCurrency(stats.previstoBo);
        previstoOdooElement.textContent = formatCurrency(stats.previstoOdoo);
        efetivaCaixaElement.textContent = formatCurrency(stats.efetivaCaixa);
        diferencaCaixaElement.textContent = formatCurrency(stats.diferenca);
        
        // Atualizar classe de status da diferença
        if (stats.diferenca === 0) {
            diferencaCaixaElement.className = 'status-success';
        } else if (Math.abs(stats.diferenca) <= 10) {
            diferencaCaixaElement.className = 'status-warning';
        } else {
            diferencaCaixaElement.className = 'status-error';
        }
        
        // Atualizar estatísticas por condutor
        renderCondutorStats(stats.condutorStats);
    }
    
    // Função para renderizar estatísticas por condutor
    function renderCondutorStats(condutorStats) {
        // Limpar container
        condutorStatsContainer.innerHTML = '';
        
        // Verificar se há dados
        if (Object.keys(condutorStats).length === 0) {
            condutorStatsContainer.innerHTML = '<p class="text-center">Nenhum dado de condutor disponível.</p>';
            return;
        }
        
        // Criar tabela
        const table = document.createElement('table');
        table.className = 'table';
        
        // Criar cabeçalho
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Condutor</th>
                <th>Entregas</th>
                <th>Total</th>
                <th>Numerário</th>
                <th>Multibanco</th>
                <th>No Pay</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Criar corpo da tabela
        const tbody = document.createElement('tbody');
        
        // Adicionar linha para cada condutor
        Object.keys(condutorStats).forEach(condutor => {
            const stats = condutorStats[condutor];
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${condutor}</td>
                <td>${stats.count}</td>
                <td>${formatCurrency(stats.total)}</td>
                <td>${formatCurrency(stats.numerario)}</td>
                <td>${formatCurrency(stats.multibanco)}</td>
                <td>${formatCurrency(stats.nopay)}</td>
            `;
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        condutorStatsContainer.appendChild(table);
    }
    
    // Função para renderizar gráficos
    function renderCharts(stats) {
        // Gráfico de marcas
        renderBrandsChart(stats.marcaStats);
        
        // Gráfico de métodos de pagamento
        renderPaymentsChart(stats.paymentMethodStats);
    }
    
    // Função para renderizar gráfico de marcas
    function renderBrandsChart(marcaStats) {
        const ctx = document.getElementById('chart-brands').getContext('2d');
        
        // Destruir gráfico existente
        if (window.brandsChart) {
            window.brandsChart.destroy();
        }
        
        // Preparar dados
        const labels = Object.keys(marcaStats);
        const data = labels.map(marca => marcaStats[marca].count);
        
        // Criar gráfico
        window.brandsChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Entregas por Marca',
                    data: data,
                    backgroundColor: [
                        '#4CAF50',
                        '#2196F3',
                        '#FFC107',
                        '#F44336',
                        '#9C27B0',
                        '#FF9800',
                        '#795548',
                        '#607D8B'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    title: {
                        display: true,
                        text: 'Entregas por Marca'
                    }
                }
            }
        });
    }
    
    // Função para renderizar gráfico de métodos de pagamento
    function renderPaymentsChart(paymentMethodStats) {
        const ctx = document.getElementById('chart-payments').getContext('2d');
        
        // Destruir gráfico existente
        if (window.paymentsChart) {
            window.paymentsChart.destroy();
        }
        
        // Preparar dados
        const labels = Object.keys(paymentMethodStats);
        const data = labels.map(method => paymentMethodStats[method].count);
        
        // Criar gráfico
        window.paymentsChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Entregas por Método de Pagamento',
                    data: data,
                    backgroundColor: [
                        '#4CAF50',
                        '#2196F3',
                        '#FFC107',
                        '#F44336',
                        '#9C27B0',
                        '#FF9800'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                    },
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
            row.innerHTML = '<td colspan="7" class="text-center">Nenhum dado disponível.</td>';
            allDeliveriesTable.appendChild(row);
            return;
        }
        
        // Adicionar cada entrega à tabela
        deliveryData.forEach(delivery => {
            const row = document.createElement('tr');
            
            // Adicionar classe de status
            if (delivery.status === 'inconsistent') {
                row.classList.add('status-warning');
            } else if (delivery.status === 'validated') {
                row.classList.add('status-success');
            }
            
            // Criar células
            row.innerHTML = `
                <td>${delivery.alocation}</td>
                <td>${delivery.licensePlate}</td>
                <td>${delivery.checkOut}</td>
                <td>${delivery.parkBrand || (delivery.validatedRecord ? delivery.validatedRecord.parkBrand : '')}</td>
                <td>${delivery.paymentMethod}</td>
                <td>${delivery.priceOnDelivery} €</td>
                <td>${getStatusText(delivery.status)}</td>
            `;
            
            allDeliveriesTable.appendChild(row);
        });
    }
    
    // Função para formatar moeda
    function formatCurrency(value) {
        return value.toFixed(2) + ' €';
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
    
    // Inicializar dashboard
    initDashboard();
    
    // Exportar funções para uso global
    window.dashboard = {
        setDeliveryData: setDeliveryData,
        getDeliveryData: () => deliveryData,
        renderDashboard: renderDashboard
    };
});
