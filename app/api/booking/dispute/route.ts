// ====================================
// TukTik Car Rental - Dispute API
// Passenger Rules: Customer submits dispute
// ====================================

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { DEFAULT_SYSTEM_CONFIG } from '@/lib/types';

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5; // Lower limit for disputes
const RATE_LIMIT_WINDOW = 60000;

function checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userLimit = rateLimitMap.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
        rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return true;
    }

    if (userLimit.count >= RATE_LIMIT) return false;
    userLimit.count++;
    return true;
}

// Valid dispute reason codes
const VALID_DISPUTE_REASONS = [
    'wrong_charge',        // ถูกเรียกเก็บเงินผิด
    'service_not_provided', // ไม่ได้รับบริการ
    'driver_misconduct',   // คนขับประพฤติไม่เหมาะสม
    'safety_concern',      // ปัญหาด้านความปลอดภัย
    'wrong_route',         // ไปผิดเส้นทาง
    'vehicle_issue',       // ปัญหาเกี่ยวกับรถ
    'unfair_fee',          // ถูกเก็บค่าธรรมเนียมไม่เป็นธรรม
    'other',               // อื่นๆ
];

/**
 * POST /api/booking/dispute
 * Customer submits a dispute for a booking
 *
 * Body:
 * {
 *   bookingId: string,
 *   reason: string,      // One of VALID_DISPUTE_REASONS
 *   description: string, // Detailed description (max 1000 chars)
 *   evidence?: string[], // URLs to evidence images (optional)
 * }
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Verify authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'กรุณาเข้าสู่ระบบก่อนยื่นข้อร้องเรียน' },
                { status: 401 }
            );
        }

        const token = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch {
            return NextResponse.json(
                { success: false, error: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' },
                { status: 401 }
            );
        }

        const userId = decodedToken.uid;

        // 2. Rate limiting
        if (!checkRateLimit(userId)) {
            return NextResponse.json(
                { success: false, error: 'คุณยื่นข้อร้องเรียนบ่อยเกินไป กรุณารอสักครู่' },
                { status: 429 }
            );
        }

        // 3. Parse request body
        const body = await request.json();
        const { bookingId, reason, description, evidence } = body;

        // 4. Validate required fields
        if (!bookingId) {
            return NextResponse.json(
                { success: false, error: 'กรุณาระบุ bookingId' },
                { status: 400 }
            );
        }

        if (!reason || !VALID_DISPUTE_REASONS.includes(reason)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'กรุณาระบุเหตุผลที่ถูกต้อง',
                    validReasons: VALID_DISPUTE_REASONS
                },
                { status: 400 }
            );
        }

        if (!description || description.trim().length < 10) {
            return NextResponse.json(
                { success: false, error: 'กรุณาระบุรายละเอียดอย่างน้อย 10 ตัวอักษร' },
                { status: 400 }
            );
        }

        // Sanitize description (remove HTML tags)
        const sanitizedDescription = description
            .replace(/<[^>]*>/g, '')
            .trim()
            .substring(0, 1000);

        // 5. Get booking
        const bookingRef = adminDb.collection('bookings').doc(bookingId);
        const bookingSnap = await bookingRef.get();

        if (!bookingSnap.exists) {
            return NextResponse.json(
                { success: false, error: 'ไม่พบข้อมูลการจอง' },
                { status: 404 }
            );
        }

        const booking = bookingSnap.data()!;

        // 6. Check ownership
        if (booking.userId !== userId) {
            return NextResponse.json(
                { success: false, error: 'คุณไม่มีสิทธิ์ยื่นข้อร้องเรียนสำหรับการจองนี้' },
                { status: 403 }
            );
        }

        // 7. Get system configuration
        let passengerConfig = DEFAULT_SYSTEM_CONFIG.passenger;
        try {
            const configSnap = await adminDb.collection('settings').doc('system_config').get();
            if (configSnap.exists) {
                passengerConfig = { ...passengerConfig, ...configSnap.data()?.passenger };
            }
        } catch { /* use defaults */ }

        // 8. Check if disputes are enabled
        if (!passengerConfig.enableDispute) {
            return NextResponse.json(
                { success: false, error: 'ระบบข้อร้องเรียนปิดใช้งานอยู่' },
                { status: 400 }
            );
        }

        // 9. Check if booking already has a dispute
        if (booking.hasDispute) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'คุณได้ยื่นข้อร้องเรียนสำหรับการจองนี้ไปแล้ว',
                    disputeId: booking.disputeId,
                    disputeStatus: booking.disputeStatus,
                },
                { status: 400 }
            );
        }

        // 10. Check booking status (must be completed or cancelled)
        const disputeableStatuses = ['completed', 'cancelled'];
        if (!disputeableStatuses.includes(booking.status)) {
            return NextResponse.json(
                { success: false, error: 'สามารถยื่นข้อร้องเรียนได้เฉพาะการจองที่เสร็จสิ้นหรือถูกยกเลิกแล้ว' },
                { status: 400 }
            );
        }

        // 11. Check dispute window
        const bookingCompletedAt = booking.cancelledAt || booking.updatedAt || booking.createdAt;
        const completedTime = bookingCompletedAt?.toDate?.()?.getTime() ||
            bookingCompletedAt?.seconds * 1000 ||
            Date.now();
        const disputeWindowMs = passengerConfig.disputeWindowHours * 60 * 60 * 1000;
        const windowEndTime = completedTime + disputeWindowMs;

        if (Date.now() > windowEndTime) {
            return NextResponse.json(
                {
                    success: false,
                    error: `หมดเวลายื่นข้อร้องเรียนแล้ว (ภายใน ${passengerConfig.disputeWindowHours} ชั่วโมงหลังเสร็จสิ้น)`
                },
                { status: 400 }
            );
        }

        // 12. Create dispute document
        const disputeData = {
            bookingId,
            userId,
            customerName: `${booking.firstName || ''} ${booking.lastName || ''}`.trim() || 'ลูกค้า',
            customerEmail: booking.email,
            customerPhone: booking.phone,
            driverId: booking.driver?.driverId || null,
            driverName: booking.driver?.name || null,
            reason,
            description: sanitizedDescription,
            evidence: Array.isArray(evidence) ? evidence.slice(0, 5) : [], // Max 5 evidence items
            bookingDetails: {
                pickupLocation: booking.pickupLocation,
                dropoffLocation: booking.dropoffLocation,
                pickupDate: booking.pickupDate,
                totalCost: booking.totalCost,
                status: booking.status,
                cancellationFee: booking.cancellationFee || 0,
                noShowFee: booking.noShowFee || 0,
            },
            status: 'pending', // pending, investigating, resolved, rejected
            resolution: null,
            resolvedBy: null,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        const disputeRef = await adminDb.collection('disputes').add(disputeData);
        const disputeId = disputeRef.id;

        // 13. Update booking with dispute info
        await bookingRef.update({
            hasDispute: true,
            disputeId,
            disputeStatus: 'pending',
            disputeReason: reason,
            updatedAt: Timestamp.now(),
        });

        // 14. Create admin notification
        await adminDb.collection('admin_notifications').add({
            type: 'new_dispute',
            title: 'มีข้อร้องเรียนใหม่',
            message: `${disputeData.customerName} ยื่นข้อร้องเรียน: ${getReasonLabel(reason)}`,
            data: {
                disputeId,
                bookingId,
                reason,
                userId,
            },
            isRead: false,
            createdAt: Timestamp.now(),
        });

        // 15. Notify customer (confirmation)
        await adminDb.collection('notifications').add({
            userId,
            type: 'system',
            title: 'ข้อร้องเรียนได้รับแล้ว',
            message: `เราได้รับข้อร้องเรียนของคุณแล้ว หมายเลข: ${disputeId.substring(0, 8).toUpperCase()}`,
            data: { disputeId, bookingId },
            isRead: false,
            createdAt: Timestamp.now(),
        });

        // 16. Return success response
        return NextResponse.json({
            success: true,
            message: 'ยื่นข้อร้องเรียนเรียบร้อยแล้ว',
            data: {
                disputeId,
                bookingId,
                status: 'pending',
                referenceNumber: disputeId.substring(0, 8).toUpperCase(),
                estimatedResponseTime: '24-48 ชั่วโมง',
            },
        });

    } catch (error: any) {
        console.error('Dispute submission error:', error);
        return NextResponse.json(
            { success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/booking/dispute?bookingId=xxx
 * Get dispute status for a booking
 */
export async function GET(request: NextRequest) {
    try {
        // 1. Verify authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'กรุณาเข้าสู่ระบบก่อน' },
                { status: 401 }
            );
        }

        const token = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch {
            return NextResponse.json(
                { success: false, error: 'Session หมดอายุ' },
                { status: 401 }
            );
        }

        const userId = decodedToken.uid;

        // 2. Get query parameters
        const { searchParams } = new URL(request.url);
        const bookingId = searchParams.get('bookingId');
        const disputeId = searchParams.get('disputeId');

        if (!bookingId && !disputeId) {
            return NextResponse.json(
                { success: false, error: 'กรุณาระบุ bookingId หรือ disputeId' },
                { status: 400 }
            );
        }

        // 3. Get dispute
        let disputeSnap;
        if (disputeId) {
            disputeSnap = await adminDb.collection('disputes').doc(disputeId).get();
        } else {
            const disputesQuery = await adminDb.collection('disputes')
                .where('bookingId', '==', bookingId)
                .limit(1)
                .get();
            disputeSnap = disputesQuery.docs[0];
        }

        if (!disputeSnap?.exists) {
            return NextResponse.json(
                { success: false, error: 'ไม่พบข้อร้องเรียน' },
                { status: 404 }
            );
        }

        const dispute = disputeSnap.data()!;

        // 4. Check ownership (unless admin)
        const userDoc = await adminDb.collection('users').doc(userId).get();
        const userData = userDoc.data();

        if (dispute.userId !== userId && userData?.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'คุณไม่มีสิทธิ์ดูข้อร้องเรียนนี้' },
                { status: 403 }
            );
        }

        // 5. Return dispute info
        return NextResponse.json({
            success: true,
            data: {
                disputeId: disputeSnap.id,
                bookingId: dispute.bookingId,
                reason: dispute.reason,
                reasonLabel: getReasonLabel(dispute.reason),
                description: dispute.description,
                status: dispute.status,
                statusLabel: getStatusLabel(dispute.status),
                resolution: dispute.resolution,
                resolvedBy: dispute.resolvedBy,
                createdAt: dispute.createdAt?.toDate?.()?.toISOString() || null,
                updatedAt: dispute.updatedAt?.toDate?.()?.toISOString() || null,
            },
        });

    } catch (error: any) {
        console.error('Get dispute error:', error);
        return NextResponse.json(
            { success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
            { status: 500 }
        );
    }
}

// Helper functions
function getReasonLabel(reason: string): string {
    const labels: Record<string, string> = {
        'wrong_charge': 'ถูกเรียกเก็บเงินผิด',
        'service_not_provided': 'ไม่ได้รับบริการ',
        'driver_misconduct': 'คนขับประพฤติไม่เหมาะสม',
        'safety_concern': 'ปัญหาด้านความปลอดภัย',
        'wrong_route': 'ไปผิดเส้นทาง',
        'vehicle_issue': 'ปัญหาเกี่ยวกับรถ',
        'unfair_fee': 'ถูกเก็บค่าธรรมเนียมไม่เป็นธรรม',
        'other': 'อื่นๆ',
    };
    return labels[reason] || reason;
}

function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        'pending': 'รอดำเนินการ',
        'investigating': 'กำลังตรวจสอบ',
        'resolved': 'ดำเนินการเสร็จสิ้น',
        'rejected': 'ไม่ผ่านการพิจารณา',
    };
    return labels[status] || status;
}
