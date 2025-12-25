'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBooking } from '@/lib/contexts/BookingContext';
import { useLanguage } from '@/lib/contexts/LanguageContext';

export default function ConfirmationPage() {
  const router = useRouter();
  const { bookingData, resetBooking } = useBooking();
  const { t } = useLanguage();
  const [bookingNumber, setBookingNumber] = useState('');

  useEffect(() => {
    // Generate booking number only once on client
    const number = '#TRIP-' + Math.floor(Math.random() * 100000);
    setBookingNumber(number);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleBackToHome = () => {
    resetBooking();
    router.push('/');
  };

  if (!bookingData.vehicle) {
    // router.push('/');
    // return null;
  }

  // Calculate pricing
  const baseFare = bookingData.vehicle?.price || 3000;
  const vat = Math.round(baseFare * 0.07);
  const total = baseFare + vat;

  return (
    <main className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-10 py-8 md:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left Column: Success Message & Next Steps */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          {/* Success Hero */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-4xl">check_circle</span>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-[#111418] dark:text-white tracking-tight">{t.confirmation.title}</h1>
                <p className="text-[#617589] dark:text-gray-400 mt-1 text-lg">{t.confirmation.subtitle}. {t.confirmation.emailSentTo} {bookingData.email || 'alex@example.com'}.</p>
              </div>
            </div>
          </div>

          {/* Booking Reference Card */}
          <div className="bg-white dark:bg-[#111a22] rounded-xl p-6 border border-[#dbe0e6] dark:border-gray-700 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-[#617589] dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">{t.confirmation.bookingReference}</p>
              <p className="text-brand-primary text-3xl font-bold tracking-tight select-all">{bookingNumber}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { navigator.clipboard.writeText(bookingNumber) }}
                className="text-brand-primary hover:bg-brand-primary/10 dark:hover:bg-brand-primary/20 px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">content_copy</span> {t.common.copy}
              </button>
            </div>
          </div>

          {/* Timeline: Next Steps */}
          <div className="bg-white dark:bg-[#111a22] rounded-xl p-6 border border-[#dbe0e6] dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-bold text-[#111418] dark:text-white mb-6">{t.confirmation.whatNext}</h3>
            <div className="grid grid-cols-[40px_1fr] gap-x-2">
              {/* Step 1 */}
              <div className="flex flex-col items-center gap-1">
                <div className="size-8 rounded-full bg-brand-primary/10 dark:bg-brand-primary/20 flex items-center justify-center text-brand-primary">
                  <span className="material-symbols-outlined text-xl">assignment_ind</span>
                </div>
                <div className="w-[2px] bg-[#dbe0e6] dark:bg-gray-700 h-full min-h-[40px] grow"></div>
              </div>
              <div className="pb-8 pt-1">
                <p className="text-[#111418] dark:text-white font-bold">{t.confirmation.step1Title}</p>
                <p className="text-[#617589] dark:text-gray-400 text-sm">{t.confirmation.step1Desc}</p>
              </div>
              {/* Step 2 */}
              <div className="flex flex-col items-center gap-1">
                <div className="size-8 rounded-full bg-[#f0f2f4] dark:bg-gray-700 flex items-center justify-center text-[#617589] dark:text-gray-400">
                  <span className="material-symbols-outlined text-xl">perm_phone_msg</span>
                </div>
                <div className="w-[2px] bg-[#dbe0e6] dark:bg-gray-700 h-full min-h-[40px] grow"></div>
              </div>
              <div className="pb-8 pt-1">
                <p className="text-[#111418] dark:text-white font-medium opacity-60">{t.confirmation.step2Title}</p>
                <p className="text-[#617589] dark:text-gray-400 text-sm">{t.confirmation.step2Desc}</p>
              </div>
              {/* Step 3 */}
              <div className="flex flex-col items-center gap-1">
                <div className="size-8 rounded-full bg-[#f0f2f4] dark:bg-gray-700 flex items-center justify-center text-[#617589] dark:text-gray-400">
                  <span className="material-symbols-outlined text-xl">directions_car</span>
                </div>
              </div>
              <div className="pt-1">
                <p className="text-[#111418] dark:text-white font-medium opacity-60">{t.confirmation.step3Title}</p>
                <p className="text-[#617589] dark:text-gray-400 text-sm">{t.confirmation.step3Desc}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 pt-4">
            <button
              onClick={handleBackToHome}
              className="flex-1 sm:flex-none min-w-[160px] cursor-pointer items-center justify-center rounded-lg h-12 px-6 bg-brand-primary hover:bg-blue-600 text-white font-bold transition-colors shadow-lg shadow-blue-500/20">
              {t.confirmation.goToDashboard}
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none min-w-[160px] cursor-pointer items-center justify-center rounded-lg h-12 px-6 bg-white dark:bg-gray-800 border border-[#dbe0e6] dark:border-gray-600 text-[#111418] dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 font-bold transition-colors">
              <span className="material-symbols-outlined mr-2 text-xl">download</span>
              {t.confirmation.downloadInvoice}
            </button>
          </div>
        </div>

        {/* Right Column: Trip Summary / Receipt */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-[#111a22] rounded-xl shadow-lg border border-[#dbe0e6] dark:border-gray-700 overflow-hidden sticky top-24">
            <div className="p-6 border-b border-[#f0f2f4] dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <h3 className="text-lg font-bold text-[#111418] dark:text-white">{t.confirmation.tripSummary}</h3>
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-bold rounded uppercase">{t.confirmation.paid}</span>
            </div>

            {/* Car Details */}
            {bookingData.vehicle && (
              <div className="p-6 border-b border-[#f0f2f4] dark:border-gray-800">
                <div className="flex gap-4 items-center mb-4">
                  <div className="w-24 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0 relative">
                    <img src={bookingData.vehicle.image} alt={bookingData.vehicle.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-bold text-[#111418] dark:text-white text-lg">{bookingData.vehicle.name}</p>
                    <p className="text-sm text-[#617589] dark:text-gray-400">{bookingData.vehicle.type} {t.confirmation.orSimilar}</p>
                  </div>
                </div>
                <div className="flex gap-3 text-xs font-medium text-[#617589] dark:text-gray-400">
                  <div className="flex items-center gap-1 bg-[#f6f7f8] dark:bg-gray-800 px-2 py-1 rounded">
                    <span className="material-symbols-outlined text-sm">person</span> {bookingData.vehicle.passengers} {t.vehicles.passengers}
                  </div>
                  <div className="flex items-center gap-1 bg-[#f6f7f8] dark:bg-gray-800 px-2 py-1 rounded">
                    <span className="material-symbols-outlined text-sm">luggage</span> {bookingData.vehicle.luggage} {t.vehicles.luggage}
                  </div>
                </div>
              </div>
            )}

            {/* Route Details */}
            <div className="p-6 border-b border-[#f0f2f4] dark:border-gray-800 bg-white dark:bg-[#111a22]">
              <div className="relative pl-6 space-y-8">
                {/* Line Connector */}
                <div className="absolute left-[7px] top-2 bottom-8 w-[2px] bg-gradient-to-b from-brand-primary to-brand-primary/30"></div>
                {/* Pickup */}
                <div className="relative">
                  <div className="absolute -left-[25px] top-1 size-4 rounded-full border-4 border-white dark:border-[#111a22] bg-brand-primary shadow-sm"></div>
                  <p className="text-xs font-bold text-[#617589] dark:text-gray-400 mb-1">{t.booking.pickup} • {t.demo.date}</p>
                  <p className="text-[#111418] dark:text-white font-bold leading-tight">{t.demo.pickupLocation}</p>
                  <p className="text-sm text-[#617589] dark:text-gray-400 truncate">{t.demo.pickupDetail}</p>
                </div>
                {/* Dropoff */}
                <div className="relative">
                  <div className="absolute -left-[25px] top-1 size-4 rounded-full border-4 border-white dark:border-[#111a22] bg-brand-primary/40"></div>
                  <p className="text-xs font-bold text-[#617589] dark:text-gray-400 mb-1">{t.booking.dropoff} • {t.demo.date}</p>
                  <p className="text-[#111418] dark:text-white font-bold leading-tight">{t.demo.dropoffLocation}</p>
                  <p className="text-sm text-[#617589] dark:text-gray-400 truncate">{t.demo.dropoffDetail}</p>
                </div>
              </div>
              <div className="mt-6">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-brand-primary/30 bg-brand-primary/5 text-brand-primary text-xs font-bold">
                  <span className="material-symbols-outlined text-sm">sync_alt</span> {t.booking.oneWay}
                </span>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="p-6 bg-gray-50 dark:bg-gray-800/30">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[#617589] dark:text-gray-400 text-sm">{t.booking.vehicleHire}</span>
                <span className="text-[#111418] dark:text-white font-medium">฿{baseFare.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[#617589] dark:text-gray-400 text-sm">{t.booking.tax}</span>
                <span className="text-[#111418] dark:text-white font-medium">฿{vat.toLocaleString()}</span>
              </div>
              <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-4"></div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-[#617589] dark:text-gray-400 font-bold uppercase mb-1">{t.booking.total}</p>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#617589] dark:text-gray-400">credit_card</span>
                    <span className="text-sm text-[#111418] dark:text-white">Visa **** 4242</span>
                  </div>
                </div>
                <p className="text-2xl font-black text-brand-primary">฿{total.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Helper Links */}
          <div className="mt-6 flex justify-center gap-6 text-sm text-[#617589] dark:text-gray-500">
            <a className="hover:text-brand-primary transition-colors" href="#">{t.confirmation.needHelp}</a>
            <a className="hover:text-brand-primary transition-colors" href="#">{t.confirmation.termsOfService}</a>
          </div>
        </div>
      </div>
    </main>
  );
}
