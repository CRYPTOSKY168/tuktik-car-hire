'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBooking } from '@/lib/contexts/BookingContext';
import { useLanguage } from '@/lib/contexts/LanguageContext';

export default function PaymentPage() {
  const router = useRouter();
  const { bookingData, updateBooking } = useBooking();
  const { t } = useLanguage();

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'promptpay'>('card');
  const [formData, setFormData] = useState({
    firstName: bookingData.firstName || '',
    lastName: bookingData.lastName || '',
    email: bookingData.email || '',
    phone: bookingData.phone || '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: '',
    saveCard: true
  });

  const [processing, setProcessing] = useState(false);

  // Redirect if no vehicle selected
  if (!bookingData.vehicle) {
    // In a real app we might redirect, but for dev flow let's stay or mock
    // router.push('/vehicles');
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async () => {
    setProcessing(true);

    // Simulate API call
    setTimeout(() => {
      updateBooking({
        paymentMethod: paymentMethod,
        // In a real app we'd save the form data too
      });
      setProcessing(false);
      router.push('/confirmation');
    }, 2000);
  };

  return (
    <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-10 py-8 md:py-12 min-h-screen">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight text-[#111418] dark:text-white">{t.payment.secureCheckout}</h1>
        <p className="text-[#617589] dark:text-gray-400 text-base">{t.payment.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Payment Methods */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Payment Method Selector (Tabs) */}
          <div className="bg-white dark:bg-[#111a22] rounded-xl border border-[#dbe0e6] dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="flex border-b border-[#dbe0e6] dark:border-gray-800">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 px-4 border-b-[3px] transition-colors group ${paymentMethod === 'card' ? 'bg-white dark:bg-[#111a22] border-brand-primary text-brand-primary' : 'bg-[#f9fafb] dark:bg-[#16212b] border-transparent text-[#617589] dark:text-gray-400 hover:text-[#111418] dark:hover:text-gray-200'}`}
              >
                <span className="material-symbols-outlined filled" style={{ fontVariationSettings: "'FILL' 1" }}>credit_card</span>
                <span className="text-sm font-bold">{t.payment.creditCard}</span>
              </button>
              <button
                onClick={() => setPaymentMethod('promptpay')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 px-4 border-b-[3px] transition-colors group ${paymentMethod === 'promptpay' ? 'bg-white dark:bg-[#111a22] border-brand-primary text-brand-primary' : 'bg-[#f9fafb] dark:bg-[#16212b] border-transparent text-[#617589] dark:text-gray-400 hover:text-[#111418] dark:hover:text-gray-200'}`}
              >
                <span className="material-symbols-outlined">qr_code_scanner</span>
                <span className="text-sm font-bold">{t.payment.promptpay}</span>
              </button>
            </div>

            {/* Credit Card Form */}
            {paymentMethod === 'card' && (
              <div className="p-6 md:p-8 flex flex-col gap-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-[#111418] dark:text-white">{t.payment.creditCard}</h3>
                  <div className="flex gap-2 opacity-70">
                    <div className="h-6 w-10 bg-[#1a1f71] rounded flex items-center justify-center text-[8px] text-white font-bold italic tracking-wider">VISA</div>
                    <div className="h-6 w-10 bg-[#eb001b] rounded flex items-center justify-center text-[8px] text-white font-bold italic tracking-wider">MC</div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Card Number */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-[#111418] dark:text-gray-200">{t.payment.cardNumber}</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <span className="material-symbols-outlined text-[20px]">credit_card</span>
                      </div>
                      <input
                        type="text"
                        name="cardNumber"
                        value={formData.cardNumber}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#16212b] pl-10 pr-4 py-3 text-sm placeholder:text-gray-400 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all dark:text-white"
                        placeholder={t.payment.placeholders.cardNumber}
                      />
                    </div>
                  </div>

                  {/* Expiry & CVC */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-[#111418] dark:text-gray-200">{t.payment.expiryDate}</label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                        </div>
                        <input
                          type="text"
                          name="expiryDate"
                          value={formData.expiryDate}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#16212b] pl-10 pr-4 py-3 text-sm placeholder:text-gray-400 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all dark:text-white"
                          placeholder={t.payment.placeholders.expiryDate}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-[#111418] dark:text-gray-200 flex items-center gap-1">
                        {t.payment.cvv}
                        <span className="material-symbols-outlined text-gray-400 text-[16px] cursor-help" title="3 digits on back of card">help</span>
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          <span className="material-symbols-outlined text-[20px]">lock</span>
                        </div>
                        <input
                          type="text"
                          name="cvv"
                          value={formData.cvv}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#16212b] pl-10 pr-4 py-3 text-sm placeholder:text-gray-400 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all dark:text-white"
                          placeholder={t.payment.placeholders.cvv}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cardholder Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-[#111418] dark:text-gray-200">{t.payment.cardHolder}</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <span className="material-symbols-outlined text-[20px]">person</span>
                      </div>
                      <input
                        type="text"
                        name="cardName"
                        value={formData.cardName}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#16212b] pl-10 pr-4 py-3 text-sm placeholder:text-gray-400 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all dark:text-white"
                        placeholder={t.payment.placeholders.cardHolder}
                      />
                    </div>
                  </div>

                  {/* Save Card Checkbox */}
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="checkbox"
                      id="save-card"
                      name="saveCard"
                      checked={formData.saveCard}
                      onChange={handleChange}
                      className="h-5 w-5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                    />
                    <label className="text-sm font-medium text-[#111418] dark:text-gray-300" htmlFor="save-card">{t.payment.saveCard}</label>
                  </div>
                </div>
              </div>
            )}

            {/* PromptPay Content (Placeholder) */}
            {paymentMethod === 'promptpay' && (
              <div className="p-6 md:p-8 flex flex-col items-center justify-center gap-6 min-h-[300px]">
                <img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg" alt="Mock QR" className="w-48 h-48 opacity-20" />
                <p className="text-gray-500">{t.payment.promptpayIntegration}</p>
              </div>
            )}

            <hr className="border-[#f0f2f4] dark:border-gray-800 my-2" />

            {/* Action Button */}
            <div className="p-6 md:p-8 pt-0 flex flex-col gap-4">
              <button
                onClick={handleSubmit}
                disabled={processing}
                className="w-full bg-brand-primary hover:bg-blue-700 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {processing ? (
                  <span>{t.payment.processing}</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined group-hover:scale-110 transition-transform">lock_person</span>
                    {t.payment.confirmPayment}
                  </>
                )}
              </button>
              <div className="flex items-center justify-center gap-2 text-[#617589] dark:text-gray-500 text-xs text-center">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                {t.payment.encryptedMessage}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="lg:col-span-1 sticky top-24">
          <div className="flex flex-col bg-white dark:bg-[#111a22] rounded-xl border border-[#dbe0e6] dark:border-gray-800 shadow-sm overflow-hidden">
            {/* Map Preview Header */}
            <div className="h-32 w-full bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/map-preview.jpg')" }}></div>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 to-indigo-100/20 dark:from-gray-800/20 dark:to-gray-900/20"></div>
              <div className="absolute bottom-3 left-4 bg-white/90 dark:bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold shadow-sm">
                {t.payment.mapPreview}
              </div>
            </div>

            <div className="p-6 flex flex-col gap-6">
              <h2 className="text-xl font-bold text-[#111418] dark:text-white">{t.booking.title}</h2>

              {/* Route */}
              <div className="flex gap-4">
                <div className="mt-1 flex flex-col items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-brand-primary"></div>
                  <div className="w-0.5 h-8 bg-gray-200 dark:bg-gray-700"></div>
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                </div>
                <div className="flex flex-col gap-4 flex-1">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t.booking.pickup}</p>
                    <p className="text-sm font-bold text-[#111418] dark:text-white">{t.demo.pickupLocation}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.demo.date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t.booking.dropoff}</p>
                    <p className="text-sm font-bold text-[#111418] dark:text-white">{t.demo.dropoffLocation}</p>
                  </div>
                </div>
              </div>

              {/* Vehicle Info */}
              {bookingData.vehicle && (
                <div className="flex gap-3 items-start p-3 rounded-lg bg-background-light dark:bg-[#16212b] border border-[#dbe0e6] dark:border-gray-800">
                  <div className="bg-white dark:bg-gray-800 p-2 rounded text-[#111418] dark:text-white shadow-sm">
                    <span className="material-symbols-outlined">directions_car</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#111418] dark:text-white">{bookingData.vehicle.name}</span>
                    <span className="text-xs text-[#617589] dark:text-gray-400">{t.vehicles.driverIncluded}</span>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded w-fit font-bold">
                      <span className="material-symbols-outlined text-[10px]">check</span> Free Cancellation
                    </div>
                  </div>
                </div>
              )}

              <div className="h-px bg-[#f0f2f4] dark:bg-gray-700 w-full"></div>

              {/* Price Breakdown */}
              <div className="flex flex-col gap-2 text-sm text-[#617589] dark:text-gray-400">
                <div className="flex justify-between">
                  <span>{t.booking.vehicleHire}</span>
                  <span className="text-[#111418] dark:text-gray-200">฿{bookingData.vehicle?.price || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t.payment.driverFeeIncluded}</span>
                  <span className="text-[#111418] dark:text-gray-200 text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{t.payment.included}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t.booking.tax}</span>
                  <span className="text-[#111418] dark:text-gray-200">฿{Math.round((bookingData.vehicle?.price || 0) * 0.07)}</span>
                </div>
              </div>

              <div className="h-px bg-[#f0f2f4] dark:bg-gray-700 w-full"></div>

              {/* Total */}
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#617589] dark:text-gray-400">{t.booking.total}</span>
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">{t.payment.noHiddenFees}</span>
                </div>
                <span className="text-2xl font-black text-[#111418] dark:text-white tracking-tight">
                  ฿{Math.round((bookingData.vehicle?.price || 0) * 1.07)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
