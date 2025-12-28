'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        // Return mock functions if context not available
        return {
            showToast: () => { },
            success: (title: string) => alert(title),
            error: (title: string) => alert(title),
            warning: (title: string) => alert(title),
            info: (title: string) => alert(title),
        };
    }
    return context;
}

const toastConfig = {
    success: {
        icon: 'check_circle',
        bg: 'bg-gradient-to-r from-emerald-500 to-green-600',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        borderColor: 'border-emerald-200',
    },
    error: {
        icon: 'error',
        bg: 'bg-gradient-to-r from-red-500 to-rose-600',
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
        borderColor: 'border-red-200',
    },
    warning: {
        icon: 'warning',
        bg: 'bg-gradient-to-r from-amber-500 to-orange-600',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        borderColor: 'border-amber-200',
    },
    info: {
        icon: 'info',
        bg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        borderColor: 'border-blue-200',
    },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    const config = toastConfig[toast.type];

    useEffect(() => {
        const timer = setTimeout(() => {
            onRemove(toast.id);
        }, toast.duration || 4000);
        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, onRemove]);

    return (
        <div className="animate-in slide-in-from-right fade-in duration-300 mb-3">
            <div className="bg-white rounded-2xl shadow-2xl shadow-gray-900/10 border border-gray-100 overflow-hidden min-w-[320px] max-w-[420px]">
                {/* Top gradient bar */}
                <div className={`h-1 ${config.bg}`}></div>

                <div className="p-4 flex items-start gap-3">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <span className={`material-symbols-outlined ${config.iconColor}`}>{config.icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-800 text-sm">{toast.title}</h4>
                        {toast.message && (
                            <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{toast.message}</p>
                        )}
                    </div>

                    {/* Close button */}
                    <button
                        onClick={() => onRemove(toast.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors flex-shrink-0"
                    >
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                {/* Progress bar */}
                <div className="h-0.5 bg-gray-100">
                    <div
                        className={`h-full ${config.bg} animate-shrink`}
                        style={{
                            animationDuration: `${toast.duration || 4000}ms`,
                            animationTimingFunction: 'linear'
                        }}
                    ></div>
                </div>
            </div>
        </div>
    );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((type: ToastType, title: string, message?: string, duration?: number) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, type, title, message, duration: duration || 4000 }]);
    }, []);

    const success = useCallback((title: string, message?: string) => {
        showToast('success', title, message);
    }, [showToast]);

    const error = useCallback((title: string, message?: string) => {
        showToast('error', title, message);
    }, [showToast]);

    const warning = useCallback((title: string, message?: string) => {
        showToast('warning', title, message);
    }, [showToast]);

    const info = useCallback((title: string, message?: string) => {
        showToast('info', title, message);
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[9999] pointer-events-none">
                <div className="flex flex-col items-end pointer-events-auto">
                    {toasts.map((toast) => (
                        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                    ))}
                </div>
            </div>
        </ToastContext.Provider>
    );
}
