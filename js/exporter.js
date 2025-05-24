// Exportador para Excel
document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface de exportação
    const exportExcelBtn = document.getElementById('export-excel-btn');
    
    // Variáveis para armazenar dados
    let exportData = [];
    let dashboardStats = {};
    
    // Função para definir dados para exportação
    function setExportData(data, stats) {
        exportData = data;
        dashboardStats = stats;
        
        // Habilitar botão de exportação
        exportExcelBtn.disabled = false;
    }
    
    // Evento para botão de exportação
    exportExcelBtn.addEventListener('click', function() {
        exportToExcel();
    });
    
    // Função para exportar para Excel
    function exportToExcel() {
        // Criar workbook
        const wb = XLSX.utils.book_new();
        
        // Criar planilha de entregas
        const deliveriesSheet = createDeliveriesSheet();
        XLSX.utils.book_append_sheet(wb, deliveriesSheet, "Entregas");
        
        // Criar planilha de reservas não entregues
        const notDeliveredSheet = createNotDeliveredSheet();
        XLSX.utils.book_append_sheet(wb, notDeliveredSheet, "Reservas Não Entregues");
        
        // Criar planilha de estatísticas por condutor
        const driverStatsSheet = createDriverStatsSheet();
        XLSX.utils.book_append_sheet(wb, driverStatsSheet, "Estatísticas por Condutor");
        
        // Criar planilha de resumo
        const summarySheet = createSummarySheet();
        XLSX.utils.book_append_sheet(wb, summarySheet, "Resumo");
        
        // Gerar nome do arquivo
        const date = new Date();
        const fileName = `caixa_para_confirmacao_${date.toLocaleDateString('pt-BR').replace(/\//g, '_')}.xlsx`;
        
        // Exportar arquivo
        XLSX.writeFile(wb, fileName);
    }
    
    // Função para criar planilha de entregas
    function createDeliveriesSheet() {
        // Preparar dados para a planilha
        const sheetData = exportData.map(delivery => {
            return {
                "Alocação": delivery.alocation,
                "Matrícula": delivery.licensePlate,
                "Data Checkout": delivery.checkOut,
                "Marca": delivery.parkBrand || 'N/A',
                "Método Pagamento": delivery.paymentMethod,
                "Valor na Entrega": parseFloat(delivery.priceOnDelivery) || 0,
                "Booking Price (BO)": delivery.validatedRecord ? parseFloat(delivery.validatedRecord.bookingPriceBO) || 0 : 'N/A',
                "Booking Price (Odoo)": delivery.validatedRecord ? parseFloat(delivery.validatedRecord.bookingPriceOdoo) || 0 : 'N/A',
                "Campanha": delivery.campaign || 'N/A',
                "Tipo Campanha": delivery.campaignPay || 'N/A',
                "Condutor": delivery.condutorEntrega || 'N/A',
                "Status": getStatusText(delivery),
                "Resolução": getResolutionText(delivery.resolution) || 'N/A',
                "Observações": delivery.resolutionNotes || ''
            };
        });
        
        // Criar planilha
        const ws = XLSX.utils.json_to_sheet(sheetData);
        
        // Definir larguras de coluna
        const colWidths = [
            { wch: 10 },  // Alocação
            { wch: 10 },  // Matrícula
            { wch: 20 },  // Data Checkout
            { wch: 10 },  // Marca
            { wch: 15 },  // Método Pagamento
            { wch: 15 },  // Valor na Entrega
            { wch: 15 },  // Booking Price (BO)
            { wch: 15 },  // Booking Price (Odoo)
            { wch: 15 },  // Campanha
            { wch: 15 },  // Tipo Campanha
            { wch: 15 },  // Condutor
            { wch: 15 },  // Status
            { wch: 15 },  // Resolução
            { wch: 30 }   // Observações
        ];
        ws['!cols'] = colWidths;
        
        // Adicionar formatação condicional
        addConditionalFormatting(ws, sheetData);
        
        return ws;
    }
    
    // Função para criar planilha de reservas não entregues
    function createNotDeliveredSheet() {
        // Verificar se há reservas não entregues
        if (!dashboardStats.notDelivered || dashboardStats.notDelivered.length === 0) {
            // Criar planilha vazia com mensagem
            const emptyData = [{ "Mensagem": "Não há reservas não entregues." }];
            return XLSX.utils.json_to_sheet(emptyData);
        }
        
        // Preparar dados para a planilha
        const sheetData = dashboardStats.notDelivered.map(reservation => {
            let presencaStatus = '';
            if (reservation.inOdoo && reservation.inBackOffice) {
                presencaStatus = 'Presente em ambos';
            } else if (reservation.inOdoo) {
                presencaStatus = 'Apenas no Odoo';
            } else if (reservation.inBackOffice) {
                presencaStatus = 'Apenas no Back Office';
            }
            
            return {
                "Alocação": reservation.alocation,
                "Matrícula": reservation.licensePlate,
                "Marca": reservation.parkBrand,
                "Booking Price (BO)": reservation.bookingPriceBO,
                "Booking Price (Odoo)": reservation.bookingPriceOdoo,
                "Presente em": presencaStatus,
                "No Odoo": reservation.inOdoo ? "Sim" : "Não",
                "No Back Office": reservation.inBackOffice ? "Sim" : "Não"
            };
        });
        
        // Criar planilha
        const ws = XLSX.utils.json_to_sheet(sheetData);
        
        // Definir larguras de coluna
        const colWidths = [
            { wch: 10 },  // Alocação
            { wch: 10 },  // Matrícula
            { wch: 15 },  // Marca
            { wch: 15 },  // Booking Price (BO)
            { wch: 15 },  // Booking Price (Odoo)
            { wch: 20 },  // Presente em
            { wch: 10 },  // No Odoo
            { wch: 15 }   // No Back Office
        ];
        ws['!cols'] = colWidths;
        
        // Adicionar formatação condicional
        for (let i = 0; i < sheetData.length; i++) {
            const rowIndex = i + 1; // +1 para pular o cabeçalho
            const reservation = dashboardStats.notDelivered[i];
            
            // Definir cor com base na presença
            let fillColor = '00FFFFFF'; // Branco (padrão)
            
            if (reservation.inOdoo && reservation.inBackOffice) {
                // Amarelo para presentes em ambos
                fillColor = '00FFFF00';
            } else if (reservation.inOdoo) {
                // Azul claro para apenas no Odoo
                fillColor = '00ADD8E6';
            } else if (reservation.inBackOffice) {
                // Verde claro para apenas no Back Office
                fillColor = '0090EE90';
            }
            
            // Aplicar estilo a todas as células da linha
            for (let col = 0; col < 8; col++) {
                const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: col });
                if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
                if (!ws[cellRef].s) ws[cellRef].s = {};
                ws[cellRef].s.fill = { fgColor: { rgb: fillColor } };
            }
        }
        
        return ws;
    }
    
    // Função para criar planilha de estatísticas por condutor
    function createDriverStatsSheet() {
        // Verificar se há estatísticas por condutor
        if (!dashboardStats.byDriver || Object.keys(dashboardStats.byDriver).length === 0) {
            // Criar planilha vazia com mensagem
            const emptyData = [{ "Mensagem": "Não há estatísticas por condutor disponíveis." }];
            return XLSX.utils.json_to_sheet(emptyData);
        }
        
        // Preparar dados para a planilha
        const sheetData = [];
        
        // Adicionar cabeçalho
        sheetData.push({
            "Condutor": "ESTATÍSTICAS POR CONDUTOR",
            "Total Entregas": "",
            "Total Valor": "",
            "Numerário Qtd": "",
            "Numerário Valor": "",
            "Multibanco Qtd": "",
            "Multibanco Valor": "",
            "No Pay Qtd": ""
        });
        
        // Adicionar linha em branco
        sheetData.push({
            "Condutor": "",
            "Total Entregas": "",
            "Total Valor": "",
            "Numerário Qtd": "",
            "Numerário Valor": "",
            "Multibanco Qtd": "",
            "Multibanco Valor": "",
            "No Pay Qtd": ""
        });
        
        // Adicionar dados de cada condutor
        Object.keys(dashboardStats.byDriver).forEach(driver => {
            const driverData = dashboardStats.byDriver[driver];
            
            sheetData.push({
                "Condutor": driver,
                "Total Entregas": driverData.count,
                "Total Valor": driverData.total,
                "Numerário Qtd": driverData.numerario.count,
                "Numerário Valor": driverData.numerario.total,
                "Multibanco Qtd": driverData.multibanco.count,
                "Multibanco Valor": driverData.multibanco.total,
                "No Pay Qtd": driverData.nopay.count
            });
        });
        
        // Criar planilha
        const ws = XLSX.utils.json_to_sheet(sheetData);
        
        // Definir larguras de coluna
        const colWidths = [
            { wch: 20 },  // Condutor
            { wch: 15 },  // Total Entregas
            { wch: 15 },  // Total Valor
            { wch: 15 },  // Numerário Qtd
            { wch: 15 },  // Numerário Valor
            { wch: 15 },  // Multibanco Qtd
            { wch: 15 },  // Multibanco Valor
            { wch: 15 }   // No Pay Qtd
        ];
        ws['!cols'] = colWidths;
        
        // Adicionar formatação para valores monetários
        for (let i = 2; i < sheetData.length; i++) { // Começar após o cabeçalho e linha em branco
            const rowIndex = i + 1; // +1 para pular o cabeçalho do Excel
            
            // Formatar células de valor
            const valueCells = [2, 4, 6]; // Colunas com valores monetários (0-indexed)
            
            for (const col of valueCells) {
                const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: col });
                if (!ws[cellRef].s) ws[cellRef].s = {};
                ws[cellRef].s.numFmt = '#,##0.00 €';
            }
        }
        
        return ws;
    }
    
    // Função para adicionar formatação condicional
    function addConditionalFormatting(ws, data) {
        // Adicionar estilos para cada linha
        for (let i = 0; i < data.length; i++) {
            const rowIndex = i + 1; // +1 para pular o cabeçalho
            const delivery = exportData[i];
            
            // Definir cor com base no status
            let fillColor = '00FFFFFF'; // Branco (padrão)
            
            if (delivery.permanentInconsistency) {
                // Vermelho para inconsistências permanentes (no pay sem campanha)
                fillColor = '00FF0000';
            } else if (delivery.status === 'inconsistent' && !delivery.resolution) {
                // Vermelho para inconsistências não resolvidas
                fillColor = '00FF0000';
            } else if (delivery.resolution && delivery.resolution !== 'confirmed' && delivery.resolution !== 'auto_validated') {
                // Amarelo para correções
                fillColor = '00FFFF00';
            } else if (delivery.status === 'validated' || delivery.resolution === 'confirmed' || delivery.resolution === 'auto_validated') {
                // Verde para validados
                fillColor = '0000FF00';
            }
            
            // Aplicar estilo a todas as células da linha
            for (let col = 0; col < 14; col++) {
                const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: col });
                if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
                if (!ws[cellRef].s) ws[cellRef].s = {};
                ws[cellRef].s.fill = { fgColor: { rgb: fillColor } };
            }
        }
    }
    
    // Função para criar planilha de resumo
    function createSummarySheet() {
        // Preparar dados para a planilha
        const summaryData = [
            { "Categoria": "Total da Caixa", "Valor": dashboardStats.totalCaixa },
            { "Categoria": "Total em Numerário", "Valor": dashboardStats.totalNumerario },
            { "Categoria": "Total em Multibanco", "Valor": dashboardStats.totalMultibanco },
            { "Categoria": "Total No Pay", "Valor": dashboardStats.totalNopay },
            { "Categoria": "", "Valor": "" },
            { "Categoria": "Entregas em Numerário", "Valor": dashboardStats.countNumerario },
            { "Categoria": "Entregas em Multibanco", "Valor": dashboardStats.countMultibanco },
            { "Categoria": "Entregas No Pay", "Valor": dashboardStats.countNopay },
            { "Categoria": "Total de Entregas", "Valor": dashboardStats.countTotal },
            { "Categoria": "", "Valor": "" },
            { "Categoria": "Entregas Efetuadas", "Valor": dashboardStats.entregasEfetuadas },
            { "Categoria": "Entregas Previstas", "Valor": dashboardStats.entregasPrevistas },
            { "Categoria": "Percentual de Conclusão", "Valor": dashboardStats.entregasPrevistas > 0 
                ? (dashboardStats.entregasEfetuadas / dashboardStats.entregasPrevistas * 100).toFixed(1) + '%' 
                : '0%' },
            { "Categoria": "", "Valor": "" },
            { "Categoria": "Caixa Prevista (BO)", "Valor": dashboardStats.previstoBO },
            { "Categoria": "Caixa Prevista (Odoo)", "Valor": dashboardStats.previstoOdoo },
            { "Categoria": "Caixa Efetiva", "Valor": dashboardStats.efetivaCaixa },
            { "Categoria": "Diferença", "Valor": dashboardStats.efetivaCaixa - dashboardStats.previstoBO }
        ];
        
        // Adicionar estatísticas por marca
        summaryData.push({ "Categoria": "", "Valor": "" });
        summaryData.push({ "Categoria": "Estatísticas por Marca", "Valor": "" });
        
        Object.keys(dashboardStats.byBrand).forEach(brand => {
            summaryData.push({
                "Categoria": `${brand} - Entregas`,
                "Valor": dashboardStats.byBrand[brand].count
            });
            summaryData.push({
                "Categoria": `${brand} - Total`,
                "Valor": dashboardStats.byBrand[brand].total
            });
        });
        
        // Adicionar estatísticas de reservas não entregues
        summaryData.push({ "Categoria": "", "Valor": "" });
        summaryData.push({ "Categoria": "Reservas Não Entregues", "Valor": dashboardStats.notDelivered ? dashboardStats.notDelivered.length : 0 });
        
        if (dashboardStats.notDelivered && dashboardStats.notDelivered.length > 0) {
            // Contar por tipo
            let emAmbos = 0;
            let apenasOdoo = 0;
            let apenasBO = 0;
            
            dashboardStats.notDelivered.forEach(reservation => {
                if (reservation.inOdoo && reservation.inBackOffice) {
                    emAmbos++;
                } else if (reservation.inOdoo) {
                    apenasOdoo++;
                } else if (reservation.inBackOffice) {
                    apenasBO++;
                }
            });
            
            summaryData.push({ "Categoria": "Presentes em Ambos", "Valor": emAmbos });
            summaryData.push({ "Categoria": "Apenas no Odoo", "Valor": apenasOdoo });
            summaryData.push({ "Categoria": "Apenas no Back Office", "Valor": apenasBO });
        }
        
        // Criar planilha
        const ws = XLSX.utils.json_to_sheet(summaryData);
        
        // Definir larguras de coluna
        ws['!cols'] = [
            { wch: 30 },  // Categoria
            { wch: 15 }   // Valor
        ];
        
        // Adicionar formatação para valores monetários
        for (let i = 0; i < summaryData.length; i++) {
            const rowIndex = i + 1; // +1 para pular o cabeçalho
            const item = summaryData[i];
            
            // Se for um valor numérico, formatar como moeda (exceto percentuais e contagens)
            if (typeof item.Valor === 'number' && 
                !['Entregas em Numerário', 'Entregas em Multibanco', 'Entregas No Pay', 
                  'Total de Entregas', 'Entregas Efetuadas', 'Entregas Previstas',
                  'Presentes em Ambos', 'Apenas no Odoo', 'Apenas no Back Office',
                  'Reservas Não Entregues'].includes(item.Categoria)) {
                const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: 1 });
                if (!ws[cellRef].s) ws[cellRef].s = {};
                ws[cellRef].s.numFmt = '#,##0.00 €';
            }
        }
        
        return ws;
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
    
    // Função para obter texto de resolução
    function getResolutionText(resolution) {
        if (!resolution) return '';
        
        switch (resolution) {
            case 'confirmed':
                return 'Confirmado';
            case 'missing_value':
                return 'Valor em Falta';
            case 'not_delivered':
                return 'Não Entregue';
            case 'auto_validated':
                return 'Validado Automaticamente';
            case 'ignore':
                return 'Ignorado';
            default:
                return resolution;
        }
    }
    
    // Exportar funções para uso global
    window.exporter = {
        setExportData: setExportData
    };
});
