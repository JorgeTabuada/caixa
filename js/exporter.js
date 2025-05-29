// Exportador simplificado - Versão que não causa erros
// Use este arquivo se quiser substituir o exporter.js original

document.addEventListener('DOMContentLoaded', function() {
    console.log('Exporter simples carregado');
    
    // Elementos da interface de exportação (com verificação de existência)
    const exportTable = document.getElementById('export-table');
    const exportTableBody = exportTable ? exportTable.querySelector('tbody') : null;
    const exportBtn = document.getElementById('export-btn');
    const exportCountElement = document.getElementById('export-count');
    const exportDateElement = document.getElementById('export-date');
    
    // Verificar se os elementos existem antes de usar
    if (!exportTable) {
        console.log('Tabela de exportação não encontrada - funcionalidade limitada');
        return;
    }
    
    // Variáveis para armazenar dados da exportação
    let exportData = [];
    
    // Função para iniciar exportação
    function initExport(validatedDeliveries, pendingDeliveries) {
        console.log("Iniciando exportação com dados:", {
            validatedDeliveries: validatedDeliveries ? validatedDeliveries.length : 0,
            pendingDeliveries: pendingDeliveries ? pendingDeliveries.length : 0
        });
        
        if (!validatedDeliveries) validatedDeliveries = [];
        if (!pendingDeliveries) pendingDeliveries = [];
        
        // Combinar entregas validadas e pendentes
        const allDeliveries = [...validatedDeliveries, ...pendingDeliveries];
        
        // Preparar dados para exportação
        exportData = allDeliveries.map(delivery => {
            return {
                licensePlate: delivery.licensePlate || '',
                driver: delivery.driver || '',
                paymentMethod: delivery.paymentMethod || '',
                bookingPrice: delivery.bookingPrice || 0,
                priceOnDelivery: delivery.priceOnDelivery || 0,
                priceDifference: (delivery.priceOnDelivery || 0) - (delivery.bookingPrice || 0),
                campaign: delivery.campaign || '',
                status: delivery.status || 'unknown',
                inconsistencyType: delivery.inconsistencyType || '',
                notes: delivery.notes || '',
                validated: delivery.status !== 'pending'
            };
        });
        
        // Atualizar contador se elemento existir
        if (exportCountElement) {
            exportCountElement.textContent = exportData.length;
        }
        
        // Atualizar data se elemento existir
        if (exportDateElement) {
            const now = new Date();
            const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            exportDateElement.textContent = formattedDate;
        }
        
        // Renderizar tabela
        renderExportTable(exportData);
    }
    
    // Função para renderizar tabela de exportação
    function renderExportTable(data) {
        if (!exportTableBody) {
            console.log('Corpo da tabela de exportação não encontrado');
            return;
        }
        
        // Limpar tabela
        exportTableBody.innerHTML = '';
        
        if (!data || data.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" class="text-center">Nenhum dado para exportação.</td>';
            exportTableBody.appendChild(row);
            return;
        }
        
        // Adicionar cada registro à tabela
        data.forEach(record => {
            const row = document.createElement('tr');
            
            // Adicionar classe de status
            if (record.status === 'permanent_inconsistency') {
                row.classList.add('status-error');
            } else if (record.status === 'pending') {
                row.classList.add('status-warning');
            } else {
                row.classList.add('status-success');
            }
            
            // Criar células
            row.innerHTML = `
                <td>${record.licensePlate}</td>
                <td>${record.driver}</td>
                <td>${formatPaymentMethod(record.paymentMethod)}</td>
                <td>${formatPrice(record.bookingPrice)}</td>
                <td>${formatPrice(record.priceOnDelivery)}</td>
                <td>${formatPrice(record.priceDifference)}</td>
                <td>${getStatusText(record.status)}</td>
            `;
            
            exportTableBody.appendChild(row);
        });
    }
    
    // Função para obter texto de status
    function getStatusText(status) {
        const statusMap = {
            'valid': 'Validado',
            'validated': 'Validado',
            'corrected': 'Corrigido',
            'permanent_inconsistency': 'Inconsistência Permanente',
            'pending': 'Pendente'
        };
        return statusMap[status] || status;
    }
    
    // Função para formatar preços
    function formatPrice(price) {
        if (price === null || price === undefined || isNaN(price)) {
            return 'N/A';
        }
        return parseFloat(price).toFixed(2) + ' €';
    }
    
    // Função para formatar método de pagamento
    function formatPaymentMethod(method) {
        if (!method) return 'N/A';
        const methods = {
            'cash': 'Dinheiro',
            'card': 'Cartão',
            'online': 'Online',
            'no pay': 'Sem Pagamento'
        };
        return methods[method.toLowerCase()] || method;
    }
    
    // Função para exportar dados para Excel
    async function exportToExcel() {
        try {
            if (!exportData || exportData.length === 0) {
                alert('Nenhum dado para exportação.');
                return;
            }
            
            // Verificar se XLSX está disponível
            if (typeof XLSX === 'undefined') {
                alert('Biblioteca XLSX não carregada. Verifique se o script está incluído.');
                return;
            }
            
            // Preparar dados para o Excel
            const worksheet = XLSX.utils.json_to_sheet(exportData.map(record => {
                return {
                    'Matrícula': record.licensePlate,
                    'Condutor': record.driver,
                    'Método de Pagamento': formatPaymentMethod(record.paymentMethod),
                    'Preço Booking': record.bookingPrice,
                    'Preço na Entrega': record.priceOnDelivery,
                    'Diferença': record.priceDifference,
                    'Campanha': record.campaign,
                    'Status': getStatusText(record.status),
                    'Tipo de Inconsistência': record.inconsistencyType,
                    'Notas': record.notes,
                    'Validado': record.validated ? 'Sim' : 'Não'
                };
            }));
            
            // Criar workbook
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Exportação');
            
            // Gerar nome do arquivo
            const now = new Date();
            const fileName = `caixa-multipark-export-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.xlsx`;
            
            // Exportar para Excel
            XLSX.writeFile(workbook, fileName);
            
            console.log(`Exportação concluída: ${fileName}`);
            
            if (window.appUtils && window.appUtils.showSuccess) {
                window.appUtils.showSuccess(`Exportação concluída: ${fileName}`);
            } else {
                alert(`Exportação concluída com sucesso: ${fileName}`);
            }
            
        } catch (error) {
            console.error('Erro ao exportar dados:', error);
            
            if (window.appUtils && window.appUtils.showError) {
                window.appUtils.showError('Erro ao exportar dados. Verifique o console para mais detalhes.');
            } else {
                alert('Erro ao exportar dados. Verifique o console para mais detalhes.');
            }
        }
    }
    
    // Configurar evento de exportação se o botão existir
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);
    }
    
    // Expor funções para uso externo
    window.exporter = {
        initExport: initExport,
        exportToExcel: exportToExcel
    };
    
    console.log('✅ Exporter simples configurado com sucesso');
});
