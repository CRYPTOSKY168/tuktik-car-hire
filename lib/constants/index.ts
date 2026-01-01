// ====================================
// TukTik Car Rental - Constants
// ====================================

import { BookingStatus, PaymentStatus, DriverStatus, DriverSetupStatus } from '@/lib/types';

// ============ BOOKING STATUSES ============

export const BOOKING_STATUS_CONFIG = {
    [BookingStatus.AWAITING_PAYMENT]: {
        label: 'รอชำระเงิน',
        labelEn: 'Awaiting Payment',
        color: 'bg-yellow-100 text-yellow-700',
        bgColor: 'bg-yellow-500',
        icon: 'payments',
    },
    [BookingStatus.PENDING]: {
        label: 'รอยืนยัน',
        labelEn: 'Pending',
        color: 'bg-orange-100 text-orange-700',
        bgColor: 'bg-orange-500',
        icon: 'pending',
    },
    [BookingStatus.CONFIRMED]: {
        label: 'ยืนยันแล้ว',
        labelEn: 'Confirmed',
        color: 'bg-blue-100 text-blue-700',
        bgColor: 'bg-blue-500',
        icon: 'check_circle',
    },
    [BookingStatus.DRIVER_ASSIGNED]: {
        label: 'มอบหมายคนขับแล้ว',
        labelEn: 'Driver Assigned',
        color: 'bg-purple-100 text-purple-700',
        bgColor: 'bg-purple-500',
        icon: 'person_pin',
    },
    [BookingStatus.DRIVER_EN_ROUTE]: {
        label: 'คนขับกำลังไป',
        labelEn: 'Driver En Route',
        color: 'bg-indigo-100 text-indigo-700',
        bgColor: 'bg-indigo-500',
        icon: 'directions_car',
    },
    [BookingStatus.IN_PROGRESS]: {
        label: 'กำลังเดินทาง',
        labelEn: 'In Progress',
        color: 'bg-cyan-100 text-cyan-700',
        bgColor: 'bg-cyan-500',
        icon: 'local_taxi',
    },
    [BookingStatus.COMPLETED]: {
        label: 'เสร็จสิ้น',
        labelEn: 'Completed',
        color: 'bg-green-100 text-green-700',
        bgColor: 'bg-green-500',
        icon: 'task_alt',
    },
    [BookingStatus.CANCELLED]: {
        label: 'ยกเลิก',
        labelEn: 'Cancelled',
        color: 'bg-red-100 text-red-700',
        bgColor: 'bg-red-500',
        icon: 'cancel',
    },
} as const;

// ============ PAYMENT STATUSES ============

export const PAYMENT_STATUS_CONFIG = {
    [PaymentStatus.PENDING]: {
        label: 'รอชำระ',
        labelEn: 'Pending',
        color: 'bg-yellow-100 text-yellow-700',
        icon: 'schedule',
    },
    [PaymentStatus.PROCESSING]: {
        label: 'กำลังดำเนินการ',
        labelEn: 'Processing',
        color: 'bg-blue-100 text-blue-700',
        icon: 'sync',
    },
    [PaymentStatus.PAID]: {
        label: 'ชำระแล้ว',
        labelEn: 'Paid',
        color: 'bg-green-100 text-green-700',
        icon: 'paid',
    },
    [PaymentStatus.FAILED]: {
        label: 'ล้มเหลว',
        labelEn: 'Failed',
        color: 'bg-red-100 text-red-700',
        icon: 'error',
    },
    [PaymentStatus.REFUNDED]: {
        label: 'คืนเงินแล้ว',
        labelEn: 'Refunded',
        color: 'bg-gray-100 text-gray-700',
        icon: 'undo',
    },
    [PaymentStatus.CANCELLED]: {
        label: 'ยกเลิก',
        labelEn: 'Cancelled',
        color: 'bg-gray-100 text-gray-700',
        icon: 'cancel',
    },
} as const;

// ============ DRIVER STATUSES ============

export const DRIVER_STATUS_CONFIG = {
    [DriverStatus.AVAILABLE]: {
        label: 'พร้อมรับงาน',
        labelEn: 'Available',
        color: 'bg-green-100 text-green-700',
        bgColor: 'bg-green-500',
        icon: 'check_circle',
    },
    [DriverStatus.BUSY]: {
        label: 'กำลังวิ่งงาน',
        labelEn: 'Busy',
        color: 'bg-orange-100 text-orange-700',
        bgColor: 'bg-orange-500',
        icon: 'local_taxi',
    },
    [DriverStatus.OFFLINE]: {
        label: 'ออฟไลน์',
        labelEn: 'Offline',
        color: 'bg-gray-100 text-gray-700',
        bgColor: 'bg-gray-500',
        icon: 'do_not_disturb',
    },
} as const;

// ============ DRIVER SETUP STATUSES ============

export const DRIVER_SETUP_STATUS_CONFIG = {
    [DriverSetupStatus.PENDING_REVIEW]: {
        label: 'รอตรวจสอบ',
        labelEn: 'Pending Review',
        color: 'bg-orange-100 text-orange-700',
        icon: 'rate_review',
    },
    [DriverSetupStatus.APPROVED]: {
        label: 'อนุมัติแล้ว',
        labelEn: 'Approved',
        color: 'bg-green-100 text-green-700',
        icon: 'verified',
    },
    [DriverSetupStatus.REJECTED]: {
        label: 'ถูกปฏิเสธ',
        labelEn: 'Rejected',
        color: 'bg-red-100 text-red-700',
        icon: 'cancel',
    },
} as const;

// ============ ACTIVE BOOKING STATUSES ============

export const ACTIVE_BOOKING_STATUSES = [
    BookingStatus.AWAITING_PAYMENT,
    BookingStatus.PENDING,
    BookingStatus.CONFIRMED,
    BookingStatus.DRIVER_ASSIGNED,
    BookingStatus.DRIVER_EN_ROUTE,
    BookingStatus.IN_PROGRESS,
] as const;

export const COMPLETED_BOOKING_STATUSES = [
    BookingStatus.COMPLETED,
    BookingStatus.CANCELLED,
] as const;

// ============ DATE FILTERS ============

export const DATE_FILTERS = {
    all: { label: 'ทั้งหมด', labelEn: 'All', days: null },
    today: { label: 'วันนี้', labelEn: 'Today', days: 0 },
    tomorrow: { label: 'พรุ่งนี้', labelEn: 'Tomorrow', days: 1 },
    week: { label: '7 วัน', labelEn: '7 Days', days: 7 },
    month: { label: '30 วัน', labelEn: '30 Days', days: 30 },
} as const;

// ============ PAYMENT METHODS ============

export const PAYMENT_METHODS = {
    card: { label: 'บัตรเครดิต/เดบิต', labelEn: 'Credit/Debit Card', icon: 'credit_card' },
    promptpay: { label: 'พร้อมเพย์', labelEn: 'PromptPay', icon: 'qr_code_2' },
    bank_transfer: { label: 'โอนเงิน', labelEn: 'Bank Transfer', icon: 'account_balance' },
    cash: { label: 'เงินสด', labelEn: 'Cash', icon: 'payments' },
} as const;

// ============ DEFAULT VALUES ============

export const DEFAULT_VALUES = {
    VEHICLE_RATING: 5.0,
    DRIVER_RATING: 5.0,
    INITIAL_RATING_COUNT: 0,
    INITIAL_TRIP_COUNT: 0,
    MAX_IMAGE_WIDTH: 800,
    MAX_IMAGE_HEIGHT: 800,
    IMAGE_QUALITY: 0.5,
    NOTIFICATION_LIMIT: 10,
    AUTO_REFRESH_INTERVAL: 30000, // 30 seconds
} as const;

// ============ COLLECTION NAMES ============

export const COLLECTIONS = {
    BOOKINGS: 'bookings',
    USERS: 'users',
    DRIVERS: 'drivers',
    VEHICLES: 'vehicles',
    LOCATIONS: 'locations',
    ROUTES: 'routes',
    NOTIFICATIONS: 'notifications',
    ADMIN_NOTIFICATIONS: 'admin_notifications',
    VOUCHERS: 'vouchers',
    SETTINGS: 'settings',
    CUSTOMERS: 'customers',
} as const;

// ============ LOCAL STORAGE KEYS ============

export const STORAGE_KEYS = {
    LOCAL_BOOKINGS: 'local_bookings',
    THEME: 'theme',
    LANGUAGE: 'language',
    CURRENCY: 'currency',
} as const;

// ============ API ROUTES ============

export const API_ROUTES = {
    ADMIN_USERS: '/api/admin/users',
    ADMIN_DRIVERS: '/api/admin/drivers',
    DRIVER_SETUP: '/api/driver/setup',
    STRIPE_CHECKOUT: '/api/stripe/checkout',
    STRIPE_WEBHOOK: '/api/stripe/webhook',
} as const;

// ============ VEHICLE TYPES ============

export const VEHICLE_TYPES = {
    sedan: { label: 'รถเก๋ง', labelEn: 'Sedan', icon: 'directions_car', seats: '4' },
    suv: { label: 'รถ SUV', labelEn: 'SUV', icon: 'directions_car', seats: '7' },
    van: { label: 'รถตู้', labelEn: 'Van', icon: 'airport_shuttle', seats: '10' },
    luxury: { label: 'รถหรู', labelEn: 'Luxury', icon: 'star', seats: '4' },
} as const;

// ============ STATUS TRANSITIONS ============

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
    [BookingStatus.AWAITING_PAYMENT]: [BookingStatus.PENDING, BookingStatus.CANCELLED],
    [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
    [BookingStatus.CONFIRMED]: [BookingStatus.DRIVER_ASSIGNED, BookingStatus.CANCELLED],
    [BookingStatus.DRIVER_ASSIGNED]: [BookingStatus.DRIVER_EN_ROUTE, BookingStatus.CANCELLED],
    [BookingStatus.DRIVER_EN_ROUTE]: [BookingStatus.IN_PROGRESS],
    [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED],
    [BookingStatus.COMPLETED]: [],
    [BookingStatus.CANCELLED]: [],
};

export const DRIVER_STATUS_TRANSITIONS: Record<string, string[]> = {
    [BookingStatus.DRIVER_ASSIGNED]: [BookingStatus.DRIVER_EN_ROUTE],
    [BookingStatus.DRIVER_EN_ROUTE]: [BookingStatus.IN_PROGRESS],
    [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED],
};

// ============ HELPER FUNCTIONS ============

export function getBookingStatusConfig(status: string) {
    return BOOKING_STATUS_CONFIG[status as BookingStatus] || {
        label: status,
        labelEn: status,
        color: 'bg-gray-100 text-gray-700',
        bgColor: 'bg-gray-500',
        icon: 'help',
    };
}

export function getPaymentStatusConfig(status: string) {
    return PAYMENT_STATUS_CONFIG[status as PaymentStatus] || {
        label: status,
        labelEn: status,
        color: 'bg-gray-100 text-gray-700',
        icon: 'help',
    };
}

export function getDriverStatusConfig(status: string) {
    return DRIVER_STATUS_CONFIG[status as DriverStatus] || {
        label: status,
        labelEn: status,
        color: 'bg-gray-100 text-gray-700',
        bgColor: 'bg-gray-500',
        icon: 'help',
    };
}

export function isActiveBookingStatus(status: string): boolean {
    return ACTIVE_BOOKING_STATUSES.some(s => s === status);
}

export function canTransitionTo(currentStatus: string, newStatus: string): boolean {
    const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
    return validTransitions?.includes(newStatus) || false;
}

/**
 * Get timestamp in seconds from various timestamp formats
 * Handles Firestore Timestamp, Date, string, or object with seconds property
 */
export function getTimestampSeconds(timestamp: any): number {
    if (!timestamp) return 0;
    // Firestore Timestamp
    if (typeof timestamp.seconds === 'number') return timestamp.seconds;
    // Date object
    if (timestamp instanceof Date) return Math.floor(timestamp.getTime() / 1000);
    // ISO string
    if (typeof timestamp === 'string') return Math.floor(new Date(timestamp).getTime() / 1000);
    // Firestore Timestamp with toDate method
    if (typeof timestamp.toDate === 'function') return Math.floor(timestamp.toDate().getTime() / 1000);
    return 0;
}

/**
 * Format timestamp to locale date string
 */
export function formatTimestamp(timestamp: any, locale: string = 'th-TH'): string {
    const seconds = getTimestampSeconds(timestamp);
    if (seconds === 0) return '-';
    return new Date(seconds * 1000).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
