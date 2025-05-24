// Exportador de dados
document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface de exportação
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const exportSupabaseBtn = document.getElementById('export-supabase-btn');
    
    // Evento para exportar para Excel
    exportExcelBtn.addEventListener('click', function() {
        // Obter dados do dashboard
        const deliveryData = window.dashboard ? window.dashboard.getDeliveryData() : [];
        
        if (!deliveryData || deliveryData.length === 0) {
            alert('Nenhum dado disponível para exportação. Por favor, processe os arquivos primeiro.');
            return;
        }
        
        // Criar workbook
        const wb = XLSX.utils.book_new();
        
        // Criar worksheet para entregas
        const deliveryWs = XLSX.utils.json_to_sheet(deliveryData.map(delivery => {
            return {
                'Alocação': delivery.alocation,
                'Matrícula': delivery.licensePlate,
                'Data Checkout': delivery.checkOut,
                'Método Pagamento': delivery.paymentMethod,
                'Valor': delivery.priceOnDelivery,
                'Condutor': delivery.condutorEntrega,
                'Marca': delivery.parkBrand || (delivery.validatedRecord ? delivery.validatedRecord.parkBrand : ''),
                'Status': delivery.status,
                'Campanha': delivery.campaign || '',
                'Tipo Campanha': delivery.campaignPay || ''
            };
        }));
        
        // Adicionar worksheet ao workbook
        XLSX.utils.book_append_sheet(wb, deliveryWs, 'Entregas');
        
        // Exportar workbook
        XLSX.writeFile(wb, 'caixa_multipark_export.xlsx');
    });
    
    // Evento para exportar para Supabase
    exportSupabaseBtn.addEventListener('click', function() {
        // Obter dados do dashboard
        const deliveryData = window.dashboard ? window.dashboard.getDeliveryData() : [];
        
        if (!deliveryData || deliveryData.length === 0) {
            alert('Nenhum dado disponível para exportação. Por favor, processe os arquivos primeiro.');
            return;
        }
        
        // Verificar se o Supabase está disponível
        if (window.supabaseUtils) {
            // Mostrar mensagem de carregamento
            exportSupabaseBtn.textContent = 'Exportando...';
            exportSupabaseBtn.disabled = true;
            
            // Enviar dados para o Supabase
            window.supabaseUtils.importDeliveries(deliveryData).then(res => {
                // Restaurar botão
                exportSupabaseBtn.textContent = 'Exportar para Supabase';
                exportSupabaseBtn.disabled = false;
                
                if (!res.error) {
                    alert('Dados exportados com sucesso para o Supabase!');
                } else {
                    alert('Erro ao exportar para o Supabase: ' + res.error.message);
                }
            }).catch(error => {
                // Restaurar botão em caso de erro
                exportSupabaseBtn.textContent = 'Exportar para Supabase';
                exportSupabaseBtn.disabled = false;
                
                alert('Erro ao exportar para o Supabase: ' + error.message);
            });
        } else {
            alert('Supabase não está disponível. Verifique se o script foi carregado corretamente.');
        }
    });
    
    // Exportar funções para uso global
    window.exporter = {
        exportToExcel: function() {
            exportExcelBtn.click();
        },
        exportToSupabase: function() {
            exportSupabaseBtn.click();
        }
    };
});
