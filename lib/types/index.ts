// ====================================
// TukTik Car Rental - Type Definitions
// ====================================

import { Timestamp } from 'firebase/firestore';

// ============ ENUMS ============

export enum BookingStatus {
    AWAITING_PAYMENT = 'awaiting_payment',
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    DRIVER_ASSIGNED = 'driver_assigned',
    DRIVER_EN_ROUTE = 'driver_en_route',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

export enum PaymentMethod {
    CARD = 'card',
    PROMPTPAY = 'promptpay',
    BANK_TRANSFER = 'bank_transfer',
    CASH = 'cash',
}

export enum PaymentStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',  // Card payment started but not completed
    PAID = 'paid',
    FAILED = 'failed',
    REFUNDED = 'refunded',
    CANCELLED = 'cancelled',    // Booking cancelled (no payment made or payment incomplete)
}

export enum DriverStatus {
    AVAILABLE = 'available',
    BUSY = 'busy',
    OFFLINE = 'offline',
}

export enum DriverSetupStatus {
    PENDING_REVIEW = 'pending_review',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

export enum UserRole {
    USER = 'user',
    ADMIN = 'admin',
}

export enum VehicleType {
    SEDAN = 'sedan',
    SUV = 'suv',
    VAN = 'van',
    LUXURY = 'luxury',
}

export enum NotificationType {
    BOOKING = 'booking',
    PAYMENT = 'payment',
    SYSTEM = 'system',
    PROMOTION = 'promotion',
}

// Rating reason codes (for low ratings ≤3 stars)
export enum RatingReasonCode {
    // Customer to Driver reasons
    LATE = 'late',
    DIRTY_CAR = 'dirty_car',
    BAD_DRIVING = 'bad_driving',
    RUDE = 'rude',
    WRONG_ROUTE = 'wrong_route',
    // Driver to Customer reasons
    NO_SHOW = 'no_show',
    MESSY = 'messy',
    // Common
    OTHER = 'other',
}

// Cancellation reason codes (Passenger Rules)
export enum CancellationReason {
    // Customer initiated
    CHANGED_MIND = 'changed_mind',           // เปลี่ยนใจ
    FOUND_ALTERNATIVE = 'found_alternative', // หาทางเลือกอื่น
    DRIVER_TOO_FAR = 'driver_too_far',       // คนขับไกลเกินไป
    DRIVER_LATE = 'driver_late',             // คนขับมาช้า
    WRONG_LOCATION = 'wrong_location',       // ระบุที่ผิด
    EMERGENCY = 'emergency',                 // เหตุฉุกเฉิน
    // Driver initiated
    CUSTOMER_NO_SHOW = 'customer_no_show',   // ลูกค้าไม่มา
    CUSTOMER_UNREACHABLE = 'customer_unreachable', // ติดต่อลูกค้าไม่ได้
    UNSAFE_PICKUP = 'unsafe_pickup',         // จุดรับไม่ปลอดภัย
    // System/Admin
    DRIVER_UNAVAILABLE = 'driver_unavailable', // ไม่มีคนขับว่าง
    SYSTEM_ERROR = 'system_error',           // ระบบมีปัญหา
    ADMIN_CANCELLED = 'admin_cancelled',     // Admin ยกเลิก
    OTHER = 'other',
}

// ============ INTERFACES ============

// Location coordinates interface for tracking
export interface GeoCoordinates {
    lat: number;
    lng: number;
}

// Driver current location with tracking info
export interface DriverLocation {
    lat: number;
    lng: number;
    heading?: number;      // Direction (0-360 degrees)
    speed?: number;        // Speed in km/h
    timestamp: Timestamp | Date;
}

export interface StatusHistoryEntry {
    status: string;
    timestamp: Timestamp | { seconds: number };
    note?: string;
    updatedBy?: 'admin' | 'driver' | 'system' | string;
    rejectedBy?: string;  // Driver ID who rejected (for auto re-match)
}

// Rating from customer to driver
export interface CustomerRating {
    stars: number;               // 1-5
    reasons?: RatingReasonCode[];  // Required if stars <= 3
    comment?: string;
    tip?: number;                // Amount in THB
    ratedAt: Timestamp | Date;
}

// Rating from driver to customer (optional)
export interface DriverRating {
    stars: number;               // 1-5
    reasons?: RatingReasonCode[];
    comment?: string;
    ratedAt: Timestamp | Date;
}

// Combined ratings for a booking
export interface BookingRatings {
    customerToDriver?: CustomerRating;
    driverToCustomer?: DriverRating;
}

export interface BookingDriver {
    driverId: string;
    name: string;
    phone: string;
    vehiclePlate?: string;
    vehicleModel?: string;
    vehicleColor?: string;
}

export interface Booking {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    pickupLocation: string;
    dropoffLocation: string;
    pickupCoordinates?: GeoCoordinates;   // GPS coordinates of pickup
    dropoffCoordinates?: GeoCoordinates;  // GPS coordinates of dropoff
    pickupLocationId?: string;             // Location ID for restoring map
    dropoffLocationId?: string;            // Location ID for restoring map
    distance?: number;                     // Distance in km
    estimatedDuration?: number;            // Estimated duration in minutes
    pickupDate: string;
    pickupTime: string;
    vehicleId: string;
    vehicleName: string;
    vehiclePrice?: number;
    vehicle?: { name: string; price: number };
    totalCost: number;
    status: BookingStatus | string;
    paymentMethod: PaymentMethod | string;
    paymentStatus: PaymentStatus | string;
    slipUrl?: string;

    // Stripe Payment Fields
    stripePaymentIntentId?: string;    // PaymentIntent ID for embedded card payment
    stripeRefundId?: string;           // Refund ID if refunded
    paymentCompletedAt?: Timestamp | Date;  // When payment was completed
    refundedAt?: Timestamp | Date;     // When refund was processed
    refundReason?: string;             // Reason for refund

    driver?: BookingDriver;
    statusHistory?: StatusHistoryEntry[];
    ratings?: BookingRatings;           // Rating system
    notes?: string;

    // Auto Re-match System
    rejectedDrivers?: string[];         // Driver IDs who rejected this booking
    matchAttempts?: number;             // Number of driver match attempts
    searchStartedAt?: Timestamp | Date; // When driver search started
    lastMatchAttemptAt?: Timestamp | Date; // When last match was attempted

    // Cancellation System (Passenger Rules)
    cancelledAt?: Timestamp | Date;                     // When booking was cancelled
    cancelledBy?: 'customer' | 'driver' | 'admin' | 'system';
    cancellationReason?: CancellationReason | string;
    cancellationFee?: number;                           // Fee charged (THB)
    cancellationFeeStatus?: 'pending' | 'charged' | 'waived' | 'refunded';
    driverAssignedAt?: Timestamp | Date;                // When driver was assigned (for free cancel window)

    // No-Show System
    driverArrivedAt?: Timestamp | Date;                 // When driver arrived at pickup
    noShowReportedAt?: Timestamp | Date;                // When no-show was reported
    isNoShow?: boolean;
    noShowFee?: number;

    // Dispute System
    hasDispute?: boolean;
    disputeId?: string;
    disputeStatus?: 'pending' | 'investigating' | 'resolved' | 'rejected';
    disputeReason?: string;
    disputeResolvedAt?: Timestamp | Date;

    createdAt: Timestamp | Date | string;
    updatedAt?: Timestamp | Date;
}

// Auto Re-match Configuration
export const REMATCH_CONFIG = {
    MAX_ATTEMPTS: 3,                    // Maximum driver match attempts
    DRIVER_RESPONSE_TIMEOUT: 20000,     // 20 seconds for driver to respond
    TOTAL_SEARCH_TIMEOUT: 180000,       // 3 minutes total search time
    DELAY_BETWEEN_MATCHES: 3000,        // 3 seconds delay before next match
};

export interface Driver {
    id: string;
    userId?: string;
    name: string;
    phone: string;
    email?: string;
    vehiclePlate: string;
    vehicleModel: string;
    vehicleColor: string;
    licenseNumber?: string;
    idCardUrl?: string;
    driverLicenseUrl?: string;
    photo?: string;
    notes?: string;
    status: DriverStatus | string;
    setupStatus?: DriverSetupStatus | string;
    totalTrips: number;
    totalEarnings: number;  // รายได้รวมทั้งหมด (บาท)
    totalTips?: number;     // ทิปรวมทั้งหมด (บาท)
    rating: number;
    ratingCount: number;
    isActive: boolean;
    currentLocation?: DriverLocation;  // Real-time GPS location
    createdAt?: Timestamp | Date;
    updatedAt?: Timestamp | Date;
}

export interface Vehicle {
    id: string;
    name: string;
    type: VehicleType | string;
    seats: number;
    price: number;
    priceUSD?: number;
    image: string;
    features: string[];
    description?: string;
    desc?: string;
    tag?: string;
    passengers?: number;
    capacity?: number;
    luggage?: number;
    transmission?: string;
    likes?: number;
    reviews?: number;
    rating?: number;
    ratingCount?: number;
    isActive: boolean;
    isFixedPrice?: boolean;
    createdAt?: Timestamp | Date;
    updatedAt?: Timestamp | Date;
}

export interface User {
    id: string;
    uid: string;
    email: string;
    displayName?: string;
    phone?: string;
    photoURL?: string;
    provider: 'email' | 'phone' | 'google';
    role: UserRole | string;
    isActive: boolean;
    isApprovedDriver?: boolean;
    driverId?: string;
    language?: 'en' | 'th';
    createdAt?: Timestamp | Date;
    updatedAt?: Timestamp | Date;
}

export interface Location {
    id: string;
    name: string | { en: string; th: string };
    nameTh?: string;
    type: 'airport' | 'hotel' | 'city' | 'landmark' | 'other' | string;
    address?: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
    isActive: boolean;
    isPopular?: boolean;
    createdAt?: Timestamp | Date;
    updatedAt?: Timestamp | Date;
}

export interface Route {
    id: string;
    originId: string;
    origin: string;              // ชื่อต้นทาง (fallback/display)
    destinationId: string;
    destination: string;         // ชื่อปลายทาง (fallback/display)
    prices: {                    // ราคาตามประเภทรถ
        sedan: number;
        suv: number;
        van: number;
        luxury: number;
        minibus: number;
    };
    estimatedTime?: number;      // in minutes
    distance?: number;           // in km
    isActive: boolean;
    createdAt?: Timestamp | Date;
    updatedAt?: Timestamp | Date;
}

export interface Notification {
    id: string;
    userId: string;
    type: NotificationType | string;
    title: string;
    message: string;
    data?: Record<string, any>;
    isRead?: boolean;
    read?: boolean;
    createdAt: Timestamp | Date;
}

export interface Voucher {
    id: string;
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minPurchase?: number;
    maxDiscount?: number;
    usageLimit?: number;
    usedCount: number;
    expiresAt?: Timestamp | Date;
    isActive: boolean;
    createdAt?: Timestamp | Date;
}

export interface UserVoucher {
    id: string;
    voucherId?: string;
    code: string;
    discount?: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    description?: string;
    expiresAt?: Timestamp | Date;
    minPurchase?: number;
    isUsed?: boolean;
    used?: boolean;
    usedAt?: Timestamp | Date;
    assignedAt: Timestamp | Date;
}

export interface SavedLocation {
    id: string;
    name: string;
    address: string;
    type: 'home' | 'work' | 'airport' | 'other';
    coordinates?: {
        lat: number;
        lng: number;
    };
    createdAt?: Timestamp | Date;
}

// ============ API RESPONSE TYPES ============

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

// ============ FORM DATA TYPES ============

export interface BookingFormData {
    pickupLocation: string;
    dropoffLocation: string;
    pickupDate: string;
    pickupTime: string;
    vehicleId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
}

export interface DriverFormData {
    name: string;
    phone: string;
    email?: string;
    vehiclePlate: string;
    vehicleModel: string;
    vehicleColor: string;
    licenseNumber?: string;
}

export interface VehicleFormData {
    name: string;
    type: string;
    seats: number;
    price: number;
    image?: string;
    features: string[];
    description?: string;
}

// ============ COMPONENT PROP TYPES ============

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface StatusBadgeProps {
    status: string;
    type?: 'booking' | 'payment' | 'driver';
    size?: 'sm' | 'md' | 'lg';
}

export interface DataTableColumn<T> {
    key: keyof T | string;
    header: string;
    render?: (item: T) => React.ReactNode;
    sortable?: boolean;
    width?: string;
}

export interface DataTableProps<T> {
    data: T[];
    columns: DataTableColumn<T>[];
    searchable?: boolean;
    searchKeys?: (keyof T)[];
    onRowClick?: (item: T) => void;
    loading?: boolean;
    emptyMessage?: string;
}

// ============ SYSTEM CONFIG TYPES ============

export interface BookingConfig {
    maxRematchAttempts: number;           // จำนวนครั้งที่หาคนขับใหม่ (default: 3)
    driverResponseTimeout: number;        // ms - เวลารอคนขับกดรับงาน (default: 20000)
    totalSearchTimeout: number;           // ms - เวลารวมในการหาคนขับ (default: 180000)
    delayBetweenMatches: number;          // ms - รอก่อนหาคนขับคนใหม่ (default: 3000)
    cancellableStatuses: string[];        // สถานะที่ยกเลิกได้
}

export interface PricingConfig {
    baseFare: number;                     // ค่าโดยสารขั้นต่ำ (default: 50)
    perKmRate: number;                    // ราคาต่อ กม. (default: 15)
    platformFeePercent: number;           // ค่า commission % (default: 0)
    minBookingAmount: number;             // ยอดจองขั้นต่ำ (default: 0)
}

export interface PaymentConfig {
    enableCash: boolean;                  // เปิด/ปิดจ่ายเงินสด
    enableCard: boolean;                  // เปิด/ปิดจ่ายบัตร
    autoRefundOnCancel: boolean;          // คืนเงินอัตโนมัติเมื่อยกเลิก
}

export interface RatingConfig {
    maxTipAmount: number;                 // ทิปสูงสุดต่อเที่ยว (default: 10000)
    maxCommentLength: number;             // ความยาว comment สูงสุด (default: 500)
    bayesianPriorMean: number;            // ค่าเริ่มต้น rating (default: 4.0)
    bayesianMinReviews: number;           // จำนวน review ขั้นต่ำ (default: 5)
    lowRatingThreshold: number;           // ต้องให้เหตุผลถ้าต่ำกว่านี้ (default: 3)
    tipOptions: number[];                 // ตัวเลือกทิป (default: [0, 20, 50, 100])
    enableTipping: boolean;               // เปิด/ปิดระบบทิป (default: true)
}

export interface RateLimitConfig {
    standardApiLimit: number;             // req/min สำหรับ API ทั่วไป (default: 10)
    authApiLimit: number;                 // req/min สำหรับ login (default: 5)
    paymentApiLimit: number;              // req/min สำหรับ payment (default: 10)
    driverLocationApiLimit: number;       // req/min สำหรับ GPS updates (default: 60)
    sensitiveApiLimit: number;            // req/min สำหรับ sensitive ops (default: 3)
}

export interface DriverConfig {
    allowSelfBooking: boolean;            // คนขับจองตัวเองได้ไหม (default: false)
    allowMultipleJobs: boolean;           // รับหลายงานพร้อมกัน (default: false)
    autoResumeDelayMs: number;            // delay ก่อน resume status (default: 10000)
}

export interface MapConfig {
    defaultCenterLat: number;             // ศูนย์กลางแผนที่ lat (default: 13.7563 - กทม.)
    defaultCenterLng: number;             // ศูนย์กลางแผนที่ lng (default: 100.5018)
    defaultZoom: number;                  // zoom level (default: 12)
    gpsTimeoutMs: number;                 // GPS timeout (default: 15000)
}

// Passenger Rules Configuration (Cancellation, No-Show, Dispute)
export interface PassengerConfig {
    // Cancellation Rules
    freeCancellationWindowMs: number;     // ยกเลิกฟรีภายในกี่ ms หลังได้คนขับ (default: 180000 = 3 นาที)
    lateCancellationFee: number;          // ค่าธรรมเนียมยกเลิกหลังหมดเวลา (default: 50 บาท)
    enableCancellationFee: boolean;       // เปิด/ปิดการเก็บค่ายกเลิก

    // No-Show Rules
    noShowWaitTimeMs: number;             // รอลูกค้ากี่ ms ก่อนแจ้ง no-show (default: 300000 = 5 นาที)
    noShowFee: number;                    // ค่าธรรมเนียม no-show (default: 50 บาท)
    enableNoShowFee: boolean;             // เปิด/ปิดการเก็บค่า no-show

    // Fee Distribution
    cancellationFeeToDriverPercent: number; // % ค่ายกเลิกที่ให้คนขับ (default: 100)
    noShowFeeToDriverPercent: number;       // % ค่า no-show ที่ให้คนขับ (default: 100)

    // Driver Late Waiver
    driverLateThresholdMs: number;        // คนขับมาช้าเกินกี่ ms ลูกค้ายกเลิกฟรี (default: 300000 = 5 นาที)
    enableDriverLateWaiver: boolean;      // เปิด/ปิดการยกเว้นค่าธรรมเนียมเมื่อคนขับมาช้า

    // Booking Limits
    maxActiveBookings: number;            // จอง active ได้สูงสุดกี่รายการ (default: 1)
    maxCancellationsPerDay: number;       // ยกเลิกได้สูงสุดกี่ครั้ง/วัน (default: 3)
    enableCancellationLimit: boolean;     // เปิด/ปิดการจำกัดจำนวนยกเลิก

    // Dispute Rules
    disputeWindowHours: number;           // ขอ dispute ได้ภายในกี่ชม. หลังเสร็จ trip (default: 48)
    enableDispute: boolean;               // เปิด/ปิดระบบ dispute
}

export interface SystemConfig {
    booking: BookingConfig;
    pricing: PricingConfig;
    payment: PaymentConfig;
    rating: RatingConfig;
    rateLimit: RateLimitConfig;
    driver: DriverConfig;
    map: MapConfig;
    passenger: PassengerConfig;  // Passenger Rules (Cancellation, No-Show, Dispute)
    updatedAt?: Timestamp | Date;
    updatedBy?: string;
}

// Default system configuration
export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
    booking: {
        maxRematchAttempts: 3,
        driverResponseTimeout: 20000,
        totalSearchTimeout: 180000,
        delayBetweenMatches: 3000,
        cancellableStatuses: ['pending', 'confirmed', 'driver_assigned'],
    },
    pricing: {
        baseFare: 50,
        perKmRate: 15,
        platformFeePercent: 0,
        minBookingAmount: 0,
    },
    payment: {
        enableCash: true,
        enableCard: true,
        autoRefundOnCancel: true,
    },
    rating: {
        maxTipAmount: 10000,
        maxCommentLength: 500,
        bayesianPriorMean: 4.0,
        bayesianMinReviews: 5,
        lowRatingThreshold: 3,
        tipOptions: [0, 20, 50, 100],
        enableTipping: true,
    },
    rateLimit: {
        standardApiLimit: 10,
        authApiLimit: 5,
        paymentApiLimit: 10,
        driverLocationApiLimit: 60,
        sensitiveApiLimit: 3,
    },
    driver: {
        allowSelfBooking: false,
        allowMultipleJobs: false,
        autoResumeDelayMs: 10000,
    },
    map: {
        defaultCenterLat: 13.7563,
        defaultCenterLng: 100.5018,
        defaultZoom: 12,
        gpsTimeoutMs: 15000,
    },
    passenger: {
        // Cancellation Rules
        freeCancellationWindowMs: 180000,     // 3 นาที หลังได้คนขับ
        lateCancellationFee: 50,              // 50 บาท
        enableCancellationFee: true,
        // No-Show Rules
        noShowWaitTimeMs: 300000,             // 5 นาที รอลูกค้า
        noShowFee: 50,                        // 50 บาท
        enableNoShowFee: true,
        // Fee Distribution
        cancellationFeeToDriverPercent: 100,  // 100% ให้คนขับ
        noShowFeeToDriverPercent: 100,        // 100% ให้คนขับ
        // Driver Late Waiver
        driverLateThresholdMs: 300000,        // 5 นาที คนขับมาช้า
        enableDriverLateWaiver: true,
        // Booking Limits
        maxActiveBookings: 1,                 // จองได้ 1 รายการ
        maxCancellationsPerDay: 10,           // ยกเลิกได้ 10 ครั้ง/วัน (เพิ่มสำหรับ testing)
        enableCancellationLimit: false,       // ปิด limit ไว้ก่อน (เปิดใน admin settings ได้)
        // Dispute Rules
        disputeWindowHours: 48,               // 48 ชม. หลังเสร็จ trip
        enableDispute: true,
    },
};
