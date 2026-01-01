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
