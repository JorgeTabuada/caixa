// Exportador com integração Supabase
import { saveExportData } from './supabase.js';

document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface de exportação
    const exportTable = document.getElementById('export-table').querySelector('tbody');
    const exportBtn = document.getElementById('export-btn');
    const exportCountElement = document.getElementById('export-count');
    const exportDateElement = document.getElementById('export-date');
    
    // Variáveis para armazenar dados da exportação
    let exportData = [];
    
    // Função para iniciar exportação
    function initExport(validatedDeliveries, pendingDeliveries) {
        console.log("Iniciando exportação com dados:", {
            validatedDeliveries: validatedDeliveries.length,
            pendingDeliveries: pendingDeliveries.length
        });
        
        // Combinar entregas validadas e pendentes
        const allDeliveries = [...validatedDeliveries, ...pendingDeliveries];
        
        // Preparar dados para exportação
        exportData = allDeliveries.map(delivery => {
            return {
                licensePlate: delivery.licensePlate,
                driver: delivery.driver,
                paymentMethod: delivery.paymentMethod,
                bookingPrice: delivery.bookingPrice,
                priceOnDelivery: delivery.priceOnDelivery,
                priceDifference: delivery.priceDifference,
                campaign: delivery.campaign,
                status: delivery.status,
                inconsistencyType: delivery.inconsistencyType || '',
                notes: delivery.notes || '',
                validated: delivery.status !== 'pending'
            };
        });
        
        // Atualizar contador
        exportCountElement.textContent = exportData.length;
        
        // Atualizar data
        const now = new Date();
        const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        exportDateElement.textContent = formattedDate;
        
        // Renderizar tabela
        renderExportTable(exportData);
    }
    
    // Função para renderizar tabela de exportação
    function renderExportTable(data) {
        // Limpar tabela
        exportTable.innerHTML = '';
        
        if (data.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" class="text-center">Nenhum dado para exportação.</td>';
            exportTable.appendChild(row);
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
                <td>${record.paymentMethod}</td>
                <td>${record.bookingPrice} €</td>
                <td>${record.priceOnDelivery} €</td>
                <td>${record.priceDifference} €</td>
                <td>${getStatusText(record.status)}</td>
            `;
            
            exportTable.appendChild(row);
        });
    }
    
    // Função para obter texto de status
    function getStatusText(status) {
        switch (status) {
            case 'valid':
            case 'validated':
                return 'Validado';
            case 'corrected':
                return 'Corrigido';
            case 'permanent_inconsistency':
                return 'Inconsistência Permanente';
            case 'pending':
                return 'Pendente';
            default:
                return status;
        }
    }
    
    // Função para exportar dados
    async function exportToExcel() {
        try {
            if (exportData.length === 0) {
                alert('Nenhum dado para exportação.');
                return;
            }
            
            // Preparar dados para o Excel
            const worksheet = XLSX.utils.json_to_sheet(exportData.map(record => {
                return {
                    'Matrícula': record.licensePlate,
                    'Condutor': record.driver,
                    'Método de Pagamento': record.paymentMethod,
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
            
            // Salvar dados de exportação no Supabase
            const batchId = window.fileProcessor ? window.fileProcessor.getCurrentBatchId() : null;
            if (batchId) {
                try {
                    await saveExportData({
                        filename: fileName,
                        recordCount: exportData.length,
                        data: exportData
                    });
                    console.log('Dados de exportação salvos no Supabase');
                } catch (error) {
                    console.error('Erro ao salvar dados de exportação:', error);
                }
            }
            
            console.log(`Exportação concluída: ${fileName}`);
            alert(`Exportação concluída com sucesso: ${fileName}`);
        } catch (error) {
            console.error('Erro ao exportar dados:', error);
            alert('Erro ao exportar dados. Verifique o console para mais detalhes.');
        }
    }
    
    // Evento de exportação
    exportBtn.addEventListener('click', exportToExcel);
    
    // Expor funções para uso externo
    window.exporter = {
        initExport: initExport,
        exportToExcel: exportToExcel
    };
});
