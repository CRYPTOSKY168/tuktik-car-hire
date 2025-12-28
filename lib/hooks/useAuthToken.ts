import { useCallback } from 'react';
import { auth } from '@/lib/firebase/config';

/**
 * Hook to get Firebase ID token for API calls
 */
export function useAuthToken() {
    const getToken = useCallback(async (): Promise<string | null> => {
        try {
            const user = auth?.currentUser;
            if (!user) return null;
            return await user.getIdToken();
        } catch {
            return null;
        }
    }, []);

    const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
        const token = await getToken();
        if (!token) return { 'Content-Type': 'application/json' };
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }, [getToken]);

    return { getToken, getAuthHeaders };
}
