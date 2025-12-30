// Test API endpoint for comprehensive booking query
// GET /api/test-booking-match?email=phiopan@gmail.com

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const testEmail = searchParams.get('email') || 'phiopan@gmail.com';

  try {
    // Step 1: Find user with this email
    const usersSnapshot = await adminDb.collection('users').where('email', '==', testEmail).get();

    if (usersSnapshot.empty) {
      return NextResponse.json({
        success: false,
        error: `User not found with email: ${testEmail}`
      }, { status: 404 });
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    // Step 2: Get all bookings
    const bookingsSnapshot = await adminDb.collection('bookings').get();
    const allBookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Step 3: Count by different methods
    const normalizedEmail = testEmail.toLowerCase();
    const normalizedPhone = userData.phone?.replace(/[^0-9+]/g, '') || null;

    // Method A: By userId only (old method)
    const byUserIdOnly = allBookings.filter((b: any) => b.userId === userId);

    // Method B: By email only
    const byEmailOnly = allBookings.filter((b: any) => b.email?.toLowerCase() === normalizedEmail);

    // Method C: By phone only
    const byPhoneOnly = normalizedPhone
      ? allBookings.filter((b: any) => b.phone?.replace(/[^0-9+]/g, '') === normalizedPhone)
      : [];

    // Method D: Comprehensive (userId OR email OR phone) - NEW METHOD
    const comprehensive = allBookings.filter((booking: any) => {
      if (booking.userId === userId) return true;
      if (booking.email?.toLowerCase() === normalizedEmail) return true;
      if (normalizedPhone && booking.phone?.replace(/[^0-9+]/g, '') === normalizedPhone) return true;
      return false;
    });

    // Calculate stats
    const completedTrips = comprehensive.filter((b: any) => b.status === 'completed').length;
    const cancelledTrips = comprehensive.filter((b: any) => b.status === 'cancelled').length;
    const totalSpent = comprehensive
      .filter((b: any) => b.status !== 'cancelled')
      .reduce((sum, b: any) => sum + (Number(b.totalCost) || 0), 0);

    // Status breakdown
    const statusBreakdown: Record<string, number> = {};
    comprehensive.forEach((b: any) => {
      statusBreakdown[b.status] = (statusBreakdown[b.status] || 0) + 1;
    });

    // Find bookings that only match by email (not userId)
    const emailOnlyMatches = allBookings.filter((b: any) => {
      const matchesEmail = b.email?.toLowerCase() === normalizedEmail;
      const matchesUserId = b.userId === userId;
      return matchesEmail && !matchesUserId;
    });

    return NextResponse.json({
      success: true,
      user: {
        firestoreDocId: userId,
        displayName: userData.displayName,
        email: userData.email,
        phone: userData.phone || null,
      },
      totalBookingsInSystem: allBookings.length,
      queryMethods: {
        byUserIdOnly: byUserIdOnly.length,
        byEmailOnly: byEmailOnly.length,
        byPhoneOnly: byPhoneOnly.length,
        comprehensive: comprehensive.length,
      },
      stats: {
        totalBookings: comprehensive.length,
        completedTrips,
        cancelledTrips,
        totalSpent,
      },
      statusBreakdown,
      emailOnlyMatchesCount: emailOnlyMatches.length,
      emailOnlyMatchesSample: emailOnlyMatches.slice(0, 5).map((b: any) => ({
        bookingId: b.id.slice(0, 8),
        userId: b.userId || null,
        email: b.email,
        status: b.status,
        totalCost: b.totalCost,
      })),
    });

  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
