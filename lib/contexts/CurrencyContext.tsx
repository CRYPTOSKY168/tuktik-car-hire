'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Currency = 'THB' | 'USD';

interface CurrencyContextType {
    currency: Currency;
    toggleCurrency: () => void;
    setCurrency: (currency: Currency) => void;
    formatPrice: (priceTHB: number, priceUSD?: number) => string;
    exchangeRate: number; // 1 USD = X THB
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
    const [currency, setCurrencyState] = useState<Currency>('THB');
    const [exchangeRate] = useState(34.0); // Default exchange rate

    // Persist currency preference
    useEffect(() => {
        const saved = localStorage.getItem('app_currency') as Currency;
        if (saved && (saved === 'THB' || saved === 'USD')) {
            setCurrencyState(saved);
        }
    }, []);

    const setCurrency = (c: Currency) => {
        setCurrencyState(c);
        localStorage.setItem('app_currency', c);
    };

    const toggleCurrency = () => {
        setCurrency(currency === 'THB' ? 'USD' : 'THB');
    };

    const formatPrice = (priceTHB: number, priceUSD?: number) => {
        if (currency === 'THB') {
            return `฿${priceTHB.toLocaleString()}`;
        } else {
            // Use explicit USD price if available, otherwise convert
            const usd = priceUSD || (priceTHB / exchangeRate);
            return `$${Math.ceil(usd).toLocaleString()}`;
        }
    };

    return (
        <CurrencyContext.Provider value={{ currency, toggleCurrency, setCurrency, formatPrice, exchangeRate }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
}
