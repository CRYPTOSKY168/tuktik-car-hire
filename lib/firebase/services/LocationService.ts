// ====================================
// TukTik Car Rental - Location Service
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
    deleteDoc,
    query,
    where,
    orderBy
} from 'firebase/firestore';
import { Location, Route } from '@/lib/types';
import { COLLECTIONS } from '@/lib/constants';

export const LocationService = {
    // ============ LOCATIONS ============

    async getLocations(): Promise<Location[]> {
        try {
            if (!db) return [];
            const q = query(collection(db!, COLLECTIONS.LOCATIONS));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Location[];
        } catch {
            return [];
        }
    },

    async addLocation(data: Partial<Location>): Promise<string> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const docRef = await addDoc(collection(db!, COLLECTIONS.LOCATIONS), {
                ...data,
                isActive: true,
                createdAt: Timestamp.now()
            });
            return docRef.id;
        } catch (error) {
            throw error;
        }
    },

    async updateLocation(id: string, data: Partial<Location>): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const locRef = doc(db!, COLLECTIONS.LOCATIONS, id);
            await updateDoc(locRef, {
                ...data,
                updatedAt: Timestamp.now()
            });
        } catch (error) {
            throw error;
        }
    },

    async deleteLocation(id: string): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const locRef = doc(db!, COLLECTIONS.LOCATIONS, id);
            await updateDoc(locRef, { isActive: false });
        } catch (error) {
            throw error;
        }
    },

    async seedLocations(locations: any[]): Promise<void> {
        if (!db) return;
        try {
            const batch = writeBatch(db!);
            locations.forEach(loc => {
                const docRef = doc(collection(db!, COLLECTIONS.LOCATIONS));
                batch.set(docRef, {
                    ...loc,
                    isActive: true,
                    createdAt: Timestamp.now()
                });
            });
            await batch.commit();
        } catch { /* ignore */ }
    },

    // ============ ROUTES ============

    async getRoutes(): Promise<Route[]> {
        if (!db) return [];
        try {
            // Note: ใช้ 'origin' ไม่ใช่ 'originName' เพราะ data จริงใช้ field นี้
            const q = query(collection(db!, COLLECTIONS.ROUTES), orderBy('origin'));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Route[];
        } catch (error) {
            console.error('Error fetching routes:', error);
            return [];
        }
    },

    async addRoute(routeData: Partial<Route>): Promise<string> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const docRef = await addDoc(collection(db!, COLLECTIONS.ROUTES), {
                ...routeData,
                isActive: true,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
            return docRef.id;
        } catch (error) {
            throw error;
        }
    },

    async updateRoute(id: string, routeData: Partial<Route>): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const routeRef = doc(db!, COLLECTIONS.ROUTES, id);
            await updateDoc(routeRef, {
                ...routeData,
                updatedAt: Timestamp.now()
            });
        } catch (error) {
            throw error;
        }
    },

    async deleteRoute(id: string): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            await deleteDoc(doc(db!, COLLECTIONS.ROUTES, id));
        } catch (error) {
            throw error;
        }
    },

    async seedRoutes(routes: any[]): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const batch = writeBatch(db!);
            const collectionRef = collection(db!, COLLECTIONS.ROUTES);

            for (const route of routes) {
                const docRef = doc(collectionRef);
                batch.set(docRef, {
                    ...route,
                    isActive: true,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                });
            }
            await batch.commit();
        } catch (error) {
            throw error;
        }
    },

    async getRoutePrice(origin: string, destination: string): Promise<number | null> {
        if (!db) return null;
        try {
            // Match by IDs
            const qIds = query(collection(db!, COLLECTIONS.ROUTES),
                where('originId', '==', origin),
                where('destinationId', '==', destination),
                where('isActive', '==', true)
            );
            const snapIds = await getDocs(qIds);
            if (!snapIds.empty) return snapIds.docs[0].data().prices;

            // Match by Names (Fallback)
            const qNames = query(collection(db!, COLLECTIONS.ROUTES),
                where('origin', '==', origin),
                where('destination', '==', destination),
                where('isActive', '==', true)
            );
            const snapNames = await getDocs(qNames);
            if (!snapNames.empty) return snapNames.docs[0].data().prices;

            return null;
        } catch {
            return null;
        }
    }
};
