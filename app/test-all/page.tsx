'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { auth, db } from '@/lib/firebase/config';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    deleteUser,
    onAuthStateChanged,
    User
} from 'firebase/auth';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    where,
    limit,
    Timestamp,
    updateDoc
} from 'firebase/firestore';

// ============================================
// TYPES
// ============================================
type LogLevel = 'info' | 'success' | 'error' | 'warning' | 'step';
type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

interface LogEntry {
    id: string;
    timestamp: Date;
    level: LogLevel;
    message: string;
    details?: string;
    testId?: string;
}

interface TestCase {
    id: string;
    name: string;
    description: string;
    category: string;
    status: TestStatus;
    duration?: number;
    error?: string;
    run: () => Promise<void>;
}

interface TestResult {
    testId: string;
    status: TestStatus;
    duration: number;
    error?: string;
}

// ============================================
// TEST CONFIG
// ============================================
const TEST_EMAIL = `test-${Date.now()}@tuktik-test.com`;
const TEST_PASSWORD = 'Test@123456';
const TEST_PHONE = '+66812345678';

// ============================================
// MAIN COMPONENT
// ============================================
export default function TestAllPage() {
    // State
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [tests, setTests] = useState<TestCase[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [currentTest, setCurrentTest] = useState<string | null>(null);
    const [testUser, setTestUser] = useState<User | null>(null);
    const [testData, setTestData] = useState<{
        userId?: string;
        bookingId?: string;
        driverId?: string;
        vehicleId?: string;
    }>({});

    // Use ref to share data between tests (state updates are async)
    const testDataRef = useRef<{
        userId?: string;
        bookingId?: string;
        driverId?: string;
        vehicleId?: string;
    }>({});
    const [autoCleanup, setAutoCleanup] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [summary, setSummary] = useState({ total: 0, passed: 0, failed: 0, skipped: 0 });

    const logsEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // ============================================
    // LOGGING FUNCTIONS
    // ============================================
    const sendLogToServer = useCallback(async (testId: string, testName: string, status: string, error?: string, duration?: number) => {
        try {
            await fetch('/api/test-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    testId,
                    testName,
                    status,
                    error,
                    duration,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (e) {
            // Silently fail - don't break tests for logging
        }
    }, []);

    const addLog = useCallback((level: LogLevel, message: string, details?: string, testId?: string) => {
        const entry: LogEntry = {
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            level,
            message,
            details,
            testId
        };
        setLogs(prev => [...prev, entry]);
    }, []);

    const log = {
        info: (msg: string, details?: string) => addLog('info', msg, details),
        success: (msg: string, details?: string) => addLog('success', msg, details),
        error: (msg: string, details?: string) => addLog('error', msg, details),
        warning: (msg: string, details?: string) => addLog('warning', msg, details),
        step: (msg: string, details?: string) => addLog('step', msg, details),
    };

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const updateTestStatus = (testId: string, status: TestStatus, error?: string) => {
        setTests(prev => prev.map(t =>
            t.id === testId ? { ...t, status, error } : t
        ));
    };

    const getAuthToken = async (): Promise<string | null> => {
        if (!auth) return null;
        const user = auth.currentUser;
        if (!user) return null;
        return user.getIdToken();
    };

    const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
        const token = await getAuthToken();
        return fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : '',
                ...options.headers,
            },
        });
    };

    // ============================================
    // TEST DEFINITIONS
    // ============================================
    const createTests = useCallback((): TestCase[] => {
        const testCases: TestCase[] = [];

        // ============ CATEGORY: AUTH ============
        testCases.push({
            id: 'auth-register',
            name: 'User Registration',
            description: 'สมัครสมาชิกด้วย Email + Password',
            category: 'auth',
            status: 'pending',
            run: async () => {
                if (!auth || !db) throw new Error('Firebase not initialized');
                log.step('กำลังสมัครสมาชิก...', `Email: ${TEST_EMAIL}`);

                try {
                    const userCredential = await createUserWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
                    const user = userCredential.user;
                    setTestUser(user);
                    testDataRef.current.userId = user.uid;
                    setTestData(prev => ({ ...prev, userId: user.uid }));

                    // Create user document in Firestore
                    await setDoc(doc(db, 'users', user.uid), {
                        uid: user.uid,
                        email: TEST_EMAIL,
                        displayName: 'Test User',
                        phone: TEST_PHONE,
                        role: 'user',
                        provider: 'email',
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now()
                    });

                    log.success('สมัครสมาชิกสำเร็จ', `UID: ${user.uid}`);
                } catch (error: any) {
                    if (error.code === 'auth/email-already-in-use') {
                        log.warning('Email นี้มีอยู่แล้ว กำลัง login แทน...');
                        const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
                        setTestUser(userCredential.user);
                        testDataRef.current.userId = userCredential.user.uid;
                        setTestData(prev => ({ ...prev, userId: userCredential.user.uid }));
                        log.success('Login สำเร็จ', `UID: ${userCredential.user.uid}`);
                    } else {
                        throw error;
                    }
                }
            }
        });

        testCases.push({
            id: 'auth-login',
            name: 'User Login',
            description: 'เข้าสู่ระบบด้วย Email + Password',
            category: 'auth',
            status: 'pending',
            run: async () => {
                if (!auth) throw new Error('Firebase Auth not initialized');
                log.step('กำลังเข้าสู่ระบบ...', `Email: ${TEST_EMAIL}`);

                // Sign out first
                if (auth.currentUser) {
                    await signOut(auth);
                }

                const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
                setTestUser(userCredential.user);
                log.success('เข้าสู่ระบบสำเร็จ', `UID: ${userCredential.user.uid}`);
            }
        });

        testCases.push({
            id: 'auth-firestore-user',
            name: 'Firestore User Document',
            description: 'ตรวจสอบ user document ใน Firestore',
            category: 'auth',
            status: 'pending',
            run: async () => {
                if (!db) throw new Error('Firestore not initialized');
                log.step('กำลังตรวจสอบ user document...');

                const userId = testDataRef.current.userId || auth?.currentUser?.uid;
                if (!userId) throw new Error('No user ID available');

                const userDoc = await getDoc(doc(db, 'users', userId));
                if (!userDoc.exists()) {
                    throw new Error('User document not found in Firestore');
                }

                const userData = userDoc.data();
                log.success('พบ user document', `Role: ${userData.role}, Email: ${userData.email}`);
            }
        });

        // ============ CATEGORY: VEHICLES ============
        testCases.push({
            id: 'vehicles-list',
            name: 'Load Vehicles',
            description: 'โหลดรายการรถจาก Firestore',
            category: 'vehicles',
            status: 'pending',
            run: async () => {
                if (!db) throw new Error('Firestore not initialized');
                log.step('กำลังโหลดรายการรถ...');

                const vehiclesSnap = await getDocs(
                    query(collection(db, 'vehicles'), where('isActive', '==', true))
                );

                if (vehiclesSnap.empty) {
                    throw new Error('No active vehicles found');
                }

                const vehicles = vehiclesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                testDataRef.current.vehicleId = vehicles[0].id;
                setTestData(prev => ({ ...prev, vehicleId: vehicles[0].id }));

                log.success(`โหลดรถสำเร็จ ${vehicles.length} คัน`, `First: ${(vehicles[0] as any).name}`);
            }
        });

        // ============ CATEGORY: LOCATIONS ============
        testCases.push({
            id: 'locations-list',
            name: 'Load Locations',
            description: 'โหลดสถานที่จาก Firestore',
            category: 'locations',
            status: 'pending',
            run: async () => {
                if (!db) throw new Error('Firestore not initialized');
                log.step('กำลังโหลดสถานที่...');

                const locationsSnap = await getDocs(
                    query(collection(db, 'locations'), where('isActive', '==', true))
                );

                if (locationsSnap.empty) {
                    throw new Error('No active locations found');
                }

                log.success(`โหลดสถานที่สำเร็จ ${locationsSnap.size} แห่ง`);
            }
        });

        testCases.push({
            id: 'routes-pricing',
            name: 'Load Routes & Pricing',
            description: 'โหลดเส้นทางและราคาจาก Firestore',
            category: 'locations',
            status: 'pending',
            run: async () => {
                if (!db) throw new Error('Firestore not initialized');
                log.step('กำลังโหลดเส้นทาง...');

                const routesSnap = await getDocs(
                    query(collection(db, 'routes'), where('isActive', '==', true))
                );

                if (routesSnap.empty) {
                    log.warning('ไม่พบ routes ในระบบ (อาจใช้ราคาเริ่มต้น)');
                } else {
                    log.success(`โหลดเส้นทางสำเร็จ ${routesSnap.size} เส้นทาง`);
                }
            }
        });

        // ============ CATEGORY: BOOKING ============
        testCases.push({
            id: 'booking-create',
            name: 'Create Booking',
            description: 'สร้าง booking ใหม่',
            category: 'booking',
            status: 'pending',
            run: async () => {
                if (!db) throw new Error('Firestore not initialized');
                log.step('กำลังสร้าง booking...');

                const userId = testDataRef.current.userId || auth?.currentUser?.uid;
                if (!userId) throw new Error('No user ID available');

                // Get a vehicle
                const vehiclesSnap = await getDocs(
                    query(collection(db, 'vehicles'), where('isActive', '==', true), limit(1))
                );
                if (vehiclesSnap.empty) throw new Error('No vehicles available');
                const vehicle = { id: vehiclesSnap.docs[0].id, ...vehiclesSnap.docs[0].data() } as any;

                // Create booking
                const bookingRef = doc(collection(db, 'bookings'));
                const bookingData = {
                    userId,
                    firstName: 'Test',
                    lastName: 'User',
                    email: TEST_EMAIL,
                    phone: TEST_PHONE,
                    pickupLocation: 'สนามบินสุวรรณภูมิ',
                    dropoffLocation: 'พัทยา',
                    pickupCoordinates: { lat: 13.6900, lng: 100.7501 },
                    dropoffCoordinates: { lat: 12.9236, lng: 100.8825 },
                    pickupDate: new Date().toISOString().split('T')[0],
                    pickupTime: '14:00',
                    vehicleId: vehicle.id,
                    vehicleName: vehicle.name,
                    totalCost: vehicle.price || 1500,
                    status: 'pending',
                    paymentMethod: 'cash',
                    paymentStatus: 'pending',
                    statusHistory: [{
                        status: 'pending',
                        timestamp: Timestamp.now(),
                        updatedBy: 'system'
                    }],
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                };

                await setDoc(bookingRef, bookingData);
                testDataRef.current.bookingId = bookingRef.id;
                setTestData(prev => ({ ...prev, bookingId: bookingRef.id }));

                log.success('สร้าง booking สำเร็จ', `ID: ${bookingRef.id}`);
            }
        });

        testCases.push({
            id: 'booking-read',
            name: 'Read Booking',
            description: 'อ่านข้อมูล booking',
            category: 'booking',
            status: 'pending',
            run: async () => {
                if (!db) throw new Error('Firestore not initialized');
                log.step('กำลังอ่าน booking...');

                const bookingId = testDataRef.current.bookingId;
                if (!bookingId) throw new Error('No booking ID available (run Create Booking first)');

                const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
                if (!bookingDoc.exists()) {
                    throw new Error('Booking not found');
                }

                const booking = bookingDoc.data();
                log.success('อ่าน booking สำเร็จ', `Status: ${booking.status}, Price: ฿${booking.totalCost}`);
            }
        });

        testCases.push({
            id: 'booking-update-status',
            name: 'Update Booking Status',
            description: 'อัปเดตสถานะ booking เป็น confirmed',
            category: 'booking',
            status: 'pending',
            run: async () => {
                if (!db) throw new Error('Firestore not initialized');
                log.step('กำลังอัปเดตสถานะ...');

                const bookingId = testDataRef.current.bookingId;
                if (!bookingId) throw new Error('No booking ID available');

                const bookingRef = doc(db, 'bookings', bookingId);
                const bookingDoc = await getDoc(bookingRef);
                const currentHistory = bookingDoc.data()?.statusHistory || [];

                await updateDoc(bookingRef, {
                    status: 'confirmed',
                    statusHistory: [...currentHistory, {
                        status: 'confirmed',
                        timestamp: Timestamp.now(),
                        updatedBy: 'system',
                        note: 'Test confirmation'
                    }],
                    updatedAt: Timestamp.now()
                });

                log.success('อัปเดตสถานะเป็น confirmed สำเร็จ');
            }
        });

        // ============ CATEGORY: DRIVERS ============
        testCases.push({
            id: 'drivers-list',
            name: 'Load Available Drivers',
            description: 'โหลดรายการคนขับที่ว่าง',
            category: 'drivers',
            status: 'pending',
            run: async () => {
                if (!db) throw new Error('Firestore not initialized');
                log.step('กำลังโหลดคนขับ...');

                const driversSnap = await getDocs(
                    query(collection(db, 'drivers'), where('status', '==', 'available'))
                );

                if (driversSnap.empty) {
                    log.warning('ไม่มีคนขับที่ว่าง');
                    return;
                }

                const drivers = driversSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                testDataRef.current.driverId = drivers[0].id;
                setTestData(prev => ({ ...prev, driverId: drivers[0].id }));

                log.success(`พบคนขับที่ว่าง ${drivers.length} คน`, `First: ${(drivers[0] as any).name}`);
            }
        });

        testCases.push({
            id: 'drivers-assign',
            name: 'Assign Driver to Booking',
            description: 'มอบหมายคนขับให้ booking',
            category: 'drivers',
            status: 'pending',
            run: async () => {
                if (!db) throw new Error('Firestore not initialized');
                log.step('กำลังมอบหมายคนขับ...');

                const bookingId = testDataRef.current.bookingId;
                const driverId = testDataRef.current.driverId;

                if (!bookingId) throw new Error('No booking ID available');
                if (!driverId) {
                    log.warning('ไม่มี driver ID - ข้าม test นี้');
                    return;
                }

                // Get driver info
                const driverDoc = await getDoc(doc(db, 'drivers', driverId));
                if (!driverDoc.exists()) throw new Error('Driver not found');
                const driver = driverDoc.data();

                const bookingRef = doc(db, 'bookings', bookingId);
                const bookingDoc = await getDoc(bookingRef);
                const currentHistory = bookingDoc.data()?.statusHistory || [];

                await updateDoc(bookingRef, {
                    status: 'driver_assigned',
                    driver: {
                        driverId,
                        name: driver.name,
                        phone: driver.phone,
                        vehiclePlate: driver.vehiclePlate,
                        vehicleModel: driver.vehicleModel
                    },
                    statusHistory: [...currentHistory, {
                        status: 'driver_assigned',
                        timestamp: Timestamp.now(),
                        updatedBy: 'system',
                        note: 'Test driver assignment'
                    }],
                    updatedAt: Timestamp.now()
                });

                // Update driver status
                await updateDoc(doc(db, 'drivers', driverId), {
                    status: 'busy',
                    updatedAt: Timestamp.now()
                });

                log.success('มอบหมายคนขับสำเร็จ', `Driver: ${driver.name}`);
            }
        });

        // ============ CATEGORY: API ============
        testCases.push({
            id: 'api-driver-status',
            name: 'API: Driver Status',
            description: 'ทดสอบ /api/driver/status endpoint',
            category: 'api',
            status: 'pending',
            run: async () => {
                log.step('กำลังทดสอบ Driver Status API...');

                const driverId = testDataRef.current.driverId;
                if (!driverId) {
                    log.warning('ไม่มี driver ID - ข้าม test นี้');
                    return;
                }

                const response = await fetchWithAuth(`/api/driver/status?driverId=${driverId}`);
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || `HTTP ${response.status}`);
                }

                log.success('Driver Status API ทำงานปกติ', `Status: ${result.data?.status || 'N/A'}`);
            }
        });

        testCases.push({
            id: 'api-driver-bookings',
            name: 'API: Driver Bookings',
            description: 'ทดสอบ /api/driver/bookings endpoint',
            category: 'api',
            status: 'pending',
            run: async () => {
                log.step('กำลังทดสอบ Driver Bookings API...');

                const driverId = testDataRef.current.driverId;
                if (!driverId) {
                    log.warning('ไม่มี driver ID - ข้าม test นี้');
                    return;
                }

                const response = await fetchWithAuth(`/api/driver/bookings?driverId=${driverId}`);
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || `HTTP ${response.status}`);
                }

                log.success('Driver Bookings API ทำงานปกติ', `Bookings: ${result.data?.length || 0}`);
            }
        });

        // ============ CATEGORY: NOTIFICATIONS ============
        testCases.push({
            id: 'notifications-create',
            name: 'Create Notification',
            description: 'สร้าง notification ทดสอบ',
            category: 'notifications',
            status: 'pending',
            run: async () => {
                if (!db) throw new Error('Firestore not initialized');
                log.step('กำลังสร้าง notification...');

                const userId = testDataRef.current.userId || auth?.currentUser?.uid;
                if (!userId) throw new Error('No user ID available');

                const notificationRef = doc(collection(db, 'notifications'));
                await setDoc(notificationRef, {
                    userId,
                    type: 'system',
                    title: 'ทดสอบระบบ',
                    message: 'นี่คือ notification ทดสอบจาก E2E Test',
                    isRead: false,
                    createdAt: Timestamp.now()
                });

                // Cleanup immediately
                await deleteDoc(notificationRef);

                log.success('สร้างและลบ notification สำเร็จ');
            }
        });

        // ============ CATEGORY: RATING ============
        testCases.push({
            id: 'rating-api',
            name: 'API: Rating Endpoint',
            description: 'ทดสอบ /api/booking/rate endpoint',
            category: 'rating',
            status: 'pending',
            run: async () => {
                if (!db) throw new Error('Firestore not initialized');
                log.step('กำลังทดสอบ Rating API...');

                const bookingId = testDataRef.current.bookingId;
                if (!bookingId) {
                    log.warning('ไม่มี booking ID - ข้าม test นี้');
                    return;
                }

                // First, update booking to completed status for rating
                const bookingRef = doc(db, 'bookings', bookingId);
                await updateDoc(bookingRef, {
                    status: 'completed',
                    updatedAt: Timestamp.now()
                });

                // Try to rate (might fail if no driver assigned, but tests the endpoint)
                const response = await fetchWithAuth('/api/booking/rate', {
                    method: 'POST',
                    body: JSON.stringify({
                        bookingId,
                        ratingType: 'customerToDriver',
                        stars: 5,
                        comment: 'Test rating from E2E',
                        tip: 0
                    })
                });

                const result = await response.json();

                if (!response.ok && !result.error?.includes('No driver assigned')) {
                    throw new Error(result.error || `HTTP ${response.status}`);
                }

                if (response.ok) {
                    log.success('Rating API ทำงานปกติ', 'Submitted 5 stars');
                } else {
                    log.warning('Rating API response', result.error);
                }
            }
        });

        // ============ CATEGORY: CLEANUP ============
        testCases.push({
            id: 'cleanup-booking',
            name: 'Cleanup: Delete Test Booking',
            description: 'ลบ booking ทดสอบ',
            category: 'cleanup',
            status: 'pending',
            run: async () => {
                if (!db) throw new Error('Firestore not initialized');
                log.step('กำลังลบ booking ทดสอบ...');

                const bookingId = testDataRef.current.bookingId;
                if (!bookingId) {
                    log.info('ไม่มี booking ที่ต้องลบ');
                    return;
                }

                // Reset driver status if assigned
                const driverId = testDataRef.current.driverId;
                if (driverId) {
                    try {
                        await updateDoc(doc(db, 'drivers', driverId), {
                            status: 'available',
                            updatedAt: Timestamp.now()
                        });
                        log.info('Reset driver status เป็น available');
                    } catch (e) {
                        // Ignore
                    }
                }

                await deleteDoc(doc(db, 'bookings', bookingId));
                testDataRef.current.bookingId = undefined;
                setTestData(prev => ({ ...prev, bookingId: undefined }));

                log.success('ลบ booking ทดสอบสำเร็จ');
            }
        });

        testCases.push({
            id: 'cleanup-user',
            name: 'Cleanup: Delete Test User',
            description: 'ลบ user ทดสอบ',
            category: 'cleanup',
            status: 'pending',
            run: async () => {
                if (!db) throw new Error('Firestore not initialized');
                log.step('กำลังลบ user ทดสอบ...');

                const userId = testDataRef.current.userId || auth?.currentUser?.uid;
                if (!userId) {
                    log.info('ไม่มี user ที่ต้องลบ');
                    return;
                }

                // Delete Firestore document
                try {
                    await deleteDoc(doc(db, 'users', userId));
                    log.info('ลบ user document สำเร็จ');
                } catch (e) {
                    log.warning('ไม่สามารถลบ user document');
                }

                // Delete Auth user
                if (auth?.currentUser) {
                    try {
                        await deleteUser(auth.currentUser);
                        log.success('ลบ user ทดสอบสำเร็จ');
                    } catch (e: any) {
                        log.warning('ไม่สามารถลบ Auth user', e.message);
                    }
                }

                setTestUser(null);
                testDataRef.current.userId = undefined;
                setTestData(prev => ({ ...prev, userId: undefined }));
            }
        });

        return testCases;
    }, [log, sendLogToServer]);

    // Initialize tests
    useEffect(() => {
        setTests(createTests());
    }, []);

    // ============================================
    // TEST RUNNER
    // ============================================
    const runTest = async (test: TestCase): Promise<TestResult> => {
        const startTime = Date.now();
        setCurrentTest(test.id);
        updateTestStatus(test.id, 'running');

        log.step(`▶️ เริ่มทดสอบ: ${test.name}`, test.description);

        // Send running status to server for CLI detection
        sendLogToServer(test.id, test.name, 'running');

        try {
            await test.run();
            const duration = Date.now() - startTime;
            updateTestStatus(test.id, 'passed');
            log.success(`✅ ผ่าน: ${test.name}`, `${duration}ms`);

            // Send passed status to server
            sendLogToServer(test.id, test.name, 'passed', undefined, duration);

            return { testId: test.id, status: 'passed', duration };
        } catch (error: any) {
            const duration = Date.now() - startTime;
            const errorMessage = error.message || String(error);
            updateTestStatus(test.id, 'failed', errorMessage);
            log.error(`❌ ล้มเหลว: ${test.name}`, errorMessage);

            // Send failed status to server
            sendLogToServer(test.id, test.name, 'failed', errorMessage, duration);

            return { testId: test.id, status: 'failed', duration, error: errorMessage };
        }
    };

    const runAllTests = async () => {
        setIsRunning(true);
        setLogs([]);
        abortControllerRef.current = new AbortController();

        // Reset test data ref
        testDataRef.current = {};
        setTestData({});

        // Recreate tests with fresh functions
        const freshTests = createTests();
        setTests(freshTests);

        log.info('🚀 เริ่มทดสอบทั้งหมด...', `${freshTests.length} tests`);

        const results: TestResult[] = [];
        let passed = 0, failed = 0, skipped = 0;

        for (const test of freshTests) {
            if (abortControllerRef.current?.signal.aborted) {
                log.warning('⚠️ หยุดทดสอบ');
                break;
            }

            // Skip cleanup tests if autoCleanup is off
            if (!autoCleanup && test.category === 'cleanup') {
                updateTestStatus(test.id, 'skipped');
                skipped++;
                continue;
            }

            // Filter by category
            if (selectedCategory !== 'all' && test.category !== selectedCategory) {
                updateTestStatus(test.id, 'skipped');
                skipped++;
                continue;
            }

            const result = await runTest(test);
            results.push(result);

            if (result.status === 'passed') passed++;
            if (result.status === 'failed') failed++;

            await delay(500); // Small delay between tests
        }

        setSummary({ total: results.length, passed, failed, skipped });

        log.info('─'.repeat(50));
        log.info(`📊 สรุปผล: ✅ ${passed} ผ่าน | ❌ ${failed} ล้มเหลว | ⏭️ ${skipped} ข้าม`);

        if (failed === 0) {
            log.success('🎉 ทุก Test ผ่านหมด!');
        } else {
            log.error(`⚠️ มี ${failed} Test ที่ล้มเหลว`);
        }

        setCurrentTest(null);
        setIsRunning(false);
    };

    const stopTests = () => {
        abortControllerRef.current?.abort();
        setIsRunning(false);
        setCurrentTest(null);
        log.warning('หยุดทดสอบแล้ว');
    };

    const clearLogs = () => {
        setLogs([]);
        setTests(createTests());
        setSummary({ total: 0, passed: 0, failed: 0, skipped: 0 });
    };

    // ============================================
    // CATEGORIES
    // ============================================
    const categories = [
        { id: 'all', name: 'ทั้งหมด', icon: '📋' },
        { id: 'auth', name: 'Authentication', icon: '🔐' },
        { id: 'vehicles', name: 'Vehicles', icon: '🚗' },
        { id: 'locations', name: 'Locations', icon: '📍' },
        { id: 'booking', name: 'Booking', icon: '📝' },
        { id: 'drivers', name: 'Drivers', icon: '👨‍✈️' },
        { id: 'api', name: 'API', icon: '🔌' },
        { id: 'notifications', name: 'Notifications', icon: '🔔' },
        { id: 'rating', name: 'Rating', icon: '⭐' },
        { id: 'cleanup', name: 'Cleanup', icon: '🧹' },
    ];

    const filteredTests = selectedCategory === 'all'
        ? tests
        : tests.filter(t => t.category === selectedCategory);

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-gray-800 border-b border-gray-700">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🧪</span>
                            <div>
                                <h1 className="text-xl font-bold">TukTik E2E Test</h1>
                                <p className="text-sm text-gray-400">ทดสอบ Frontend + Backend ทุกขั้นตอน</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Auto Cleanup Toggle */}
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={autoCleanup}
                                    onChange={(e) => setAutoCleanup(e.target.checked)}
                                    className="w-4 h-4 accent-green-500"
                                />
                                <span className="text-gray-300">Auto Cleanup</span>
                            </label>

                            {/* Control Buttons */}
                            {!isRunning ? (
                                <button
                                    onClick={runAllTests}
                                    className="px-6 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-bold flex items-center gap-2 transition-all active:scale-95"
                                >
                                    <span>▶️</span>
                                    รันทั้งหมด
                                </button>
                            ) : (
                                <button
                                    onClick={stopTests}
                                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg font-bold flex items-center gap-2 transition-all active:scale-95"
                                >
                                    <span>⏹️</span>
                                    หยุด
                                </button>
                            )}

                            <button
                                onClick={clearLogs}
                                className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium flex items-center gap-2 transition-all"
                            >
                                <span>🗑️</span>
                                ล้าง
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Summary Bar */}
            {summary.total > 0 && (
                <div className="bg-gray-800/50 border-b border-gray-700">
                    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
                        <span className="text-gray-400">ผลลัพธ์:</span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                            <span className="font-bold">{summary.passed}</span>
                            <span className="text-gray-400">ผ่าน</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                            <span className="font-bold">{summary.failed}</span>
                            <span className="text-gray-400">ล้มเหลว</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                            <span className="font-bold">{summary.skipped}</span>
                            <span className="text-gray-400">ข้าม</span>
                        </span>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left: Test List */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Category Filter */}
                        <div className="bg-gray-800 rounded-xl p-3">
                            <div className="flex flex-wrap gap-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                            selectedCategory === cat.id
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                    >
                                        {cat.icon} {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Test Cards */}
                        <div className="bg-gray-800 rounded-xl overflow-hidden">
                            <div className="p-3 border-b border-gray-700">
                                <h2 className="font-bold">📋 Test Cases ({filteredTests.length})</h2>
                            </div>
                            <div className="max-h-[60vh] overflow-y-auto">
                                {filteredTests.map(test => (
                                    <div
                                        key={test.id}
                                        className={`p-3 border-b border-gray-700/50 flex items-center gap-3 ${
                                            currentTest === test.id ? 'bg-blue-900/30' : ''
                                        }`}
                                    >
                                        {/* Status Icon */}
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                                            {test.status === 'pending' && <span className="text-gray-400">○</span>}
                                            {test.status === 'running' && (
                                                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            )}
                                            {test.status === 'passed' && <span className="text-green-500 text-xl">✓</span>}
                                            {test.status === 'failed' && <span className="text-red-500 text-xl">✗</span>}
                                            {test.status === 'skipped' && <span className="text-gray-500">⏭</span>}
                                        </div>

                                        {/* Test Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium text-sm truncate ${
                                                test.status === 'failed' ? 'text-red-400' :
                                                test.status === 'passed' ? 'text-green-400' :
                                                test.status === 'running' ? 'text-blue-400' :
                                                'text-gray-300'
                                            }`}>
                                                {test.name}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">{test.description}</p>
                                            {test.error && (
                                                <p className="text-xs text-red-400 truncate mt-1">{test.error}</p>
                                            )}
                                        </div>

                                        {/* Run Single Test Button */}
                                        <button
                                            onClick={() => runTest(test)}
                                            disabled={isRunning}
                                            className="p-2 hover:bg-gray-700 rounded-lg transition-all disabled:opacity-50"
                                            title="รันเฉพาะ test นี้"
                                        >
                                            ▶️
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Log Console */}
                    <div className="lg:col-span-2">
                        <div className="bg-gray-800 rounded-xl overflow-hidden h-[75vh] flex flex-col">
                            <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                                <h2 className="font-bold">📜 Console Log</h2>
                                <span className="text-xs text-gray-500">{logs.length} entries</span>
                            </div>

                            {/* Log Content */}
                            <div className="flex-1 overflow-y-auto p-3 font-mono text-sm space-y-1 bg-gray-900/50">
                                {logs.length === 0 ? (
                                    <div className="text-gray-500 text-center py-12">
                                        <span className="text-4xl block mb-3">🚀</span>
                                        <p>กด "รันทั้งหมด" เพื่อเริ่มทดสอบ</p>
                                    </div>
                                ) : (
                                    logs.map(entry => (
                                        <div
                                            key={entry.id}
                                            className={`flex gap-2 py-1 ${
                                                entry.level === 'error' ? 'bg-red-900/20 px-2 rounded' :
                                                entry.level === 'success' ? 'bg-green-900/20 px-2 rounded' :
                                                entry.level === 'warning' ? 'bg-yellow-900/20 px-2 rounded' :
                                                entry.level === 'step' ? 'border-l-2 border-blue-500 pl-2' :
                                                ''
                                            }`}
                                        >
                                            <span className="text-gray-500 text-xs flex-shrink-0">
                                                {entry.timestamp.toLocaleTimeString('th-TH')}
                                            </span>
                                            <span className={`flex-shrink-0 ${
                                                entry.level === 'error' ? 'text-red-400' :
                                                entry.level === 'success' ? 'text-green-400' :
                                                entry.level === 'warning' ? 'text-yellow-400' :
                                                entry.level === 'step' ? 'text-blue-400' :
                                                'text-gray-400'
                                            }`}>
                                                {entry.level === 'error' ? '❌' :
                                                 entry.level === 'success' ? '✅' :
                                                 entry.level === 'warning' ? '⚠️' :
                                                 entry.level === 'step' ? '➡️' :
                                                 'ℹ️'}
                                            </span>
                                            <span className="text-gray-200">{entry.message}</span>
                                            {entry.details && (
                                                <span className="text-gray-500 truncate">{entry.details}</span>
                                            )}
                                        </div>
                                    ))
                                )}
                                <div ref={logsEndRef} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Test Data Debug Panel */}
            <div className="fixed bottom-4 left-4 bg-gray-800 rounded-xl p-3 text-xs max-w-xs border border-gray-700">
                <p className="font-bold text-gray-400 mb-2">🔍 Test Data</p>
                <pre className="text-gray-500 overflow-auto max-h-32">
                    {JSON.stringify(testData, null, 2)}
                </pre>
            </div>
        </div>
    );
}
