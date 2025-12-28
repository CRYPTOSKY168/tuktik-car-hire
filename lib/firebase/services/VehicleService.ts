// ====================================
// TukTik Car Rental - Vehicle Service
// ====================================

import { db } from '../config';
import {
    collection,
    addDoc,
    getDoc,
    doc,
    Timestamp,
    getDocs,
    writeBatch,
    updateDoc,
    increment as incrementValue
} from 'firebase/firestore';
import { Vehicle } from '@/lib/types';
import { COLLECTIONS, DEFAULT_VALUES } from '@/lib/constants';

export const VehicleService = {
    async getVehicles(): Promise<Vehicle[]> {
        try {
            if (!db) return [];
            const querySnapshot = await getDocs(collection(db!, COLLECTIONS.VEHICLES));
            return querySnapshot.docs
                .map(doc => ({ ...doc.data(), id: doc.id }))
                .filter((v: any) => v.isActive !== false) as Vehicle[];
        } catch (error: any) {
            // Suppress permission errors for unauthenticated users
            if (error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions')) {
                return [];
            }
            return [];
        }
    },

    async getVehicle(id: string): Promise<Vehicle | null> {
        try {
            if (!db) return null;
            const docRef = doc(db!, COLLECTIONS.VEHICLES, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { ...docSnap.data(), id: docSnap.id } as Vehicle;
            }
            return null;
        } catch {
            return null;
        }
    },

    async addVehicle(vehicleData: Partial<Vehicle>): Promise<string> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const docRef = await addDoc(collection(db!, COLLECTIONS.VEHICLES), {
                ...vehicleData,
                likes: 0,
                rating: DEFAULT_VALUES.VEHICLE_RATING,
                ratingCount: DEFAULT_VALUES.INITIAL_RATING_COUNT,
                reviews: 0,
                createdAt: Timestamp.now(),
                isActive: true
            });
            return docRef.id;
        } catch (error) {
            throw error;
        }
    },

    async updateVehicle(vehicleId: string, data: Partial<Vehicle>): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const vehicleRef = doc(db!, COLLECTIONS.VEHICLES, vehicleId);
            await updateDoc(vehicleRef, {
                ...data,
                updatedAt: Timestamp.now()
            });
        } catch (error) {
            throw error;
        }
    },

    async deleteVehicle(vehicleId: string): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const vehicleRef = doc(db!, COLLECTIONS.VEHICLES, vehicleId);
            await updateDoc(vehicleRef, { isActive: false });
        } catch (error) {
            throw error;
        }
    },

    async toggleLike(vehicleId: string, increment: boolean): Promise<void> {
        if (!db) return;
        try {
            const vehicleRef = doc(db!, COLLECTIONS.VEHICLES, vehicleId);
            await updateDoc(vehicleRef, {
                likes: increment ? incrementValue(1) : incrementValue(-1)
            });
        } catch { /* ignore */ }
    },

    async rateVehicle(vehicleId: string, newRating: number, oldRatingCount: number, currentAverage: number): Promise<void> {
        if (!db) return;
        try {
            const newCount = oldRatingCount + 1;
            const newAverage = ((currentAverage * oldRatingCount) + newRating) / newCount;

            const vehicleRef = doc(db!, COLLECTIONS.VEHICLES, vehicleId);
            await updateDoc(vehicleRef, {
                rating: newAverage,
                ratingCount: newCount
            });
        } catch { /* ignore */ }
    },

    async seedVehicles(vehicles: any[]): Promise<void> {
        if (!db) return;
        try {
            const batch = writeBatch(db!);
            vehicles.forEach(vehicle => {
                const docRef = doc(collection(db!, COLLECTIONS.VEHICLES));
                const vehicleData = {
                    ...vehicle,
                    likes: 0,
                    rating: DEFAULT_VALUES.VEHICLE_RATING,
                    ratingCount: DEFAULT_VALUES.INITIAL_RATING_COUNT,
                    reviews: 0
                };
                batch.set(docRef, vehicleData);
            });
            await batch.commit();
        } catch { /* ignore */ }
    }
};
