// Script para verificar se todos os recursos estão a carregar corretamente
document.addEventListener('DOMContentLoaded', () => {
    console.log('A verificar carregamento de recursos...');
    
    // Verificar se o CSS foi carregado
    const cssLoaded = Array.from(document.styleSheets).some(sheet => {
        try {
            return sheet.href && sheet.href.includes('/css/styles.css');
        } catch (e) {
            return false;
        }
    });
    
    console.log('CSS carregado:', cssLoaded ? 'Sim' : 'Não');
    
    // Verificar se o Supabase SDK foi carregado
    const supabaseLoaded = typeof supabase !== 'undefined';
    console.log('Supabase SDK carregado:', supabaseLoaded ? 'Sim' : 'Não');
    
    // Verificar se os scripts JS foram carregados
    // Esta verificação será feita indiretamente através de funções específicas
    
    // Registar erros de carregamento de recursos
    const failedResources = [];
    
    // Monitorizar erros de carregamento
    window.addEventListener('error', function(e) {
        if (e.target.tagName === 'LINK' || e.target.tagName === 'SCRIPT' || e.target.tagName === 'IMG') {
            console.error('Erro ao carregar recurso:', e.target.src || e.target.href);
            failedResources.push(e.target.src || e.target.href);
        }
    }, true);
    
    // Reportar resultados após 2 segundos (tempo para carregar recursos)
    setTimeout(() => {
        if (failedResources.length > 0) {
            console.error('Recursos que falharam ao carregar:', failedResources);
            alert('Alguns recursos não foram carregados corretamente. Verifique o console para mais detalhes.');
        } else {
            console.log('Todos os recursos foram carregados com sucesso!');
        }
    }, 2000);
});
