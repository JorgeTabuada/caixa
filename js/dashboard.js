// Dashboard e Estatísticas
document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface do dashboard
    const dashboardContainer = document.getElementById('dashboard-container');
    const loadSupabaseDataBtn = document.getElementById('load-supabase-data-btn');
    
    // Dados para o dashboard
    let deliveryData = [];
    
    // Função para inicializar o dashboard
    function initDashboard(data) {
        deliveryData = data;
        
        if (!dashboardContainer) return;
        
        // Limpar dashboard
        dashboardContainer.innerHTML = '';
        
        // Verificar se há dados
        if (!data || data.length === 0) {
            dashboardContainer.innerHTML = '<div class="alert alert-warning">Nenhum dado disponível para exibição. Por favor, processe os arquivos primeiro.</div>';
            return;
        }
        
        // Criar cards de estatísticas
        createStatisticsCards(data);
        
        // Criar tabela de entregas
        createDeliveryTable(data);
    }
    
    // Função para criar cards de estatísticas
    function createStatisticsCards(data) {
        // Calcular estatísticas
        const totalDeliveries = data.length;
        const totalValue = data.reduce((sum, delivery) => sum + parseFloat(delivery.priceOnDelivery || 0), 0).toFixed(2);
        const validatedDeliveries = data.filter(d => d.status === 'validated').length;
        const inconsistentDeliveries = data.filter(d => d.status === 'inconsistent').length;
        
        // Criar container para cards
        const statsContainer = document.createElement('div');
        statsContainer.className = 'statistics-container';
        
        // Adicionar cards
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-car"></i></div>
                <div class="stat-content">
                    <div class="stat-value">${totalDeliveries}</div>
                    <div class="stat-label">Total de Entregas</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-euro-sign"></i></div>
                <div class="stat-content">
                    <div class="stat-value">${totalValue} €</div>
                    <div class="stat-label">Valor Total</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                <div class="stat-content">
                    <div class="stat-value">${validatedDeliveries}</div>
                    <div class="stat-label">Entregas Validadas</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="stat-content">
                    <div class="stat-value">${inconsistentDeliveries}</div>
                    <div class="stat-label">Inconsistências</div>
                </div>
            </div>
        `;
        
        // Adicionar ao dashboard
        dashboardContainer.appendChild(statsContainer);
    }
    
    // Função para criar tabela de entregas
    function createDeliveryTable(data) {
        // Criar container para tabela
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-container mt-20';
        
        // Criar tabela
        const table = document.createElement('table');
        table.className = 'table';
        
        // Cabeçalho da tabela
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Alocação</th>
                    <th>Matrícula</th>
                    <th>Data Checkout</th>
                    <th>Método Pagamento</th>
                    <th>Valor</th>
                    <th>Condutor</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        // Adicionar linhas à tabela
        const tbody = table.querySelector('tbody');
        
        data.forEach(delivery => {
            const row = document.createElement('tr');
            
            // Adicionar classe de status
            if (delivery.status === 'inconsistent') {
                row.classList.add('status-warning');
            } else if (delivery.status === 'validated') {
                row.classList.add('status-success');
            }
            
            // Adicionar células
            row.innerHTML = `
                <td>${delivery.alocation}</td>
                <td>${delivery.licensePlate}</td>
                <td>${delivery.checkOut}</td>
                <td>${delivery.paymentMethod}</td>
                <td>${delivery.priceOnDelivery} €</td>
                <td>${delivery.condutorEntrega}</td>
                <td>${getStatusText(delivery.status)}</td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Adicionar tabela ao container
        tableContainer.appendChild(table);
        
        // Adicionar ao dashboard
        dashboardContainer.appendChild(tableContainer);
    }
    
    // Função para obter texto do status
    function getStatusText(status) {
        switch (status) {
            case 'validated': return 'Validado';
            case 'inconsistent': return 'Inconsistente';
            case 'missing': return 'Em Falta';
            case 'ready': return 'Pronto para Validação';
            default: return status;
        }
    }
    
    // Evento para carregar dados do Supabase
    if (loadSupabaseDataBtn) {
        loadSupabaseDataBtn.addEventListener('click', function() {
            // Verificar autenticação
            if (window.supabaseUtils) {
                window.supabaseUtils.checkSession().then(session => {
                    if (!session) {
                        alert('Você precisa estar autenticado para carregar dados do Supabase. Redirecionando para a página de login...');
                        window.location.href = 'login.html';
                        return;
                    }
                    
                    // Mostrar mensagem de carregamento
                    loadSupabaseDataBtn.textContent = 'Carregando...';
                    loadSupabaseDataBtn.disabled = true;
                    
                    // Buscar dados do Supabase
                    window.supabaseUtils.getDeliveries().then(res => {
                        // Restaurar botão
                        loadSupabaseDataBtn.textContent = 'Carregar Dados do Supabase';
                        loadSupabaseDataBtn.disabled = false;
                        
                        if (!res.error && res.data && res.data.length > 0) {
                            // Inicializar dashboard com dados do Supabase
                            initDashboard(res.data);
                            alert(`${res.data.length} registros carregados do Supabase com sucesso!`);
                        } else if (!res.error && (!res.data || res.data.length === 0)) {
                            alert('Nenhum dado encontrado no Supabase.');
                        } else {
                            if (res.error.message.includes('não autenticado')) {
                                alert('Sessão expirada. Por favor, faça login novamente.');
                                window.location.href = 'login.html';
                            } else {
                                alert('Erro ao carregar dados do Supabase: ' + res.error.message);
                            }
                        }
                    }).catch(error => {
                        // Restaurar botão em caso de erro
                        loadSupabaseDataBtn.textContent = 'Carregar Dados do Supabase';
                        loadSupabaseDataBtn.disabled = false;
                        
                        alert('Erro ao carregar dados do Supabase: ' + error.message);
                    });
                });
            } else {
                alert('Supabase não está disponível. Verifique se o script foi carregado corretamente.');
            }
        });
    }
    
    // Exportar funções para uso global
    window.dashboard = {
        init: initDashboard,
        getDeliveryData: function() {
            return deliveryData;
        }
    };
});
