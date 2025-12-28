'use client';

import { BookingStatus, PaymentStatus, DriverStatus, DriverSetupStatus } from '@/lib/types';
import {
    getBookingStatusConfig,
    getPaymentStatusConfig,
    getDriverStatusConfig,
    DRIVER_SETUP_STATUS_CONFIG,
} from '@/lib/constants';

export type BadgeType = 'booking' | 'payment' | 'driver' | 'driverSetup';
export type BadgeSize = 'sm' | 'md' | 'lg';

interface StatusBadgeProps {
    status: string;
    type?: BadgeType;
    size?: BadgeSize;
    showIcon?: boolean;
    showDot?: boolean;
    className?: string;
}

const sizeClasses: Record<BadgeSize, string> = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
};

const iconSizeClasses: Record<BadgeSize, string> = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
};

export function StatusBadge({
    status,
    type = 'booking',
    size = 'sm',
    showIcon = false,
    showDot = false,
    className = '',
}: StatusBadgeProps) {
    const config = getStatusConfig(status, type) as Record<string, string | undefined>;

    const dotColor = config.bgColor || config.dot || 'bg-current';

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.color} ${sizeClasses[size]} ${className}`}
        >
            {showDot && (
                <span className={`w-2 h-2 rounded-full ${dotColor}`} />
            )}
            {showIcon && config.icon && (
                <span className={`material-symbols-outlined ${iconSizeClasses[size]}`}>
                    {config.icon}
                </span>
            )}
            {config.labelEn || config.label}
        </span>
    );
}

function getStatusConfig(status: string, type: BadgeType) {
    switch (type) {
        case 'booking':
            return getBookingStatusConfig(status as BookingStatus);
        case 'payment':
            return getPaymentStatusConfig(status as PaymentStatus);
        case 'driver':
            return getDriverStatusConfig(status as DriverStatus);
        case 'driverSetup':
            return DRIVER_SETUP_STATUS_CONFIG[status as DriverSetupStatus] || {
                label: status,
                labelEn: status,
                color: 'bg-gray-100 text-gray-700',
            };
        default:
            return {
                label: status,
                labelEn: status,
                color: 'bg-gray-100 text-gray-700',
            };
    }
}

export default StatusBadge;
