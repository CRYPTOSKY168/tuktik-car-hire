// ====================================
// TukTik Car Rental - Driver Service
// ====================================

import { db } from '../config';
import {
    collection,
    addDoc,
    getDoc,
    doc,
    Timestamp,
    getDocs,
    updateDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    increment as incrementValue
} from 'firebase/firestore';
import { Driver, DriverStatus, DriverSetupStatus } from '@/lib/types';
import { COLLECTIONS, DEFAULT_VALUES } from '@/lib/constants';

export const DriverService = {
    async getDrivers(): Promise<Driver[]> {
        if (!db) return [];
        try {
            const q = query(collection(db!, COLLECTIONS.DRIVERS), orderBy('name'));
            const snapshot = await getDocs(q);
            return snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((d: any) => d.isActive !== false) as Driver[];
        } catch {
            return [];
        }
    },

    async getAllDrivers(): Promise<Driver[]> {
        if (!db) return [];
        try {
            const q = query(collection(db!, COLLECTIONS.DRIVERS), orderBy('name'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Driver[];
        } catch {
            return [];
        }
    },

    subscribeToDrivers(callback: (drivers: Driver[]) => void): () => void {
        if (!db) {
            callback([]);
            return () => {};
        }

        const q = query(collection(db!, COLLECTIONS.DRIVERS), orderBy('name'));

        return onSnapshot(q, (snapshot) => {
            const drivers = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((d: any) => {
                    // Only filter out explicitly inactive drivers
                    const isActive = d.isActive !== false;
                    // Accept drivers without setupStatus (legacy) or with approved status
                    const isApproved = !d.setupStatus || d.setupStatus === DriverSetupStatus.APPROVED || d.setupStatus === 'approved';
                    return isActive && isApproved;
                }) as Driver[];
            callback(drivers);
        }, () => {
            callback([]);
        });
    },

    async getDriver(id: string): Promise<Driver | null> {
        if (!db) return null;
        try {
            const docSnap = await getDoc(doc(db!, COLLECTIONS.DRIVERS, id));
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as Driver;
            }
            return null;
        } catch {
            return null;
        }
    },

    async getDriverById(driverId: string): Promise<Driver | null> {
        return this.getDriver(driverId);
    },

    async addDriver(driverData: {
        name: string;
        phone: string;
        email?: string;
        vehiclePlate?: string;
        vehicleModel?: string;
        vehicleColor?: string;
        licenseNumber?: string;
        photo?: string;
        status?: DriverStatus;
        notes?: string;
    }): Promise<string> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const docRef = await addDoc(collection(db!, COLLECTIONS.DRIVERS), {
                ...driverData,
                status: driverData.status || DriverStatus.AVAILABLE,
                isActive: true,
                totalTrips: DEFAULT_VALUES.INITIAL_TRIP_COUNT,
                rating: DEFAULT_VALUES.DRIVER_RATING,
                ratingCount: DEFAULT_VALUES.INITIAL_RATING_COUNT,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
            return docRef.id;
        } catch (error) {
            throw error;
        }
    },

    async updateDriver(id: string, driverData: Partial<Driver>): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const driverRef = doc(db!, COLLECTIONS.DRIVERS, id);
            await updateDoc(driverRef, {
                ...driverData,
                updatedAt: Timestamp.now()
            });
        } catch (error) {
            throw error;
        }
    },

    async deleteDriver(id: string): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const driverRef = doc(db!, COLLECTIONS.DRIVERS, id);
            await updateDoc(driverRef, { isActive: false, updatedAt: Timestamp.now() });
        } catch (error) {
            throw error;
        }
    },

    async updateDriverStatus(id: string, status: DriverStatus): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const driverRef = doc(db!, COLLECTIONS.DRIVERS, id);
            await updateDoc(driverRef, { status, updatedAt: Timestamp.now() });
        } catch (error) {
            throw error;
        }
    },

    async incrementDriverTrips(id: string): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const driverRef = doc(db!, COLLECTIONS.DRIVERS, id);
            await updateDoc(driverRef, {
                totalTrips: incrementValue(1),
                updatedAt: Timestamp.now()
            });
        } catch (error) {
            throw error;
        }
    },

    async getDriverByPhone(phone: string): Promise<Driver | null> {
        if (!db) return null;
        try {
            const cleanPhone = phone.replace(/[^0-9+]/g, '');
            const q = query(collection(db!, COLLECTIONS.DRIVERS), where('phone', '==', cleanPhone));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Driver;
            }
            // Try without + prefix
            const q2 = query(collection(db!, COLLECTIONS.DRIVERS), where('phone', '==', cleanPhone.replace('+', '')));
            const snapshot2 = await getDocs(q2);
            if (!snapshot2.empty) {
                return { id: snapshot2.docs[0].id, ...snapshot2.docs[0].data() } as Driver;
            }
            return null;
        } catch {
            return null;
        }
    },

    async rateDriver(driverId: string, newRating: number): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const driverRef = doc(db!, COLLECTIONS.DRIVERS, driverId);
            const driverSnap = await getDoc(driverRef);

            if (!driverSnap.exists()) {
                throw new Error("Driver not found");
            }

            const driverData = driverSnap.data();
            const oldRatingCount = driverData.ratingCount || 0;
            const currentAverage = driverData.rating || DEFAULT_VALUES.DRIVER_RATING;

            const newCount = oldRatingCount + 1;
            const newAverage = ((currentAverage * oldRatingCount) + newRating) / newCount;

            await updateDoc(driverRef, {
                rating: newAverage,
                ratingCount: newCount,
                updatedAt: Timestamp.now()
            });
        } catch (error) {
            throw error;
        }
    }
};
