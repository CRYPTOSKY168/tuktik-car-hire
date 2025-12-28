// ====================================
// TukTik Car Rental - Settings Service
// ====================================

import { db } from '../config';
import {
    getDoc,
    doc,
    Timestamp,
    setDoc
} from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';

export interface AppSettings {
    businessName?: string;
    businessPhone?: string;
    businessEmail?: string;
    businessAddress?: string;
    currency?: string;
    timezone?: string;
    workingHours?: { start: string; end: string };
    autoConfirmBookings?: boolean;
    requirePaymentUpfront?: boolean;
    notifyAdminNewBooking?: boolean;
    notifyCustomerStatusChange?: boolean;
}

export const SettingsService = {
    async getSettings(): Promise<AppSettings | null> {
        if (!db) return null;
        try {
            const docSnap = await getDoc(doc(db!, COLLECTIONS.SETTINGS, 'general'));
            if (docSnap.exists()) {
                return docSnap.data() as AppSettings;
            }
            return null;
        } catch {
            return null;
        }
    },

    async updateSettings(settings: AppSettings): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const settingsRef = doc(db!, COLLECTIONS.SETTINGS, 'general');
            await setDoc(settingsRef, {
                ...settings,
                updatedAt: Timestamp.now()
            }, { merge: true });
        } catch (error) {
            throw error;
        }
    }
};
