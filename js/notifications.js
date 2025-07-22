// ===== SISTEMA DE NOTIFICAÇÕES PARA CAIXA MULTIPARK =====
// Sistema de toast notifications, modals e alertas

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.init();
        console.log('🔔 Sistema de notificações carregado!');
    }

    // ===== INICIALIZAÇÃO =====
    
    init() {
        this.createContainer();
        this.createStyles();
    }
    
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = 'notification-container';
        document.body.appendChild(this.container);
    }
    
    createStyles() {
        if (document.getElementById('notification-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            }
            
            .notification {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                margin-bottom: 10px;
                padding: 16px 20px;
                min-width: 300px;
                max-width: 400px;
                pointer-events: auto;
                transform: translateX(100%);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border-left: 4px solid #007bff;
                opacity: 0;
                position: relative;
            }
            
            .notification.show {
                transform: translateX(0);
                opacity: 1;
            }
            
            .notification.success {
                border-left-color: #28a745;
            }
            
            .notification.warning {
                border-left-color: #ffc107;
            }
            
            .notification.error {
                border-left-color: #dc3545;
            }
            
            .notification.info {
                border-left-color: #17a2b8;
            }
            
            .notification-header {
                display: flex;
                align-items: center;
                justify-content: between;
                margin-bottom: 8px;
            }
            
            .notification-title {
                font-weight: 600;
                font-size: 14px;
                color: #333;
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
            }
            
            .notification-close {
                background: none;
                border: none;
                color: #666;
                cursor: pointer;
                font-size: 18px;
                padding: 0;
                margin-left: 10px;
                line-height: 1;
            }
            
            .notification-close:hover {
                color: #333;
            }
            
            .notification-message {
                font-size: 13px;
                color: #666;
                line-height: 1.4;
                margin: 0;
            }
        `;
        
        document.head.appendChild(styles);
    }

    // ===== NOTIFICAÇÕES TOAST =====
    
    show(title, message, type = 'info', options = {}) {
        const notification = this.createNotification(title, message, type, options);
        this.container.appendChild(notification);
        
        // Mostrar com animação
        setTimeout(() => {
            notification.classList.add('show');
        }, 50);
        
        // Auto-remover se configurado
        if (options.autoRemove !== false) {
            const timeout = options.timeout || 5000;
            setTimeout(() => {
                this.remove(notification);
            }, timeout);
        }
        
        // Adicionar à lista
        this.notifications.push(notification);
        
        return notification;
    }
    
    createNotification(title, message, type, options) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Ícone baseado no tipo
        const icon = this.getIcon(type);
        
        notification.innerHTML = `
            <div class="notification-header">
                <div class="notification-title">
                    ${icon} ${title}
                </div>
                <button class="notification-close">&times;</button>
            </div>
            <p class="notification-message">${message}</p>
        `;
        
        // Event listeners
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.remove(notification);
        });
        
        return notification;
    }
    
    getIcon(type) {
        const icons = {
            success: '<i class="fas fa-check-circle" style="color: #28a745;"></i>',
            warning: '<i class="fas fa-exclamation-triangle" style="color: #ffc107;"></i>',
            error: '<i class="fas fa-times-circle" style="color: #dc3545;"></i>',
            info: '<i class="fas fa-info-circle" style="color: #17a2b8;"></i>',
            default: '<i class="fas fa-bell" style="color: #007bff;"></i>'
        };
        
        return icons[type] || icons.default;
    }
    
    remove(notification) {
        notification.classList.remove('show');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        }, 300);
    }

    // ===== MÉTODOS DE CONVENIÊNCIA =====
    
    success(title, message, options = {}) {
        return this.show(title, message, 'success', options);
    }
    
    error(title, message, options = {}) {
        return this.show(title, message, 'error', options);
    }
    
    warning(title, message, options = {}) {
        return this.show(title, message, 'warning', options);
    }
    
    info(title, message, options = {}) {
        return this.show(title, message, 'info', options);
    }
}

// ===== INSTÂNCIA GLOBAL =====

const notifications = new NotificationSystem();

// Expor globalmente
window.notifications = notifications;

// ===== FUNÇÕES DE CONVENIÊNCIA GLOBAIS =====

window.showNotification = (title, message, type, options) => {
    return notifications.show(title, message, type, options);
};

window.showSuccess = (title, message, options) => {
    return notifications.success(title, message, options);
};

window.showError = (title, message, options) => {
    return notifications.error(title, message, options);
};

window.showWarning = (title, message, options) => {
    return notifications.warning(title, message, options);
};

window.showInfo = (title, message, options) => {
    return notifications.info(title, message, options);
};

console.log('✅ Sistema de notificações carregado e pronto!');