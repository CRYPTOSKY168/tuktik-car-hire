// ====================================
// TukTik Car Rental - Config Service
// System configuration management
// ====================================

import { db } from '../config';
import {
    getDoc,
    doc,
    setDoc,
    onSnapshot,
    Timestamp,
    Unsubscribe
} from 'firebase/firestore';
import { SystemConfig, DEFAULT_SYSTEM_CONFIG } from '@/lib/types';

const CONFIG_COLLECTION = 'settings';
const CONFIG_DOC_ID = 'system_config';

export const ConfigService = {
    /**
     * Get system configuration
     * Returns default config if not set
     */
    async getConfig(): Promise<SystemConfig> {
        if (!db) return DEFAULT_SYSTEM_CONFIG;

        try {
            const docSnap = await getDoc(doc(db!, CONFIG_COLLECTION, CONFIG_DOC_ID));
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Merge with defaults to ensure all fields exist
                return {
                    booking: { ...DEFAULT_SYSTEM_CONFIG.booking, ...data.booking },
                    pricing: { ...DEFAULT_SYSTEM_CONFIG.pricing, ...data.pricing },
                    payment: { ...DEFAULT_SYSTEM_CONFIG.payment, ...data.payment },
                    rating: { ...DEFAULT_SYSTEM_CONFIG.rating, ...data.rating },
                    rateLimit: { ...DEFAULT_SYSTEM_CONFIG.rateLimit, ...data.rateLimit },
                    driver: { ...DEFAULT_SYSTEM_CONFIG.driver, ...data.driver },
                    map: { ...DEFAULT_SYSTEM_CONFIG.map, ...data.map },
                    passenger: { ...DEFAULT_SYSTEM_CONFIG.passenger, ...data.passenger },
                    updatedAt: data.updatedAt,
                    updatedBy: data.updatedBy,
                };
            }
            return DEFAULT_SYSTEM_CONFIG;
        } catch (error) {
            console.error('Error fetching config:', error);
            return DEFAULT_SYSTEM_CONFIG;
        }
    },

    /**
     * Update system configuration (Admin only)
     */
    async updateConfig(config: Partial<SystemConfig>, adminEmail: string): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");

        try {
            const configRef = doc(db!, CONFIG_COLLECTION, CONFIG_DOC_ID);

            // Get current config
            const currentDoc = await getDoc(configRef);
            const currentConfig = currentDoc.exists()
                ? currentDoc.data()
                : DEFAULT_SYSTEM_CONFIG;

            // Merge updates
            const updatedConfig = {
                booking: { ...currentConfig.booking, ...config.booking },
                pricing: { ...currentConfig.pricing, ...config.pricing },
                payment: { ...currentConfig.payment, ...config.payment },
                rating: { ...currentConfig.rating, ...config.rating },
                rateLimit: { ...currentConfig.rateLimit, ...config.rateLimit },
                driver: { ...currentConfig.driver, ...config.driver },
                map: { ...currentConfig.map, ...config.map },
                passenger: { ...currentConfig.passenger, ...config.passenger },
                updatedAt: Timestamp.now(),
                updatedBy: adminEmail,
            };

            await setDoc(configRef, updatedConfig);
        } catch (error) {
            console.error('Error updating config:', error);
            throw error;
        }
    },

    /**
     * Subscribe to config changes (real-time updates)
     */
    subscribeToConfig(callback: (config: SystemConfig) => void): Unsubscribe {
        if (!db) {
            callback(DEFAULT_SYSTEM_CONFIG);
            return () => {};
        }

        return onSnapshot(
            doc(db!, CONFIG_COLLECTION, CONFIG_DOC_ID),
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    callback({
                        booking: { ...DEFAULT_SYSTEM_CONFIG.booking, ...data.booking },
                        pricing: { ...DEFAULT_SYSTEM_CONFIG.pricing, ...data.pricing },
                        payment: { ...DEFAULT_SYSTEM_CONFIG.payment, ...data.payment },
                        rating: { ...DEFAULT_SYSTEM_CONFIG.rating, ...data.rating },
                        rateLimit: { ...DEFAULT_SYSTEM_CONFIG.rateLimit, ...data.rateLimit },
                        driver: { ...DEFAULT_SYSTEM_CONFIG.driver, ...data.driver },
                        map: { ...DEFAULT_SYSTEM_CONFIG.map, ...data.map },
                        passenger: { ...DEFAULT_SYSTEM_CONFIG.passenger, ...data.passenger },
                        updatedAt: data.updatedAt,
                        updatedBy: data.updatedBy,
                    });
                } else {
                    callback(DEFAULT_SYSTEM_CONFIG);
                }
            },
            (error) => {
                console.error('Config subscription error:', error);
                callback(DEFAULT_SYSTEM_CONFIG);
            }
        );
    },

    /**
     * Reset to default configuration
     */
    async resetToDefaults(adminEmail: string): Promise<void> {
        if (!db) throw new Error("Firebase not initialized");

        const configRef = doc(db!, CONFIG_COLLECTION, CONFIG_DOC_ID);
        await setDoc(configRef, {
            ...DEFAULT_SYSTEM_CONFIG,
            updatedAt: Timestamp.now(),
            updatedBy: adminEmail,
        });
    },
};
