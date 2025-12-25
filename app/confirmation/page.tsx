'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBooking } from '@/lib/contexts/BookingContext';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { locations } from '@/lib/data/locations';
import Button from '@/components/ui/Button';

export default function ConfirmationPage() {
  const router = useRouter();
  const { bookingData, calculateTotal, calculateDays, resetBooking } = useBooking();
  const { t, language } = useLanguage();
  const [bookingNumber, setBookingNumber] = useState('');

  useEffect(() => {
    if (!bookingData.vehicle || !bookingData.email) {
      router.push('/');
      return;
    }

    // Generate booking number
    const number = 'TK' + Date.now().toString().slice(-8);
    setBookingNumber(number);
  }, [bookingData, router]);

  const handlePrint = () => {
    window.print();
  };

  const handleBackToHome = () => {
    resetBooking();
    router.push('/');
  };

  if (!bookingData.vehicle) {
    return null;
  }

  const pickupLocation = locations.find((loc) => loc.id === bookingData.pickupLocation);
  const dropoffLocation = locations.find((loc) => loc.id === bookingData.dropoffLocation);
  const days = calculateDays();
  const total = calculateTotal();

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Success Message */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t.confirmation.title}
            </h1>
            <p className="text-xl text-gray-600">{t.confirmation.subtitle}</p>
          </div>

          {/* Booking Details Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            {/* Booking Number */}
            <div className="text-center pb-6 mb-6 border-b">
              <p className="text-sm text-gray-600 mb-2">{t.confirmation.bookingNumber}</p>
              <p className="text-3xl font-bold text-blue-600">{bookingNumber}</p>
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Customer Information</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600">
                    <span className="font-medium">Name:</span> {bookingData.firstName}{' '}
                    {bookingData.lastName}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Email:</span> {bookingData.email}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Phone:</span> {bookingData.phone}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4">
                  {t.booking.vehicleDetails}
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600">
                    <span className="font-medium">Vehicle:</span> {bookingData.vehicle.name}
                  </p>
                  <p className="text-gray-600 capitalize">
                    <span className="font-medium">Type:</span> {bookingData.vehicle.type}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Transmission:</span>{' '}
                    {bookingData.vehicle.transmission}
                  </p>
                </div>
              </div>
            </div>

            {/* Trip Details */}
            <div className="mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">{t.booking.tripDetails}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{t.booking.pickup}</p>
                    <p className="text-sm text-gray-600">{pickupLocation?.name[language]}</p>
                    <p className="text-sm text-gray-600">
                      {bookingData.pickupDate} at {bookingData.pickupTime}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-red-600"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{t.booking.dropoff}</p>
                    <p className="text-sm text-gray-600">{dropoffLocation?.name[language]}</p>
                    <p className="text-sm text-gray-600">
                      {bookingData.returnDate} at {bookingData.returnTime}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">{t.booking.priceBreakdown}</h3>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {t.booking.vehicleRental} ({days} {days === 1 ? t.booking.day : t.booking.days})
                  </span>
                  <span>฿{(bookingData.vehicle.price * days).toLocaleString()}</span>
                </div>
                {bookingData.addInsurance && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t.booking.insurance}</span>
                    <span>฿{(200 * days).toLocaleString()}</span>
                  </div>
                )}
                {bookingData.addDriver && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t.booking.additionalDriver}</span>
                    <span>฿{(500 * days).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">{t.booking.tax}</span>
                  <span>
                    ฿
                    {(
                      (bookingData.vehicle.price * days +
                        (bookingData.addInsurance ? 200 * days : 0) +
                        (bookingData.addDriver ? 500 * days : 0)) *
                      0.07
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-300">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">{t.booking.total}</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ฿{total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Confirmation Email Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex items-start space-x-3">
              <svg
                className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="font-medium text-blue-900 mb-1">
                  {t.confirmation.confirmation}{' '}
                  <span className="font-bold">{bookingData.email}</span>
                </p>
                <p className="text-sm text-blue-800">
                  Please check your email for booking details and important information.
                </p>
              </div>
            </div>
          </div>

          {/* What's Next Section */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {t.confirmation.whatNext}
            </h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium text-gray-900">{t.confirmation.step1}</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium text-gray-900">{t.confirmation.step2}</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium text-gray-900">{t.confirmation.step3}</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  4
                </div>
                <div>
                  <p className="font-medium text-gray-900">{t.confirmation.step4}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={handlePrint} variant="outline" className="flex-1">
              <svg
                className="w-5 h-5 mr-2 inline"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              {t.confirmation.printVoucher}
            </Button>
            <Button onClick={handleBackToHome} className="flex-1">
              {t.confirmation.backToHome}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
