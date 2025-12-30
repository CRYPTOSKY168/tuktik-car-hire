// Test script for subscribeToUserBookingsComprehensive function
// Run with: node scripts/test-comprehensive-booking.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Test user data
const TEST_EMAIL = 'phiopan@gmail.com';

async function testComprehensiveBookingQuery() {
  console.log('🔍 Testing Comprehensive Booking Query...\n');

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  try {
    // Step 1: Get all users to find the test user
    console.log('1️⃣ Finding user with email:', TEST_EMAIL);
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const testUser = users.find(u => u.email?.toLowerCase() === TEST_EMAIL.toLowerCase());

    if (!testUser) {
      console.log('❌ User not found with email:', TEST_EMAIL);
      return;
    }

    console.log('✅ Found user:');
    console.log('   - Firestore Doc ID:', testUser.id);
    console.log('   - Display Name:', testUser.displayName || 'N/A');
    console.log('   - Email:', testUser.email);
    console.log('   - Phone:', testUser.phone || 'N/A');
    console.log('');

    // Step 2: Get all bookings
    console.log('2️⃣ Fetching all bookings...');
    const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
    const allBookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('   Total bookings in system:', allBookings.length);
    console.log('');

    // Step 3: Count bookings by different methods
    console.log('3️⃣ Counting bookings for test user...\n');

    // Method A: By userId only (old method)
    const byUserIdOnly = allBookings.filter(b => b.userId === testUser.id);
    console.log('   📊 Method A (userId only):', byUserIdOnly.length, 'bookings');

    // Method B: By email only
    const normalizedEmail = TEST_EMAIL.toLowerCase();
    const byEmailOnly = allBookings.filter(b => b.email?.toLowerCase() === normalizedEmail);
    console.log('   📊 Method B (email only):', byEmailOnly.length, 'bookings');

    // Method C: By phone only
    const normalizedPhone = testUser.phone?.replace(/[^0-9+]/g, '');
    const byPhoneOnly = normalizedPhone
      ? allBookings.filter(b => b.phone?.replace(/[^0-9+]/g, '') === normalizedPhone)
      : [];
    console.log('   📊 Method C (phone only):', byPhoneOnly.length, 'bookings');

    // Method D: Comprehensive (userId OR email OR phone) - NEW METHOD
    const comprehensive = allBookings.filter(booking => {
      if (booking.userId === testUser.id) return true;
      if (booking.email?.toLowerCase() === normalizedEmail) return true;
      if (normalizedPhone && booking.phone?.replace(/[^0-9+]/g, '') === normalizedPhone) return true;
      return false;
    });
    console.log('   📊 Method D (comprehensive):', comprehensive.length, 'bookings');
    console.log('');

    // Step 4: Calculate stats like admin page
    console.log('4️⃣ Stats (using comprehensive method):');
    const completedTrips = comprehensive.filter(b => b.status === 'completed').length;
    const totalSpent = comprehensive
      .filter(b => b.status !== 'cancelled')
      .reduce((sum, b) => sum + (Number(b.totalCost) || 0), 0);

    console.log('   - Total Bookings:', comprehensive.length);
    console.log('   - Completed Trips:', completedTrips);
    console.log('   - Total Spent: ฿' + totalSpent.toLocaleString());
    console.log('');

    // Step 5: Show breakdown by status
    console.log('5️⃣ Breakdown by status:');
    const statusCounts = {};
    comprehensive.forEach(b => {
      statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
    });
    Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });
    console.log('');

    // Step 6: Check for bookings that ONLY match by email (not userId)
    const emailOnlyMatches = allBookings.filter(b => {
      const matchesEmail = b.email?.toLowerCase() === normalizedEmail;
      const matchesUserId = b.userId === testUser.id;
      return matchesEmail && !matchesUserId;
    });

    if (emailOnlyMatches.length > 0) {
      console.log('⚠️ Found', emailOnlyMatches.length, 'bookings that match by email but NOT by userId:');
      emailOnlyMatches.slice(0, 5).forEach(b => {
        console.log(`   - Booking ${b.id.slice(0, 8)}: userId="${b.userId || 'null'}", status=${b.status}`);
      });
      if (emailOnlyMatches.length > 5) {
        console.log(`   ... and ${emailOnlyMatches.length - 5} more`);
      }
    }
    console.log('');

    console.log('✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

// Load env vars and run
require('dotenv').config({ path: '.env.local' });
testComprehensiveBookingQuery();
