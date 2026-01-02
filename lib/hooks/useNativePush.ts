'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  PushNotificationSchema,
  ActionPerformed,
  Token,
} from '@capacitor/push-notifications';

interface NativePushState {
  isNative: boolean;
  isRegistered: boolean;
  fcmToken: string | null;
  error: string | null;
  lastNotification: PushNotificationSchema | null;
}

interface UseNativePushOptions {
  onNotificationReceived?: (notification: PushNotificationSchema) => void;
  onNotificationAction?: (action: ActionPerformed) => void;
  onTokenReceived?: (token: string) => void;
  autoRegister?: boolean;
}

/**
 * Hook สำหรับ Native Push Notifications (Capacitor)
 *
 * ใช้สำหรับ Android/iOS app ที่ build ด้วย Capacitor
 * - รับ notification ตอนปิดแอป (background/terminated)
 * - ใช้ Firebase Cloud Messaging (FCM) native
 *
 * @example
 * ```tsx
 * const { isNative, fcmToken, register } = useNativePush({
 *   onNotificationReceived: (notification) => {
 *     console.log('Received:', notification);
 *   },
 *   onTokenReceived: async (token) => {
 *     // ส่ง token ไปเก็บใน Firestore
 *     await saveFCMToken(userId, token);
 *   },
 * });
 * ```
 */
export function useNativePush(options: UseNativePushOptions = {}) {
  const {
    onNotificationReceived,
    onNotificationAction,
    onTokenReceived,
    autoRegister = true,
  } = options;

  const [state, setState] = useState<NativePushState>({
    isNative: false,
    isRegistered: false,
    fcmToken: null,
    error: null,
    lastNotification: null,
  });

  const listenersAddedRef = useRef(false);

  // ตรวจสอบว่ารันบน Native Platform หรือไม่
  const isNativePlatform = useCallback(() => {
    return Capacitor.isNativePlatform();
  }, []);

  // ขอ Permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isNativePlatform()) {
      console.log('[NativePush] Not running on native platform');
      return false;
    }

    try {
      const permission = await PushNotifications.requestPermissions();

      if (permission.receive === 'granted') {
        console.log('[NativePush] Permission granted');
        return true;
      } else {
        console.log('[NativePush] Permission denied');
        setState(prev => ({ ...prev, error: 'Permission denied' }));
        return false;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[NativePush] Permission error:', message);
      setState(prev => ({ ...prev, error: message }));
      return false;
    }
  }, [isNativePlatform]);

  // ลงทะเบียนรับ Push Notifications
  const register = useCallback(async (): Promise<string | null> => {
    if (!isNativePlatform()) {
      console.log('[NativePush] Skipping registration - not native');
      return null;
    }

    try {
      // ขอ permission ก่อน
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        return null;
      }

      // ลงทะเบียนกับ FCM
      await PushNotifications.register();
      console.log('[NativePush] Registered with FCM');

      // Token จะมาผ่าน listener (registration event)
      return null; // Token จะถูกส่งผ่าน onTokenReceived callback
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      console.error('[NativePush] Registration error:', message);
      setState(prev => ({ ...prev, error: message }));
      return null;
    }
  }, [isNativePlatform, requestPermission]);

  // ยกเลิกการลงทะเบียน
  const unregister = useCallback(async () => {
    if (!isNativePlatform()) return;

    try {
      await PushNotifications.removeAllListeners();
      setState(prev => ({
        ...prev,
        isRegistered: false,
        fcmToken: null,
      }));
      console.log('[NativePush] Unregistered');
    } catch (error) {
      console.error('[NativePush] Unregister error:', error);
    }
  }, [isNativePlatform]);

  // Setup listeners
  useEffect(() => {
    if (!isNativePlatform() || listenersAddedRef.current) {
      setState(prev => ({ ...prev, isNative: isNativePlatform() }));
      return;
    }

    setState(prev => ({ ...prev, isNative: true }));
    listenersAddedRef.current = true;

    // Event: ได้รับ FCM Token
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('[NativePush] FCM Token:', token.value);
      setState(prev => ({
        ...prev,
        isRegistered: true,
        fcmToken: token.value,
        error: null,
      }));
      onTokenReceived?.(token.value);
    });

    // Event: Registration error
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[NativePush] Registration error:', error);
      setState(prev => ({
        ...prev,
        isRegistered: false,
        error: error.error || 'Registration failed',
      }));
    });

    // Event: Notification received (foreground)
    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('[NativePush] Received:', notification);
        setState(prev => ({ ...prev, lastNotification: notification }));
        onNotificationReceived?.(notification);
      }
    );

    // Event: User tapped notification
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('[NativePush] Action:', action);
        onNotificationAction?.(action);
      }
    );

    // Auto register if enabled
    if (autoRegister) {
      register();
    }

    // Cleanup
    return () => {
      // Note: ไม่ลบ listeners ตอน unmount เพราะอาจทำให้พลาด notification
      // ให้ลบเมื่อ logout หรือไม่ต้องการ notification แล้วเท่านั้น
    };
  }, [isNativePlatform, autoRegister, register, onNotificationReceived, onNotificationAction, onTokenReceived]);

  return {
    // State
    isNative: state.isNative,
    isRegistered: state.isRegistered,
    fcmToken: state.fcmToken,
    error: state.error,
    lastNotification: state.lastNotification,

    // Actions
    register,
    unregister,
    requestPermission,
  };
}

export default useNativePush;
