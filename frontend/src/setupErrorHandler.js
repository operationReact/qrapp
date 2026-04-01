// Small global runtime error handler to make page-failures obvious during local development
window.addEventListener('error', (ev) => {
    try {
        console.error('Global error captured:', ev.error || ev.message || ev);
        const overlayId = 'app-error-overlay';
        let overlay = document.getElementById(overlayId);
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = overlayId;
            overlay.style.position = 'fixed';
            overlay.style.left = '16px';
            overlay.style.right = '16px';
            overlay.style.top = '16px';
            overlay.style.zIndex = 999999;
            overlay.style.background = 'rgba(255, 255, 255, 0.98)';
            overlay.style.border = '1px solid #e11d48';
            overlay.style.color = '#111827';
            overlay.style.padding = '12px';
            overlay.style.fontFamily = 'monospace';
            overlay.style.whiteSpace = 'pre-wrap';
            overlay.style.maxHeight = '40vh';
            overlay.style.overflow = 'auto';
            document.body.appendChild(overlay);
        }
        overlay.textContent = 'Runtime error: ' + (ev.error ? ev.error.toString() : (ev.message || JSON.stringify(ev)));
    } catch (e) {
        // ignore
    }
});

window.addEventListener('unhandledrejection', (ev) => {
    try {
        console.error('Unhandled promise rejection:', ev.reason);
        const overlayId = 'app-error-overlay';
        let overlay = document.getElementById(overlayId);
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = overlayId;
            document.body.appendChild(overlay);
        }
        overlay.textContent = 'Unhandled promise rejection: ' + (ev.reason ? ev.reason.toString() : String(ev));
    } catch (e) {
        // ignore
    }
});

