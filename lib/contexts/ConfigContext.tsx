'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ConfigService } from '@/lib/firebase/services';
import { SystemConfig, DEFAULT_SYSTEM_CONFIG } from '@/lib/types';

interface ConfigContextType {
    config: SystemConfig;
    loading: boolean;
    error: string | null;
    refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType>({
    config: DEFAULT_SYSTEM_CONFIG,
    loading: true,
    error: null,
    refreshConfig: async () => {},
});

export function ConfigProvider({ children }: { children: ReactNode }) {
    const [config, setConfig] = useState<SystemConfig>(DEFAULT_SYSTEM_CONFIG);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initial load and subscribe to real-time updates
    useEffect(() => {
        let unsubscribe: (() => void) | null = null;

        const setupSubscription = async () => {
            try {
                // Subscribe to real-time config changes
                unsubscribe = ConfigService.subscribeToConfig((newConfig) => {
                    setConfig(newConfig);
                    setLoading(false);
                    setError(null);
                });
            } catch (err) {
                console.error('Config subscription error:', err);
                setError('Failed to load configuration');
                setLoading(false);
            }
        };

        setupSubscription();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);

    // Manual refresh function
    const refreshConfig = async () => {
        try {
            const newConfig = await ConfigService.getConfig();
            setConfig(newConfig);
            setError(null);
        } catch (err) {
            console.error('Config refresh error:', err);
            setError('Failed to refresh configuration');
        }
    };

    return (
        <ConfigContext.Provider value={{ config, loading, error, refreshConfig }}>
            {children}
        </ConfigContext.Provider>
    );
}

export function useConfig() {
    const context = useContext(ConfigContext);
    if (!context) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return context;
}

// Helper hooks for specific config sections
export function useBookingConfig() {
    const { config, loading } = useConfig();
    return { bookingConfig: config.booking, loading };
}

export function usePricingConfig() {
    const { config, loading } = useConfig();
    return { pricingConfig: config.pricing, loading };
}

export function usePaymentConfig() {
    const { config, loading } = useConfig();
    return { paymentConfig: config.payment, loading };
}

export function useRatingConfig() {
    const { config, loading } = useConfig();
    return { ratingConfig: config.rating, loading };
}

export function useRateLimitConfig() {
    const { config, loading } = useConfig();
    return { rateLimitConfig: config.rateLimit, loading };
}

export function useDriverConfig() {
    const { config, loading } = useConfig();
    return { driverConfig: config.driver, loading };
}

export function useMapConfig() {
    const { config, loading } = useConfig();
    return { mapConfig: config.map, loading };
}

export function usePassengerConfig() {
    const { config, loading } = useConfig();
    return { passengerConfig: config.passenger, loading };
}
