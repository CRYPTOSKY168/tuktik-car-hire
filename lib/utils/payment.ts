
import generatePayload from 'promptpay-qr';

/**
 * Generates a PromptPay payload for a specific target and amount.
 * @param amount The amount to transfer (number)
 * @param target The recipient ID (Mobile, National ID, Tax ID, etc.)
 * @returns The TLV payload string for QR generation
 */
export const generatePromptPayPayload = (amount: number, target: string = '1919900092236') => {
    return generatePayload(target, { amount });
};
