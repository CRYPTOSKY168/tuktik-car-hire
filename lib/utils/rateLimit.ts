/**
 * Rate Limiting Utility
 * =====================
 * จำกัดจำนวน requests ต่อ user/IP เพื่อป้องกัน brute force และ DDoS
 *
 * Usage:
 *   import { createRateLimiter, checkRateLimit } from '@/lib/utils/rateLimit';
 *
 *   // Option 1: Use with specific limiter
 *   const limiter = createRateLimiter({ maxRequests: 10, windowMs: 60000 });
 *   if (!limiter.check(userId)) {
 *       return { error: 'Rate limit exceeded' };
 *   }
 *
 *   // Option 2: Use default limiter (10 req/min)
 *   if (!checkRateLimit(userId)) {
 *       return { error: 'Rate limit exceeded' };
 *   }
 *
 * Note: This is an in-memory implementation. For production with multiple
 * server instances, consider using Redis or a similar distributed store.
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

interface RateLimiterOptions {
    maxRequests: number;  // Maximum requests allowed in window
    windowMs: number;     // Time window in milliseconds
    message?: string;     // Custom error message
}

interface RateLimiter {
    check: (identifier: string) => boolean;
    reset: (identifier: string) => void;
    getRemaining: (identifier: string) => number;
    getResetTime: (identifier: string) => number;
}

// Default rate limit configurations for different API types
export const RATE_LIMIT_CONFIGS = {
    // Standard API endpoints (10 req/min)
    standard: {
        maxRequests: 10,
        windowMs: 60000, // 1 minute
        message: 'คำขอมากเกินไป กรุณารอสักครู่',
    },

    // Authentication APIs (5 req/min - stricter for login attempts)
    auth: {
        maxRequests: 5,
        windowMs: 60000,
        message: 'พยายามเข้าสู่ระบบมากเกินไป กรุณารอ 1 นาที',
    },

    // Payment APIs (10 req/min - standard but logged)
    payment: {
        maxRequests: 10,
        windowMs: 60000,
        message: 'คำขอชำระเงินมากเกินไป กรุณารอสักครู่',
    },

    // Driver location updates (60 req/min - allow frequent GPS updates)
    driverLocation: {
        maxRequests: 60,
        windowMs: 60000,
        message: 'อัปเดตตำแหน่งมากเกินไป',
    },

    // Sensitive operations (3 req/min - very strict)
    sensitive: {
        maxRequests: 3,
        windowMs: 60000,
        message: 'กรุณารอสักครู่ก่อนลองอีกครั้ง',
    },
};

/**
 * Create a new rate limiter instance
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
    const store = new Map<string, RateLimitEntry>();
    const { maxRequests, windowMs } = options;

    // Cleanup old entries periodically (every minute)
    const cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of store.entries()) {
            if (now > entry.resetTime) {
                store.delete(key);
            }
        }
    }, 60000);

    // Prevent interval from keeping Node process alive
    if (typeof cleanupInterval.unref === 'function') {
        cleanupInterval.unref();
    }

    return {
        /**
         * Check if request is allowed. Returns true if allowed, false if rate limited.
         */
        check(identifier: string): boolean {
            const now = Date.now();
            const entry = store.get(identifier);

            // No previous requests or window expired
            if (!entry || now > entry.resetTime) {
                store.set(identifier, {
                    count: 1,
                    resetTime: now + windowMs,
                });
                return true;
            }

            // Within window, check count
            if (entry.count >= maxRequests) {
                return false;
            }

            // Increment count
            entry.count++;
            return true;
        },

        /**
         * Reset the rate limit for a specific identifier
         */
        reset(identifier: string): void {
            store.delete(identifier);
        },

        /**
         * Get remaining requests for an identifier
         */
        getRemaining(identifier: string): number {
            const entry = store.get(identifier);
            if (!entry || Date.now() > entry.resetTime) {
                return maxRequests;
            }
            return Math.max(0, maxRequests - entry.count);
        },

        /**
         * Get reset time for an identifier (ms until reset)
         */
        getResetTime(identifier: string): number {
            const entry = store.get(identifier);
            if (!entry || Date.now() > entry.resetTime) {
                return 0;
            }
            return entry.resetTime - Date.now();
        },
    };
}

// ===================== Default Rate Limiters =====================

// Default rate limiter for general use (10 req/min)
const defaultLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.standard);

// Auth rate limiter (5 req/min)
const authLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.auth);

// Payment rate limiter (10 req/min)
const paymentLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.payment);

// Driver location rate limiter (60 req/min)
const driverLocationLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.driverLocation);

// ===================== Convenience Functions =====================

/**
 * Check rate limit using default limiter (10 req/min)
 * @param identifier - User ID or IP address
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(identifier: string): boolean {
    return defaultLimiter.check(identifier);
}

/**
 * Check rate limit for auth endpoints (5 req/min)
 */
export function checkAuthRateLimit(identifier: string): boolean {
    return authLimiter.check(identifier);
}

/**
 * Check rate limit for payment endpoints (10 req/min)
 */
export function checkPaymentRateLimit(identifier: string): boolean {
    return paymentLimiter.check(identifier);
}

/**
 * Check rate limit for driver location updates (60 req/min)
 */
export function checkDriverLocationRateLimit(identifier: string): boolean {
    return driverLocationLimiter.check(identifier);
}

/**
 * Get rate limit error response
 */
export function getRateLimitResponse(type: keyof typeof RATE_LIMIT_CONFIGS = 'standard') {
    return {
        success: false,
        error: RATE_LIMIT_CONFIGS[type].message,
        retryAfter: RATE_LIMIT_CONFIGS[type].windowMs / 1000, // seconds
    };
}

/**
 * Extract identifier from request (prefer user ID, fallback to IP)
 */
export function getIdentifier(userId?: string | null, ip?: string | null): string {
    return userId || ip || 'unknown';
}
