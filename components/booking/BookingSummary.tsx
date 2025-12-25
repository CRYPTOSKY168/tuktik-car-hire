'use client';

import { useBooking } from '@/lib/contexts/BookingContext';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { locations } from '@/lib/data/locations';

export default function BookingSummary() {
  const { bookingData, calculateTotal } = useBooking();
  const { t, language } = useLanguage();

  if (!bookingData.vehicle) return null;

  // Base price per trip
  let vehicleCost = bookingData.vehicle.price;
  if (bookingData.tripType === 'roundTrip') {
    vehicleCost = vehicleCost * 1.8;
  }

  const insuranceCost = bookingData.addInsurance ? 500 : 0;
  const luggageCost = bookingData.addLuggage ? 300 : 0;
  const subtotal = vehicleCost + insuranceCost + luggageCost;
  const tax = subtotal * 0.07;
  const total = calculateTotal();

  const pickupLocation = locations.find((loc) => loc.id === bookingData.pickupLocation);
  const dropoffLocation = locations.find((loc) => loc.id === bookingData.dropoffLocation);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.booking.title}</h2>

      {/* Vehicle Details */}
      <div className="mb-6 pb-6 border-b">
        <h3 className="font-semibold text-gray-900 mb-3">{t.booking.vehicleDetails}</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-gray-900">{bookingData.vehicle.name}</p>
              <p className="text-sm text-gray-600 capitalize">{bookingData.vehicle.type}</p>
            </div>
            <p className="font-semibold text-blue-600">
              ฿{bookingData.vehicle.price.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Trip Details */}
      {bookingData.pickupLocation && (
        <div className="mb-6 pb-6 border-b">
          <h3 className="font-semibold text-gray-900 mb-3">{t.booking.tripDetails}</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-gray-600">{t.booking.pickup}</p>
              <p className="font-medium text-gray-900">
                {pickupLocation?.name[language]}
              </p>
              <p className="text-gray-600">
                {bookingData.pickupDate} {bookingData.pickupTime}
              </p>
            </div>
            <div>
              <p className="text-gray-600">{t.booking.dropoff}</p>
              <p className="font-medium text-gray-900">
                {dropoffLocation?.name[language]}
              </p>
            </div>
            <div className="pt-2 border-t">
              <p className="text-gray-600">
                {t.booking.tripType}: <span className="font-semibold text-gray-900">
                  {bookingData.tripType === 'oneWay' ? t.booking.oneWay : t.booking.roundTrip}
                </span>
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
              <p className="text-xs text-blue-800">
                <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                {t.booking.driverIncluded}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Price Breakdown */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">{t.booking.priceBreakdown}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">
              {t.booking.vehicleHire} ({bookingData.tripType === 'oneWay' ? t.booking.oneWay : t.booking.roundTrip})
            </span>
            <span className="font-medium">฿{vehicleCost.toLocaleString()}</span>
          </div>
          {bookingData.addInsurance && (
            <div className="flex justify-between">
              <span className="text-gray-600">{t.booking.insurance}</span>
              <span className="font-medium">฿{insuranceCost.toLocaleString()}</span>
            </div>
          )}
          {bookingData.addLuggage && (
            <div className="flex justify-between">
              <span className="text-gray-600">{t.booking.extraLuggage}</span>
              <span className="font-medium">฿{luggageCost.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">{t.booking.tax}</span>
            <span className="font-medium">฿{tax.toFixed(0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="pt-4 border-t">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">{t.booking.total}</span>
          <span className="text-2xl font-bold text-blue-600">
            ฿{total.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
