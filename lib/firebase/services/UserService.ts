// ====================================
// TukTik Car Rental - User Service
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
    setDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    writeBatch
} from 'firebase/firestore';
import { User, UserRole, SavedLocation } from '@/lib/types';
import { COLLECTIONS } from '@/lib/constants';

export const UserService = {
    async getUser(userId: string): Promise<User | null> {
        try {
            if (!db) return null;
            const docRef = doc(db!, COLLECTIONS.USERS, userId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as User;
            }
            return null;
        } catch {
            return null;
        }
    },

    async getUserById(userId: string): Promise<User | null> {
        return this.getUser(userId);
    },

    async createUser(userId: string, userData: {
        email?: string;
        displayName?: string;
        phone?: string;
        photoURL?: string;
        provider?: string;
    }): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const userRef = doc(db!, COLLECTIONS.USERS, userId);
            const existingUser = await getDoc(userRef);

            if (existingUser.exists()) {
                await updateDoc(userRef, {
                    ...userData,
                    updatedAt: Timestamp.now()
                });
            } else {
                await setDoc(userRef, {
                    ...userData,
                    role: UserRole.USER,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                });
            }
        } catch (error) {
            throw error;
        }
    },

    async updateUserProfile(userId: string, data: {
        displayName?: string;
        phone?: string;
        email?: string;
        photoURL?: string;
    }): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const userRef = doc(db!, COLLECTIONS.USERS, userId);
            await setDoc(userRef, {
                ...data,
                updatedAt: Timestamp.now()
            }, { merge: true });
        } catch (error) {
            throw error;
        }
    },

    async updateUserRole(userId: string, role: UserRole, email?: string): Promise<void> {
        if (!db) return;
        try {
            const userRef = doc(db!, COLLECTIONS.USERS, userId);
            await setDoc(userRef, {
                role,
                updatedAt: Timestamp.now(),
                email: email || null
            }, { merge: true });
        } catch { /* ignore */ }
    },

    async updateUserLanguage(userId: string, language: string): Promise<void> {
        if (!db) return;
        try {
            const userRef = doc(db!, COLLECTIONS.USERS, userId);
            await setDoc(userRef, {
                language,
                updatedAt: Timestamp.now()
            }, { merge: true });
        } catch { /* ignore */ }
    },

    async getAllUsers(): Promise<User[]> {
        if (!db) return [];
        try {
            const q = query(collection(db!, COLLECTIONS.USERS), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
        } catch {
            return [];
        }
    },

    subscribeToAllUsers(callback: (users: User[]) => void): () => void {
        if (!db) {
            callback([]);
            return () => {};
        }

        const q = query(collection(db!, COLLECTIONS.USERS));

        return onSnapshot(q, (snapshot) => {
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
            callback(users);
        }, () => {
            callback([]);
        });
    },

    async toggleUserActive(userId: string, isActive: boolean): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const userRef = doc(db!, COLLECTIONS.USERS, userId);
            await updateDoc(userRef, {
                isActive: isActive,
                updatedAt: Timestamp.now()
            });
        } catch (error) {
            throw error;
        }
    },

    async deleteUser(userId: string): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const userRef = doc(db!, COLLECTIONS.USERS, userId);
            await updateDoc(userRef, {
                isActive: false,
                deletedAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
        } catch (error) {
            throw error;
        }
    },

    // User Preferences
    async updateUserPreferences(userId: string, preferences: {
        language?: string;
        notifications?: boolean;
        emailPromotions?: boolean;
        currency?: string;
        phone?: string;
    }): Promise<void> {
        if (!db) return;
        try {
            const userRef = doc(db!, COLLECTIONS.USERS, userId);
            await setDoc(userRef, {
                preferences,
                updatedAt: Timestamp.now()
            }, { merge: true });
        } catch { /* ignore */ }
    },

    async getUserPreferences(userId: string): Promise<any> {
        if (!db) return null;
        try {
            const userDoc = await getDoc(doc(db!, COLLECTIONS.USERS, userId));
            if (userDoc.exists()) {
                return userDoc.data().preferences || {};
            }
            return {};
        } catch {
            return {};
        }
    },

    // Saved Locations
    async getUserSavedLocations(userId: string): Promise<SavedLocation[]> {
        if (!db) return [];
        try {
            const q = query(
                collection(db!, COLLECTIONS.USERS, userId, 'savedLocations'),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SavedLocation[];
        } catch {
            return [];
        }
    },

    subscribeToUserSavedLocations(userId: string, callback: (locations: SavedLocation[]) => void): () => void {
        if (!db) {
            callback([]);
            return () => { };
        }

        const q = query(
            collection(db!, COLLECTIONS.USERS, userId, 'savedLocations'),
            orderBy('createdAt', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            const locations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SavedLocation[];
            callback(locations);
        }, () => {
            callback([]);
        });
    },

    async addUserSavedLocation(userId: string, location: {
        name: string;
        address: string;
        type: 'home' | 'work' | 'airport' | 'other';
        coordinates?: { lat: number; lng: number };
    }): Promise<string> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const docRef = await addDoc(collection(db!, COLLECTIONS.USERS, userId, 'savedLocations'), {
                ...location,
                createdAt: Timestamp.now()
            });
            return docRef.id;
        } catch (error) {
            throw error;
        }
    },

    async updateUserSavedLocation(userId: string, locationId: string, data: Partial<SavedLocation>): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const locRef = doc(db!, COLLECTIONS.USERS, userId, 'savedLocations', locationId);
            await updateDoc(locRef, {
                ...data,
                updatedAt: Timestamp.now()
            });
        } catch (error) {
            throw error;
        }
    },

    async deleteUserSavedLocation(userId: string, locationId: string): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            await deleteDoc(doc(db!, COLLECTIONS.USERS, userId, 'savedLocations', locationId));
        } catch (error) {
            throw error;
        }
    },

    // Driver from User
    async createDriverFromUser(userId: string, vehicleData: {
        vehiclePlate: string;
        vehicleModel: string;
        vehicleColor: string;
        licenseNumber?: string;
    }): Promise<string> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const userRef = doc(db!, COLLECTIONS.USERS, userId);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                throw new Error("User not found");
            }

            const userData = userSnap.data();

            // Check if user already has a driver account
            const existingDriverQuery = query(
                collection(db!, COLLECTIONS.DRIVERS),
                where('userId', '==', userId)
            );
            const existingDriverSnap = await getDocs(existingDriverQuery);

            if (!existingDriverSnap.empty) {
                throw new Error("User already has a driver account");
            }

            // Create driver document
            const driverData = {
                userId: userId,
                name: userData.displayName || userData.email?.split('@')[0] || 'Driver',
                phone: userData.phone || '',
                email: userData.email || '',
                vehiclePlate: vehicleData.vehiclePlate,
                vehicleModel: vehicleData.vehicleModel,
                vehicleColor: vehicleData.vehicleColor,
                licenseNumber: vehicleData.licenseNumber || '',
                status: 'offline',
                totalTrips: 0,
                rating: 5.0,
                ratingCount: 0,
                isActive: true,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            const driverRef = await addDoc(collection(db!, COLLECTIONS.DRIVERS), driverData);

            // Update user with driverId reference
            await updateDoc(userRef, {
                driverId: driverRef.id,
                updatedAt: Timestamp.now()
            });

            return driverRef.id;
        } catch (error) {
            throw error;
        }
    },

    // Get all members with their driver status
    async getAllMembersWithDriverStatus(): Promise<any[]> {
        if (!db) return [];
        try {
            const usersQuery = query(collection(db!, COLLECTIONS.USERS), orderBy('createdAt', 'desc'));
            const usersSnap = await getDocs(usersQuery);
            const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const driversSnap = await getDocs(collection(db!, COLLECTIONS.DRIVERS));
            const driversByUserId: Record<string, any> = {};
            driversSnap.docs.forEach(doc => {
                const data = doc.data();
                if (data.userId) {
                    driversByUserId[data.userId] = { id: doc.id, ...data };
                }
            });

            return users.map(user => ({
                ...user,
                isDriver: !!driversByUserId[user.id],
                driverData: driversByUserId[user.id] || null
            }));
        } catch {
            return [];
        }
    }
};
