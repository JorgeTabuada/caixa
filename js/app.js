// Aplicação principal com integração Supabase
import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', function() {
    // Elementos de navegação
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Inicialização da aplicação
    initApp();
    
    // Função de inicialização
    async function initApp() {
        console.log('Inicializando aplicação Caixa Multipark com Supabase');
        
        try {
            // Verificar conexão com Supabase
            const { data, error } = await supabase.from('import_batches').select('count()', { count: 'exact', head: true });
            
            if (error) {
                console.error('Erro ao conectar com Supabase:', error);
                alert('Erro ao conectar com a base de dados. Verifique o console para mais detalhes.');
            } else {
                console.log('Conexão com Supabase estabelecida com sucesso');
            }
        } catch (error) {
            console.error('Erro ao inicializar aplicação:', error);
        }
        
        // Mostrar a primeira aba (importação)
        showTab('import');
    }
    
    // Configurar eventos de navegação
    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            showTab(tabId);
        });
    });
    
    // Função para mostrar aba
    function showTab(tabId) {
        // Desativar todas as abas
        navTabs.forEach(tab => tab.classList.remove('active'));
        tabContents.forEach(content => content.classList.add('hidden'));
        
        // Ativar aba selecionada
        document.querySelector(`.nav-tab[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.remove('hidden');
        
        // Ações específicas para cada aba
        if (tabId === 'dashboard' && window.dashboard) {
            window.dashboard.update();
        }
    }
});
