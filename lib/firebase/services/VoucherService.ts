// ====================================
// TukTik Car Rental - Voucher Service
// ====================================

import { db } from '../config';
import {
    collection,
    addDoc,
    Timestamp,
    getDocs,
    updateDoc,
    doc,
    query,
    where,
    orderBy,
    onSnapshot
} from 'firebase/firestore';
import { Voucher, UserVoucher } from '@/lib/types';
import { COLLECTIONS } from '@/lib/constants';

export const VoucherService = {
    async getActiveVouchers(): Promise<Voucher[]> {
        if (!db) return [];
        try {
            const q = query(
                collection(db!, COLLECTIONS.VOUCHERS),
                where('isActive', '==', true)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((v: any) => !v.expiresAt || v.expiresAt.toDate() > new Date()) as Voucher[];
        } catch {
            return [];
        }
    },

    async getUserVouchers(userId: string): Promise<UserVoucher[]> {
        if (!db) return [];
        try {
            const q = query(
                collection(db!, COLLECTIONS.USERS, userId, 'vouchers'),
                orderBy('assignedAt', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserVoucher[];
        } catch {
            return [];
        }
    },

    subscribeToUserVouchers(userId: string, callback: (vouchers: UserVoucher[]) => void): () => void {
        if (!db) {
            callback([]);
            return () => { };
        }

        const q = query(
            collection(db!, COLLECTIONS.USERS, userId, 'vouchers'),
            orderBy('assignedAt', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            const vouchers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserVoucher[];
            callback(vouchers);
        }, () => {
            callback([]);
        });
    },

    async validateVoucher(code: string): Promise<{ valid: boolean; voucher?: Voucher; error?: string }> {
        if (!db) return { valid: false, error: 'Database not initialized' };
        try {
            const q = query(
                collection(db!, COLLECTIONS.VOUCHERS),
                where('code', '==', code.toUpperCase()),
                where('isActive', '==', true)
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                return { valid: false, error: 'Invalid voucher code' };
            }

            const voucher = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Voucher;

            // Check expiration
            if (voucher.expiresAt && (voucher.expiresAt as any).toDate() < new Date()) {
                return { valid: false, error: 'Voucher has expired' };
            }

            // Check usage limit
            if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
                return { valid: false, error: 'Voucher usage limit reached' };
            }

            return { valid: true, voucher };
        } catch {
            return { valid: false, error: 'Failed to validate voucher' };
        }
    },

    async assignVoucherToUser(userId: string, voucher: {
        code: string;
        discount: string;
        discountType: 'percentage' | 'fixed';
        discountValue: number;
        description: string;
        expiresAt: Date;
        minPurchase?: number;
    }): Promise<string> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            // Check if user already has this voucher
            const existingQ = query(
                collection(db!, COLLECTIONS.USERS, userId, 'vouchers'),
                where('code', '==', voucher.code)
            );
            const existing = await getDocs(existingQ);
            if (!existing.empty) {
                throw new Error('You already have this voucher');
            }

            const docRef = await addDoc(collection(db!, COLLECTIONS.USERS, userId, 'vouchers'), {
                ...voucher,
                expiresAt: Timestamp.fromDate(voucher.expiresAt),
                assignedAt: Timestamp.now(),
                used: false
            });
            return docRef.id;
        } catch (error) {
            throw error;
        }
    },

    async redeemVoucher(userId: string, voucherId: string, bookingId: string): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const voucherRef = doc(db!, COLLECTIONS.USERS, userId, 'vouchers', voucherId);
            await updateDoc(voucherRef, {
                used: true,
                usedAt: Timestamp.now(),
                usedForBooking: bookingId
            });
        } catch (error) {
            throw error;
        }
    },

    async createVoucher(voucherData: {
        code: string;
        discount: string;
        discountType: 'percentage' | 'fixed';
        discountValue: number;
        description: string;
        expiresAt: Date;
        usageLimit?: number;
        minPurchase?: number;
        isGlobal?: boolean;
    }): Promise<string> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const docRef = await addDoc(collection(db!, COLLECTIONS.VOUCHERS), {
                ...voucherData,
                code: voucherData.code.toUpperCase(),
                expiresAt: Timestamp.fromDate(voucherData.expiresAt),
                isActive: true,
                usedCount: 0,
                createdAt: Timestamp.now()
            });
            return docRef.id;
        } catch (error) {
            throw error;
        }
    },

    async deleteVoucher(voucherId: string): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");
        try {
            const voucherRef = doc(db!, COLLECTIONS.VOUCHERS, voucherId);
            await updateDoc(voucherRef, { isActive: false });
        } catch (error) {
            throw error;
        }
    }
};
