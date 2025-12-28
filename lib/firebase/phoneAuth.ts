import { auth } from './config';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  PhoneAuthProvider,
  linkWithCredential,
  updatePhoneNumber
} from 'firebase/auth';

// Store confirmation result globally for verification
let confirmationResult: ConfirmationResult | null = null;

// Initialize reCAPTCHA verifier
export const initRecaptcha = (buttonId: string): RecaptchaVerifier | null => {
  if (typeof window === 'undefined' || !auth) return null;

  try {
    // Clear any existing reCAPTCHA
    const existingRecaptcha = (window as any).recaptchaVerifier;
    if (existingRecaptcha) {
      existingRecaptcha.clear();
    }

    const recaptchaVerifier = new RecaptchaVerifier(auth, buttonId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved - will proceed with submit function
      },
      'expired-callback': () => {
        // Reset reCAPTCHA
      }
    });

    (window as any).recaptchaVerifier = recaptchaVerifier;
    return recaptchaVerifier;
  } catch (error) {
    console.error('Error initializing reCAPTCHA:', error);
    return null;
  }
};

// Send OTP to phone number
export const sendOTP = async (phoneNumber: string): Promise<{ success: boolean; error?: string }> => {
  if (!auth) {
    return { success: false, error: 'Firebase Auth not initialized' };
  }

  try {
    // Format phone number for Thailand (+66)
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+66' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+66' + formattedPhone;
    }

    // Get or create reCAPTCHA verifier
    let recaptchaVerifier = (window as any).recaptchaVerifier;
    if (!recaptchaVerifier) {
      recaptchaVerifier = initRecaptcha('send-otp-button');
    }

    if (!recaptchaVerifier) {
      return { success: false, error: 'Failed to initialize reCAPTCHA' };
    }

    // Send OTP
    confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);

    return { success: true };
  } catch (error: any) {
    console.error('Error sending OTP:', error);

    // Clear reCAPTCHA on error
    const recaptchaVerifier = (window as any).recaptchaVerifier;
    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
      (window as any).recaptchaVerifier = null;
    }

    // Handle specific errors
    if (error.code === 'auth/invalid-phone-number') {
      return { success: false, error: 'เบอร์โทรศัพท์ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' };
    } else if (error.code === 'auth/too-many-requests') {
      return { success: false, error: 'ส่ง OTP บ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่' };
    } else if (error.code === 'auth/quota-exceeded') {
      return { success: false, error: 'เกินโควต้าการส่ง SMS กรุณาติดต่อผู้ดูแลระบบ' };
    } else if (error.code === 'auth/captcha-check-failed') {
      return { success: false, error: 'การยืนยัน reCAPTCHA ล้มเหลว กรุณาลองใหม่' };
    }

    return { success: false, error: error.message || 'ไม่สามารถส่ง OTP ได้ กรุณาลองใหม่' };
  }
};

// Verify OTP code
export const verifyOTP = async (code: string): Promise<{ success: boolean; error?: string }> => {
  if (!confirmationResult) {
    return { success: false, error: 'กรุณาขอรหัส OTP ก่อน' };
  }

  try {
    const result = await confirmationResult.confirm(code);

    // Clear confirmation result after successful verification
    confirmationResult = null;

    return { success: true };
  } catch (error: any) {
    console.error('Error verifying OTP:', error);

    if (error.code === 'auth/invalid-verification-code') {
      return { success: false, error: 'รหัส OTP ไม่ถูกต้อง กรุณาลองใหม่' };
    } else if (error.code === 'auth/code-expired') {
      return { success: false, error: 'รหัส OTP หมดอายุ กรุณาขอรหัสใหม่' };
    }

    return { success: false, error: error.message || 'ยืนยัน OTP ไม่สำเร็จ กรุณาลองใหม่' };
  }
};

// Link phone number to existing user (optional - for linking phone to logged in user)
export const linkPhoneToUser = async (code: string): Promise<{ success: boolean; error?: string }> => {
  if (!auth?.currentUser || !confirmationResult) {
    return { success: false, error: 'ไม่พบข้อมูลผู้ใช้หรือรหัส OTP' };
  }

  try {
    const credential = PhoneAuthProvider.credential(
      (confirmationResult as any).verificationId,
      code
    );

    await linkWithCredential(auth.currentUser, credential);
    confirmationResult = null;

    return { success: true };
  } catch (error: any) {
    console.error('Error linking phone:', error);
    return { success: false, error: error.message || 'ไม่สามารถเชื่อมต่อเบอร์โทรได้' };
  }
};

// Reset/clear reCAPTCHA
export const resetRecaptcha = () => {
  const recaptchaVerifier = (window as any).recaptchaVerifier;
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    (window as any).recaptchaVerifier = null;
  }
  confirmationResult = null;
};
