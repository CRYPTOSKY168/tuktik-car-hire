'use client';

import { useState, useCallback } from 'react';

type ModalMode = 'create' | 'edit' | 'view';

interface UseFormModalOptions<T> {
    initialData?: Partial<T>;
    onSubmit?: (data: T, mode: ModalMode) => Promise<void>;
    onClose?: () => void;
}

interface UseFormModalResult<T> {
    isOpen: boolean;
    mode: ModalMode;
    formData: Partial<T>;
    loading: boolean;
    error: string | null;
    openCreate: (initialData?: Partial<T>) => void;
    openEdit: (data: T) => void;
    openView: (data: T) => void;
    close: () => void;
    setFormData: React.Dispatch<React.SetStateAction<Partial<T>>>;
    updateField: <K extends keyof T>(key: K, value: T[K]) => void;
    submit: () => Promise<void>;
    reset: () => void;
}

export function useFormModal<T extends Record<string, unknown>>({
    initialData = {},
    onSubmit,
    onClose,
}: UseFormModalOptions<T> = {}): UseFormModalResult<T> {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<ModalMode>('create');
    const [formData, setFormData] = useState<Partial<T>>(initialData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const openCreate = useCallback((data?: Partial<T>) => {
        setFormData(data || initialData);
        setMode('create');
        setError(null);
        setIsOpen(true);
    }, [initialData]);

    const openEdit = useCallback((data: T) => {
        setFormData(data);
        setMode('edit');
        setError(null);
        setIsOpen(true);
    }, []);

    const openView = useCallback((data: T) => {
        setFormData(data);
        setMode('view');
        setError(null);
        setIsOpen(true);
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
        setError(null);
        onClose?.();
    }, [onClose]);

    const updateField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    }, []);

    const submit = useCallback(async () => {
        if (!onSubmit) return;

        setLoading(true);
        setError(null);

        try {
            await onSubmit(formData as T, mode);
            close();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [formData, mode, onSubmit, close]);

    const reset = useCallback(() => {
        setFormData(initialData);
        setError(null);
    }, [initialData]);

    return {
        isOpen,
        mode,
        formData,
        loading,
        error,
        openCreate,
        openEdit,
        openView,
        close,
        setFormData,
        updateField,
        submit,
        reset,
    };
}

// Hook for confirmation dialogs
interface UseConfirmDialogResult {
    isOpen: boolean;
    title: string;
    message: string;
    confirm: () => void;
    cancel: () => void;
    showConfirm: (options: { title: string; message: string; onConfirm: () => void | Promise<void> }) => void;
}

export function useConfirmDialog(): UseConfirmDialogResult {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void | Promise<void>) | null>(null);

    const showConfirm = useCallback(
        ({ title, message, onConfirm }: { title: string; message: string; onConfirm: () => void | Promise<void> }) => {
            setTitle(title);
            setMessage(message);
            setOnConfirmCallback(() => onConfirm);
            setIsOpen(true);
        },
        []
    );

    const confirm = useCallback(async () => {
        if (onConfirmCallback) {
            await onConfirmCallback();
        }
        setIsOpen(false);
    }, [onConfirmCallback]);

    const cancel = useCallback(() => {
        setIsOpen(false);
    }, []);

    return {
        isOpen,
        title,
        message,
        confirm,
        cancel,
        showConfirm,
    };
}

export default useFormModal;
