import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { safeErrorMessage, logError } from '@/lib/utils/safeError';

/**
 * POST /api/booking/rate
 * Submit rating for a completed booking
 *
 * Body:
 * - bookingId: string
 * - ratingType: 'customerToDriver' | 'driverToCustomer'
 * - stars: number (1-5)
 * - reasons?: string[] (required if stars <= 3)
 * - comment?: string
 * - tip?: number (only for customerToDriver, max 10000)
 *
 * Security:
 * - Authentication required (Bearer token)
 * - Authorization: Customer can only rate their own booking, Driver can only rate assigned booking
 * - Duplicate prevention: Cannot rate same booking twice
 * - Input validation: stars 1-5, valid reason codes, tip max 10000, sanitized comment
 */

// Valid reason codes (whitelist)
const VALID_REASON_CODES = [
    // Customer to Driver
    'late', 'dirty_car', 'bad_driving', 'rude', 'wrong_route',
    // Driver to Customer
    'no_show', 'messy',
    // Common
    'other',
];

// Security constants
const MAX_TIP_AMOUNT = 10000; // ฿10,000 max
const MAX_COMMENT_LENGTH = 500;

// Rate limiting map (in-memory, resets on server restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute

// Sanitize text (remove HTML tags and trim)
function sanitizeText(text: string): string {
    if (!text) return '';
    return text
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[<>]/g, '') // Remove any remaining < >
        .trim()
        .slice(0, MAX_COMMENT_LENGTH);
}

// Check rate limit
function checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userLimit = rateLimitMap.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
        rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return true;
    }

    if (userLimit.count >= RATE_LIMIT_MAX) {
        return false;
    }

    userLimit.count++;
    return true;
}

// ==========================================
// Bayesian Average Rating System
// ==========================================
// Formula: bayesianRating = ((C * m) + (sum of all ratings)) / (m + n)
// Where:
//   C = prior mean (system average, we use 4.0)
//   m = minimum reviews before rating is "trusted" (we use 5)
//   n = number of actual reviews
//
// Benefits:
// - New drivers with 1 review of 5 stars won't show as 5.0
// - Prevents gaming with few fake reviews
// - Fair to drivers with many reviews

const BAYESIAN_PRIOR_MEAN = 4.0;  // C: Default/prior rating (system average)
const BAYESIAN_MIN_REVIEWS = 5;   // m: Minimum reviews to trust the rating

/**
 * Calculate Bayesian Average Rating
 * @param currentRating - Current average rating (before new review)
 * @param ratingCount - Number of existing reviews
 * @param newStars - New rating (1-5)
 * @returns New Bayesian average rounded to 1 decimal
 */
function calculateBayesianRating(
    currentRating: number,
    ratingCount: number,
    newStars: number
): number {
    // Sum of all ratings = currentRating * ratingCount + newStars
    const totalSum = (currentRating * ratingCount) + newStars;
    const totalCount = ratingCount + 1;

    // Bayesian formula: ((C * m) + totalSum) / (m + totalCount)
    const bayesianRating = (
        (BAYESIAN_PRIOR_MEAN * BAYESIAN_MIN_REVIEWS) + totalSum
    ) / (BAYESIAN_MIN_REVIEWS + totalCount);

    // Round to 1 decimal place
    return Math.round(bayesianRating * 10) / 10;
}
export async function POST(request: NextRequest) {
    try {
        // 1. Verify authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized - No token provided' },
                { status: 401 }
            );
        }

        const token = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch {
            return NextResponse.json(
                { success: false, error: 'Unauthorized - Invalid token' },
                { status: 401 }
            );
        }

        const userId = decodedToken.uid;

        // 2. Check rate limit
        if (!checkRateLimit(userId)) {
            return NextResponse.json(
                { success: false, error: 'คุณส่งคำขอบ่อยเกินไป กรุณารอสักครู่' },
                { status: 429 }
            );
        }

        // 3. Parse request body
        const body = await request.json();
        const { bookingId, ratingType, stars, reasons, comment, tip } = body;

        // 4. Validate required fields
        if (!bookingId || !ratingType || stars === undefined) {
            return NextResponse.json(
                { success: false, error: 'กรุณาระบุข้อมูลให้ครบถ้วน' },
                { status: 400 }
            );
        }

        // Validate stars range (must be integer 1-5)
        if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
            return NextResponse.json(
                { success: false, error: 'คะแนนต้องเป็นจำนวนเต็ม 1-5' },
                { status: 400 }
            );
        }

        // Validate rating type
        if (!['customerToDriver', 'driverToCustomer'].includes(ratingType)) {
            return NextResponse.json(
                { success: false, error: 'ประเภทการให้คะแนนไม่ถูกต้อง' },
                { status: 400 }
            );
        }

        // Validate tip amount (only for customerToDriver)
        if (tip !== undefined && tip !== null) {
            if (typeof tip !== 'number' || tip < 0 || tip > MAX_TIP_AMOUNT) {
                return NextResponse.json(
                    { success: false, error: `ทิปต้องอยู่ระหว่าง 0-${MAX_TIP_AMOUNT.toLocaleString()} บาท` },
                    { status: 400 }
                );
            }
        }

        // Validate reason codes (must be in whitelist)
        if (reasons && Array.isArray(reasons) && reasons.length > 0) {
            const invalidReasons = reasons.filter((r: string) => !VALID_REASON_CODES.includes(r));
            if (invalidReasons.length > 0) {
                return NextResponse.json(
                    { success: false, error: 'รหัสเหตุผลไม่ถูกต้อง' },
                    { status: 400 }
                );
            }
        }

        // Require reasons for low ratings
        if (stars <= 3 && (!reasons || reasons.length === 0)) {
            return NextResponse.json(
                { success: false, error: 'กรุณาระบุเหตุผลสำหรับคะแนนต่ำ' },
                { status: 400 }
            );
        }

        // 4. Get booking document
        const bookingRef = adminDb.collection('bookings').doc(bookingId);
        const bookingSnap = await bookingRef.get();

        if (!bookingSnap.exists) {
            return NextResponse.json(
                { success: false, error: 'ไม่พบข้อมูลการจอง' },
                { status: 404 }
            );
        }

        const bookingData = bookingSnap.data();

        // 5. Check if booking is completed
        if (bookingData?.status !== 'completed') {
            return NextResponse.json(
                { success: false, error: 'สามารถให้คะแนนได้เฉพาะงานที่เสร็จสิ้นแล้ว' },
                { status: 400 }
            );
        }

        // 6. Verify user permission
        if (ratingType === 'customerToDriver') {
            // Customer rating driver - verify booking belongs to user
            if (bookingData?.userId !== userId) {
                return NextResponse.json(
                    { success: false, error: 'คุณไม่มีสิทธิ์ให้คะแนนการจองนี้' },
                    { status: 403 }
                );
            }
        } else {
            // Driver rating customer - verify driver is assigned to this booking
            const userDoc = await adminDb.collection('users').doc(userId).get();
            const userData = userDoc.data();
            const driverId = userData?.driverId;

            if (!driverId || bookingData?.driver?.driverId !== driverId) {
                return NextResponse.json(
                    { success: false, error: 'คุณไม่มีสิทธิ์ให้คะแนนการจองนี้' },
                    { status: 403 }
                );
            }
        }

        // 7. Check if already rated
        const existingRatings = bookingData?.ratings || {};
        if (existingRatings[ratingType]) {
            return NextResponse.json(
                { success: false, error: 'คุณได้ให้คะแนนการจองนี้ไปแล้ว' },
                { status: 400 }
            );
        }

        // 8. Build rating object
        const ratingData: Record<string, any> = {
            stars,
            ratedAt: Timestamp.now(),
        };

        if (reasons && reasons.length > 0) {
            ratingData.reasons = reasons;
        }

        if (comment && comment.trim()) {
            ratingData.comment = sanitizeText(comment);
        }

        if (ratingType === 'customerToDriver' && tip && tip > 0) {
            ratingData.tip = tip;
        }

        // 9. Update booking with rating
        await bookingRef.update({
            [`ratings.${ratingType}`]: ratingData,
            updatedAt: FieldValue.serverTimestamp(),
        });

        // 10. Update driver rating using Bayesian Average
        if (ratingType === 'customerToDriver' && bookingData?.driver?.driverId) {
            const driverId = bookingData.driver.driverId;
            const driverRef = adminDb.collection('drivers').doc(driverId);
            const driverSnap = await driverRef.get();
            const driverData = driverSnap.data();

            if (driverData) {
                const currentRating = driverData.rating || BAYESIAN_PRIOR_MEAN;
                const currentCount = driverData.ratingCount || 0;
                const currentTips = driverData.totalTips || 0;

                // Calculate new Bayesian average
                const newBayesianRating = calculateBayesianRating(currentRating, currentCount, stars);

                const updateData: Record<string, any> = {
                    rating: newBayesianRating,
                    ratingCount: currentCount + 1,
                    updatedAt: FieldValue.serverTimestamp(),
                };

                // Add tip if provided
                if (tip && tip > 0) {
                    updateData.totalTips = currentTips + tip;
                    updateData.totalEarnings = (driverData.totalEarnings || 0) + tip;
                }

                await driverRef.update(updateData);
            }
        }

        // 11. Update customer rating using Bayesian Average (for driverToCustomer)
        if (ratingType === 'driverToCustomer' && bookingData?.userId) {
            const customerRef = adminDb.collection('users').doc(bookingData.userId);
            const customerSnap = await customerRef.get();
            const customerData = customerSnap.data();

            if (customerData) {
                const currentRating = customerData.rating || BAYESIAN_PRIOR_MEAN;
                const currentCount = customerData.ratingCount || 0;

                // Calculate new Bayesian average
                const newBayesianRating = calculateBayesianRating(currentRating, currentCount, stars);

                await customerRef.update({
                    rating: newBayesianRating,
                    ratingCount: currentCount + 1,
                    updatedAt: FieldValue.serverTimestamp(),
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: 'บันทึกคะแนนเรียบร้อยแล้ว',
            data: {
                bookingId,
                ratingType,
                stars,
                tip: tip || 0,
            },
        });

    } catch (error: unknown) {
        logError('booking/rate/POST', error, { bookingId: 'from-request' });
        return NextResponse.json(
            { success: false, error: safeErrorMessage(error, 'ไม่สามารถบันทึกคะแนนได้') },
            { status: 500 }
        );
    }
}
