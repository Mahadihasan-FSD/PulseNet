export class UIManager {
    constructor() {
        this.toast = document.getElementById('toast');
        this.toastTimeout = null;
    }

    // Show toast notification
    showToast(message, type = 'info') {
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }

        this.toast.textContent = message;
        this.toast.className = `toast show ${type}`;
        
        this.toastTimeout = setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }

    // Show loading state
    showLoading(container) {
        container.innerHTML = `
            <div class="loading-state">
                <div class="loader"></div>
                <p>Loading...</p>
            </div>
        `;
    }

    // Show error state
    showError(container, message = 'Something went wrong') {
        container.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Oops!</h3>
                <p>${message}</p>
                <button class="btn btn-primary mt-3" onclick="location.reload()">
                    Try Again
                </button>
            </div>
        `;
    }

    // Format date relative to now
    formatRelativeTime(date) {
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }

    // Validate email format
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Validate password strength
    isStrongPassword(password) {
        return password.length >= 6;
    }

    // Scroll to top smoothly
    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    // Toggle element visibility with animation
    toggleVisibility(element, show) {
        if (show) {
            element.style.display = 'block';
            setTimeout(() => {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, 10);
        } else {
            element.style.opacity = '0';
            element.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                element.style.display = 'none';
            }, 300);
        }
    }
}