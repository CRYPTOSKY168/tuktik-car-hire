'use client';

import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

interface BaseFieldProps {
    label?: string;
    error?: string;
    hint?: string;
    required?: boolean;
    icon?: string;
    className?: string;
}

interface InputFieldProps extends BaseFieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'date' | 'time' | 'url';
}

interface SelectFieldProps extends BaseFieldProps, Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
}

interface TextareaFieldProps extends BaseFieldProps, Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
    rows?: number;
}

const fieldBaseClasses = 'w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors';
const fieldErrorClasses = 'border-red-500 focus:ring-red-500 focus:border-red-500';
const fieldNormalClasses = 'border-gray-300';

export function InputField({
    label,
    error,
    hint,
    required,
    icon,
    className = '',
    ...props
}: InputFieldProps) {
    return (
        <div className={`space-y-1 ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-xl">
                        {icon}
                    </span>
                )}
                <input
                    className={`${fieldBaseClasses} ${error ? fieldErrorClasses : fieldNormalClasses} ${icon ? 'pl-10' : ''}`}
                    {...props}
                />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {hint && !error && <p className="text-sm text-gray-500">{hint}</p>}
        </div>
    );
}

export function SelectField({
    label,
    error,
    hint,
    required,
    icon,
    options,
    placeholder,
    className = '',
    ...props
}: SelectFieldProps) {
    return (
        <div className={`space-y-1 ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-xl">
                        {icon}
                    </span>
                )}
                <select
                    className={`${fieldBaseClasses} ${error ? fieldErrorClasses : fieldNormalClasses} ${icon ? 'pl-10' : ''} appearance-none bg-white cursor-pointer`}
                    {...props}
                >
                    {placeholder && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 pointer-events-none">
                    expand_more
                </span>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {hint && !error && <p className="text-sm text-gray-500">{hint}</p>}
        </div>
    );
}

export function TextareaField({
    label,
    error,
    hint,
    required,
    rows = 3,
    className = '',
    ...props
}: TextareaFieldProps) {
    return (
        <div className={`space-y-1 ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <textarea
                rows={rows}
                className={`${fieldBaseClasses} ${error ? fieldErrorClasses : fieldNormalClasses} resize-none`}
                {...props}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            {hint && !error && <p className="text-sm text-gray-500">{hint}</p>}
        </div>
    );
}

// Wrapper for custom form layouts
interface FormGroupProps {
    children: ReactNode;
    className?: string;
}

export function FormGroup({ children, className = '' }: FormGroupProps) {
    return <div className={`space-y-4 ${className}`}>{children}</div>;
}

export function FormRow({ children, className = '' }: FormGroupProps) {
    return <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>{children}</div>;
}
