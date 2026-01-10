import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext();

/**
 * Hook to access toast notifications
 * @returns {{ showToast, showSuccess, showError, showWarning, showInfo }}
 */
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

/**
 * Toast Provider Component
 * Wrap your app with this to enable toast notifications
 */
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message, type = 'info', duration = 5000) => {
        const id = Date.now() + Math.random();
        const toast = { id, message, type };

        setToasts(prev => [...prev, toast]);

        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }

        return id;
    }, [removeToast]);

    const showSuccess = useCallback((message, duration) =>
        showToast(message, 'success', duration), [showToast]);

    const showError = useCallback((message, duration = 8000) =>
        showToast(message, 'error', duration), [showToast]);

    const showWarning = useCallback((message, duration) =>
        showToast(message, 'warning', duration), [showToast]);

    const showInfo = useCallback((message, duration) =>
        showToast(message, 'info', duration), [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
};

/**
 * Internal Toast Container Component
 */
const ToastContainer = ({ toasts, onRemove }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] space-y-2 max-w-md">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
};

/**
 * Individual Toast Item
 */
const ToastItem = ({ toast, onRemove }) => {
    const config = {
        success: {
            bg: 'bg-emerald-500/90',
            border: 'border-emerald-400',
            icon: <CheckCircle className="w-5 h-5" />
        },
        error: {
            bg: 'bg-red-500/90',
            border: 'border-red-400',
            icon: <AlertCircle className="w-5 h-5" />
        },
        warning: {
            bg: 'bg-amber-500/90',
            border: 'border-amber-400',
            icon: <AlertTriangle className="w-5 h-5" />
        },
        info: {
            bg: 'bg-blue-500/90',
            border: 'border-blue-400',
            icon: <Info className="w-5 h-5" />
        }
    };

    const { bg, border, icon } = config[toast.type] || config.info;

    return (
        <div
            className={`${bg} ${border} border backdrop-blur-sm text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-in-right`}
            role="alert"
        >
            {icon}
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
                onClick={() => onRemove(toast.id)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export default ToastProvider;
