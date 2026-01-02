/**
 * Safe Error Handling Utility
 * ===========================
 * ป้องกันการ leak ข้อมูลระบบผ่าน error messages
 *
 * Usage:
 *   import { safeErrorMessage, logError } from '@/lib/utils/safeError';
 *
 *   try { ... }
 *   catch (error) {
 *     logError('API_NAME', error, { userId, action });
 *     return NextResponse.json(
 *       { success: false, error: safeErrorMessage(error, 'ข้อความ default') },
 *       { status: 500 }
 *     );
 *   }
 */

// Known safe errors that can be shown to users
// These are errors WE created with specific messages
const SAFE_ERROR_PATTERNS = [
    // Authentication
    /กรุณาเข้าสู่ระบบ/,
    /Unauthorized/i,
    /ไม่มีสิทธิ์/,
    /No token provided/i,
    /Invalid token/i,
    /not an approved driver/i,
    /not authorized/i,

    // Validation
    /กรุณากรอก/,
    /ไม่พบ/,
    /ไม่ถูกต้อง/,
    /Invalid/i,
    /Missing/i,
    /Required/i,
    /must be/i,

    // Business logic (our custom errors)
    /คนขับกำลังมีงานอยู่/,
    /ไม่สามารถรับงานซ้อนได้/,
    /ไม่สามารถรับงานของตัวเอง/,
    /ต้องเสร็จงานก่อน/,
    /สามารถปฏิเสธงานได้เฉพาะ/,
    /Cannot change status/i,
    /ให้คะแนนได้ครั้งเดียว/,
    /ให้คะแนนได้เฉพาะ/,
    /เรท/i,

    // Payment
    /insufficient|amount|payment/i,
];

// Error patterns that should NEVER be exposed
const DANGEROUS_ERROR_PATTERNS = [
    /firebase/i,
    /firestore/i,
    /stripe.*key/i,
    /api.*key/i,
    /secret/i,
    /credential/i,
    /permission denied/i,
    /internal server/i,
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
    /stack/i,
    /at\s+\S+\s+\(/i, // Stack trace pattern
];

/**
 * Check if an error message is safe to show to users
 */
function isSafeError(message: string): boolean {
    // Check if it matches any dangerous pattern
    for (const pattern of DANGEROUS_ERROR_PATTERNS) {
        if (pattern.test(message)) {
            return false;
        }
    }

    // Check if it matches any safe pattern
    for (const pattern of SAFE_ERROR_PATTERNS) {
        if (pattern.test(message)) {
            return true;
        }
    }

    // Default: not safe (unknown error)
    return false;
}

/**
 * Get a safe error message for client response
 *
 * @param error - The caught error
 * @param defaultMessage - Default message to show if error is not safe
 * @returns Safe error message for client
 */
export function safeErrorMessage(
    error: unknown,
    defaultMessage: string = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
): string {
    // Get the error message
    let message: string;
    if (error instanceof Error) {
        message = error.message;
    } else if (typeof error === 'string') {
        message = error;
    } else {
        return defaultMessage;
    }

    // Check if the message is safe to return
    if (isSafeError(message)) {
        return message;
    }

    // Return default message for unsafe errors
    return defaultMessage;
}

/**
 * Log error for debugging (server-side only)
 * Logs full error details including stack trace
 *
 * @param context - API or function name
 * @param error - The caught error
 * @param metadata - Additional data for debugging
 */
export function logError(
    context: string,
    error: unknown,
    metadata?: Record<string, unknown>
): void {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // In production, you'd want to send this to a logging service
    // like Sentry, LogRocket, or Datadog
    console.error(`[${timestamp}] ERROR in ${context}:`, {
        message: errorMessage,
        stack: errorStack,
        metadata,
    });
}

/**
 * Type guard to check if error is an Error instance
 */
export function isError(error: unknown): error is Error {
    return error instanceof Error;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
    error: unknown,
    defaultMessage: string,
    context: string,
    metadata?: Record<string, unknown>
): { success: false; error: string } {
    logError(context, error, metadata);
    return {
        success: false,
        error: safeErrorMessage(error, defaultMessage),
    };
}
