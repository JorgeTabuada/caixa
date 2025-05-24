// Exportador para Excel
document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface de exportação
    const exportExcelBtn = document.getElementById('export-btn');
    
    // Variáveis para armazenar dados
    let exportData = [];
    let dashboardStats = {};
    
    // Expor funções para uso em outros módulos
    window.exporter = {
        setExportData: setExportData,
        exportToExcel: exportToExcel
    };
    
    // Função para definir dados para exportação
    function setExportData(data, stats) {
        exportData = data;
        dashboardStats = stats;
        
        // Habilitar botão de exportação
        if (exportExcelBtn) {
            exportExcelBtn.disabled = false;
        }
    }
    
    // Evento para botão de exportação
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', function() {
            exportToExcel();
        });
    }
    
    // Função para exportar para Excel
    function exportToExcel() {
        console.log("Iniciando exportação para Excel...");
        
        try {
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
            console.log("Exportação concluída com sucesso:", fileName);
        } catch (error) {
            console.error("Erro durante a exportação:", error);
        }
    }
    
    // Função para criar planilha de entregas
    function createDeliveriesSheet() {
        // Preparar dados para a planilha
        const sheetData = exportData.map(delivery => {
            // Obter informações sobre inconsistências
            const inconsistencias = getInconsistencias(delivery);
            
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
                "Validado": delivery.status === 'validated' || delivery.resolution === 'confirmed' || delivery.resolution === 'auto_validated' ? 'Sim' : 'Não',
                "Inconsistências": inconsistencias,
                "Resolução": getResolutionText(delivery.resolution) || 'N/A',
                "Observações": (delivery.resolutionNotes || '') + (delivery.userNotes ? '\n' + delivery.userNotes : ''),
                "Alterações Realizadas": delivery.resolution === 'corrected' ? getAlteracoes(delivery) : 'N/A'
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
            { wch: 10 },  // Validado
            { wch: 30 },  // Inconsistências
            { wch: 15 },  // Resolução
            { wch: 30 },  // Observações
            { wch: 40 }   // Alterações Realizadas
        ];
        ws['!cols'] = colWidths;
        
        // Adicionar formatação condicional
        addConditionalFormatting(ws, sheetData);
        
        return ws;
    }
    
    // Função para obter informações sobre inconsistências
    function getInconsistencias(delivery) {
        let inconsistencias = [];
        
        // Normalizar métodos de pagamento para comparação
        const originalPaymentMethod = delivery.originalPaymentMethod ? delivery.originalPaymentMethod.toLowerCase() : '';
        const currentPaymentMethod = delivery.paymentMethod ? delivery.paymentMethod.toLowerCase() : '';
        
        // Verificar inconsistências de pagamento "no pay" sem campanha
        // Manter esta inconsistência permanente mesmo após alteração
        if ((originalPaymentMethod === 'no pay' || currentPaymentMethod === 'no pay') && 
            (!delivery.campaign || delivery.campaign === 'false' || delivery.campaign === false)) {
            inconsistencias.push("Cliente sem campanha, falta pagamento");
        }
        
        // Verificar inconsistências entre BO e Odoo
        if (delivery.validatedRecord) {
            const boPrice = parseFloat(delivery.validatedRecord.bookingPriceBO) || 0;
            const odooPrice = parseFloat(delivery.validatedRecord.bookingPriceOdoo) || 0;
            
            if (boPrice !== odooPrice) {
                inconsistencias.push(`Diferença de preço: BO (${boPrice.toFixed(2)}€) vs Odoo (${odooPrice.toFixed(2)}€)`);
            }
        }
        
        // Verificar inconsistências de pagamento online
        if (currentPaymentMethod === 'online' && 
            (!delivery.hasOnlinePayment || delivery.hasOnlinePayment === 'false' || delivery.hasOnlinePayment === false)) {
            inconsistencias.push("Pagamento Online sem confirmação");
        }
        
        // Verificar inconsistências originais (manter mesmo após correção)
        if (delivery.originalInconsistencies && delivery.resolution === 'corrected') {
            // Se houver inconsistências originais registradas, incluí-las
            if (typeof delivery.originalInconsistencies === 'string') {
                inconsistencias.push(`Inconsistências originais: ${delivery.originalInconsistencies}`);
            } else if (Array.isArray(delivery.originalInconsistencies)) {
                inconsistencias.push(`Inconsistências originais: ${delivery.originalInconsistencies.join(', ')}`);
            }
        }
        
        // Verificar outras inconsistências
        if (delivery.inconsistencyReason) {
            inconsistencias.push(delivery.inconsistencyReason);
        }
        
        return inconsistencias.join("; ");
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
            "No Pay Qtd": "",
            "No Pay Valor": "",
            "Online Qtd": "",
            "Online Valor": ""
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
            "No Pay Qtd": "",
            "No Pay Valor": "",
            "Online Qtd": "",
            "Online Valor": ""
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
                "No Pay Qtd": driverData.nopay.count,
                "No Pay Valor": driverData.nopay.total || 0,
                "Online Qtd": driverData.online ? driverData.online.count : 0,
                "Online Valor": driverData.online ? driverData.online.total : 0
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
            { wch: 15 },  // No Pay Qtd
            { wch: 15 },  // No Pay Valor
            { wch: 15 },  // Online Qtd
            { wch: 15 }   // Online Valor
        ];
        ws['!cols'] = colWidths;
        
        // Adicionar formatação para valores monetários
        for (let i = 2; i < sheetData.length; i++) { // Começar após o cabeçalho e linha em branco
            const rowIndex = i + 1; // +1 para pular o cabeçalho do Excel
            
            // Formatar células de valor
            const valueCells = [2, 4, 6, 8, 10]; // Colunas com valores monetários (0-indexed)
            
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
            for (let col = 0; col < 17; col++) {
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
            { "Categoria": "Total Online", "Valor": dashboardStats.totalOnline || 0 },
            { "Categoria": "", "Valor": "" },
            { "Categoria": "Entregas em Numerário", "Valor": dashboardStats.countNumerario },
            { "Categoria": "Entregas em Multibanco", "Valor": dashboardStats.countMultibanco },
            { "Categoria": "Entregas No Pay", "Valor": dashboardStats.countNopay },
            { "Categoria": "Entregas Online", "Valor": dashboardStats.countOnline || 0 },
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
        const colWidths = [
            { wch: 30 },  // Categoria
            { wch: 15 }   // Valor
        ];
        ws['!cols'] = colWidths;
        
        // Adicionar formatação para valores monetários
        const monetaryRows = [0, 1, 2, 3, 4, 16, 17, 18, 19]; // Linhas com valores monetários (0-indexed)
        
        monetaryRows.forEach(rowIndex => {
            const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 1, c: 1 }); // +1 para pular o cabeçalho
            if (ws[cellRef]) {
                if (!ws[cellRef].s) ws[cellRef].s = {};
                ws[cellRef].s.numFmt = '#,##0.00 €';
            }
        });
        
        // Adicionar formatação para estatísticas por marca
        const brandStartIndex = 22; // Índice aproximado onde começam as estatísticas por marca
        
        for (let i = brandStartIndex; i < summaryData.length; i++) {
            const categoria = summaryData[i].Categoria;
            
            if (categoria.includes(' - Total')) {
                const cellRef = XLSX.utils.encode_cell({ r: i + 1, c: 1 }); // +1 para pular o cabeçalho
                if (ws[cellRef]) {
                    if (!ws[cellRef].s) ws[cellRef].s = {};
                    ws[cellRef].s.numFmt = '#,##0.00 €';
                }
            }
        }
        
        return ws;
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
    
    // Função para obter texto de resolução
    function getResolutionText(resolution) {
        if (!resolution) return '';
        
        switch (resolution) {
            case 'confirmed':
                return 'Confirmado';
            case 'auto_validated':
                return 'Validado Automaticamente';
            case 'corrected':
                return 'Corrigido';
            default:
                return resolution;
        }
    }
    
    // Função para obter alterações realizadas
    function getAlteracoes(delivery) {
        let alteracoes = [];
        
        // Alterações no método de pagamento - mostrar claramente o método original e a alteração
        if (delivery.originalPaymentMethod && delivery.originalPaymentMethod !== delivery.paymentMethod) {
            alteracoes.push(`Método de pagamento original: ${delivery.originalPaymentMethod}`);
            alteracoes.push(`Alterado para: ${delivery.paymentMethod}`);
        }
        
        // Alterações no preço - mostrar claramente o preço original e a alteração
        if (delivery.originalPrice !== undefined && delivery.originalPrice !== delivery.priceOnDelivery) {
            alteracoes.push(`Preço original: ${delivery.originalPrice}€`);
            alteracoes.push(`Alterado para: ${delivery.priceOnDelivery}€`);
        }
        
        // Alterações na campanha - mostrar claramente a configuração original e a alteração
        if (delivery.originalCampaign !== undefined && delivery.originalCampaign !== delivery.campaign) {
            const oldCampaign = delivery.originalCampaign ? 'Sim' : 'Não';
            const newCampaign = delivery.campaign ? 'Sim' : 'Não';
            alteracoes.push(`Campanha original: ${oldCampaign}`);
            alteracoes.push(`Alterado para: ${newCampaign}`);
        }
        
        // Alterações no tipo de campanha - mostrar claramente o tipo original e a alteração
        if (delivery.originalCampaignPay && delivery.originalCampaignPay !== delivery.campaignPay) {
            alteracoes.push(`Tipo de campanha original: ${delivery.originalCampaignPay}`);
            alteracoes.push(`Alterado para: ${delivery.campaignPay}`);
        }
        
        // Outras alterações registradas
        if (delivery.changesDescription) {
            alteracoes.push(`Descrição da alteração: ${delivery.changesDescription}`);
        }
        
        return alteracoes.length > 0 ? alteracoes.join("\n") : "Sem detalhes das alterações";
    }
});
