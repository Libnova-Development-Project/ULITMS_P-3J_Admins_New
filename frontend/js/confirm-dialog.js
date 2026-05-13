// Confirmation Dialog System
class ConfirmDialog {
    static show(options = {}) {
        const {
            title = 'Confirm Action',
            message = 'Are you sure you want to proceed?',
            type = 'warning',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            onConfirm = null,
            onCancel = null
        } = options;

        // Remove existing dialog
        this.remove();

        // Create dialog overlay
        const overlay = document.createElement('div');
        overlay.className = 'confirm-dialog';
        overlay.innerHTML = `
            <div class="confirm-content">
                <div class="confirm-header">
                    <div class="confirm-icon ${type}">
                        ${this.getIcon(type)}
                    </div>
                    <h3 class="confirm-title">${title}</h3>
                </div>
                <div class="confirm-body">
                    ${message}
                </div>
                <div class="confirm-actions">
                    <button class="confirm-btn confirm-btn-secondary" onclick="ConfirmDialog.cancel()">
                        ${cancelText}
                    </button>
                    <button class="confirm-btn confirm-btn-${type === 'danger' ? 'danger' : 'primary'}" onclick="ConfirmDialog.confirm()">
                        ${confirmText}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Store callbacks
        overlay._onConfirm = onConfirm;
        overlay._onCancel = onCancel;

        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.cancel();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.cancel();
            }
        });
    }

    static confirm() {
        const overlay = document.querySelector('.confirm-dialog');
        if (overlay && overlay._onConfirm) {
            overlay._onConfirm();
        }
        this.remove();
    }

    static cancel() {
        const overlay = document.querySelector('.confirm-dialog');
        if (overlay && overlay._onCancel) {
            overlay._onCancel();
        }
        this.remove();
    }

    static remove() {
        const overlay = document.querySelector('.confirm-dialog');
        if (overlay) {
            overlay.remove();
        }
    }

    static getIcon(type) {
        const icons = {
            danger: '⚠️',
            warning: '⚠️',
            success: '✅',
            info: 'ℹ️'
        };
        return icons[type] || icons.warning;
    }
}

// Success/Error Message System
class MessageSystem {
    static show(message, type = 'info', duration = 3000) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`;
        messageDiv.innerHTML = `
            <span>${this.getIcon(type)}</span>
            <span>${message}</span>
        `;

        // Find container or create one
        let container = document.querySelector('.message-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'message-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9998;
                max-width: 400px;
            `;
            document.body.appendChild(container);
        }

        container.appendChild(messageDiv);

        // Auto remove
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 300);
        }, duration);
    }

    static success(message, duration) {
        this.show(message, 'success', duration);
    }

    static error(message, duration) {
        this.show(message, 'error', duration);
    }

    static warning(message, duration) {
        this.show(message, 'warning', duration);
    }

    static getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }
}

// Loading System
class LoadingSystem {
    static show(message = 'Loading...') {
        this.remove();
        
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div style="text-align: center;">
                <div class="loading-spinner"></div>
                <div style="color: var(--text-primary); margin-top: 16px; font-size: 0.9rem;">
                    ${message}
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }

    static remove() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
}

// Global functions for easier usage
window.confirmDelete = (message, onConfirm) => {
    ConfirmDialog.show({
        title: 'Delete Item',
        message: message,
        type: 'danger',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        onConfirm: onConfirm
    });
};

window.confirmAction = (message, onConfirm, options = {}) => {
    ConfirmDialog.show({
        message: message,
        type: 'warning',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        onConfirm: onConfirm,
        ...options
    });
};

window.showSuccess = (message, duration) => {
    MessageSystem.success(message, duration);
};

window.showError = (message, duration) => {
    MessageSystem.error(message, duration);
};

window.showWarning = (message, duration) => {
    MessageSystem.warning(message, duration);
};

window.showLoading = (message) => {
    LoadingSystem.show(message);
};

window.hideLoading = () => {
    LoadingSystem.remove();
};
