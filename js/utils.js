// ===== UTILITÁRIOS GERAIS PARA CAIXA MULTIPARK =====
// Funções helper reutilizáveis em toda a aplicação

class CaixaUtils {
    constructor() {
        console.log('🔧 Utilitários da Caixa Multipark carregados!');
    }

    // ===== FORMATAÇÃO DE DADOS =====
    
    formatCurrency(value, currency = 'EUR', locale = 'pt-PT') {
        if (value === null || value === undefined || isNaN(value)) return '0,00 €';
        
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(parseFloat(value));
    }
    
    formatDate(date, format = 'full', locale = 'pt-PT') {
        if (!date) return 'N/A';
        
        try {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) return date.toString();
            
            const formatOptions = {
                'short': { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                },
                'full': { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit' 
                }
            };
            
            return new Intl.DateTimeFormat(locale, formatOptions[format])
                .format(dateObj);
                
        } catch (error) {
            console.warn('Erro ao formatar data:', error);
            return date.toString();
        }
    }
    
    // ===== NORMALIZAÇÃO E LIMPEZA DE DADOS =====
    
    normalizeLicensePlate(plate) {
        if (!plate) return '';
        
        return String(plate)
            .trim()
            .replace(/[\s\-\.\,\/\\\(\)\[\]\{\}\+\*\?\^\$\|]/g, '')
            .toUpperCase();
    }
    
    standardizeParkName(parkName) {
        if (!parkName) return '';
        
        return String(parkName)
            .toLowerCase()
            .replace(/\s+(parking|estacionamento|park|parque)\b/g, '')
            .trim()
            .replace(/\b\w/g, l => l.toUpperCase()); // Title Case
    }
    
    // ===== VALIDAÇÃO =====
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    isValidPrice(price) {
        if (price === null || price === undefined) return false;
        const num = parseFloat(price);
        return !isNaN(num) && num >= 0;
    }
    
    // ===== GERAÇÃO DE IDs E CÓDIGOS =====
    
    generateId(prefix = '') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2);
        return prefix + timestamp + random;
    }
    
    generateAlocation(licensePlate = '') {
        const normalized = this.normalizeLicensePlate(licensePlate);
        const suffix = normalized.slice(-4) || Math.random().toString(36).substring(2, 6).toUpperCase();
        const timestamp = Date.now().toString(36).toUpperCase();
        return `AUTO_${suffix}_${timestamp}`;
    }
    
    // ===== DEBOUNCE E THROTTLE =====
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// ===== INSTÂNCIA GLOBAL =====

const caixaUtils = new CaixaUtils();

// Exportar globalmente
window.caixaUtils = caixaUtils;

// ===== ALIASES PARA FUNÇÕES MAIS USADAS =====

window.formatCurrency = (value, currency, locale) => 
    caixaUtils.formatCurrency(value, currency, locale);

window.formatDate = (date, format, locale) => 
    caixaUtils.formatDate(date, format, locale);

window.normalizeLicensePlate = (plate) => 
    caixaUtils.normalizeLicensePlate(plate);

window.generateId = (prefix) => 
    caixaUtils.generateId(prefix);

window.debounce = (func, wait) => 
    caixaUtils.debounce(func, wait);

window.throttle = (func, limit) => 
    caixaUtils.throttle(func, limit);

console.log('✅ Utilitários da Caixa Multipark prontos!');