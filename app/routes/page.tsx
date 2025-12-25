'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBooking } from '@/lib/contexts/BookingContext';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { locations, popularRoutes } from '@/lib/data/locations';
import Button from '@/components/ui/Button';
import BookingSummary from '@/components/booking/BookingSummary';

export default function RoutesPage() {
  const router = useRouter();
  const { bookingData, updateBooking } = useBooking();
  const { t, language } = useLanguage();

  const [pickupLocation, setPickupLocation] = useState(bookingData.pickupLocation || '');
  const [dropoffLocation, setDropoffLocation] = useState(bookingData.dropoffLocation || '');
  const [pickupDate, setPickupDate] = useState(bookingData.pickupDate || '');
  const [pickupTime, setPickupTime] = useState(bookingData.pickupTime || '10:00');
  const [tripType, setTripType] = useState(bookingData.tripType || 'oneWay');

  const handleContinue = () => {
    if (!pickupLocation || !dropoffLocation || !pickupDate) {
      alert('Please fill in all required fields');
      return;
    }

    updateBooking({
      pickupLocation,
      dropoffLocation,
      pickupDate,
      pickupTime,
      tripType,
    });

    router.push('/payment');
  };

  const handlePopularRouteClick = (from: string, to: string) => {
    setPickupLocation(from);
    setDropoffLocation(to);
  };

  const today = new Date().toISOString().split('T')[0];

  if (!bookingData.vehicle) {
    router.push('/vehicles');
    return null;
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {t.routes.title}
          </h1>
          <p className="text-xl text-gray-600">{t.routes.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Route Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="space-y-6">
                {/* Pickup Location */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t.routes.pickupLocation} *
                  </label>
                  <select
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t.home.booking.selectLocation}</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name[language]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Drop-off Location */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t.routes.dropoffLocation} *
                  </label>
                  <select
                    value={dropoffLocation}
                    onChange={(e) => setDropoffLocation(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t.home.booking.selectLocation}</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name[language]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pickup Date */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t.home.booking.pickupDate} *
                    </label>
                    <input
                      type="date"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      min={today}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Pickup Time */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t.home.booking.pickupTime} *
                    </label>
                    <input
                      type="time"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Trip Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    {t.routes.tripType} *
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center justify-center px-6 py-4 border-2 border-gray-300 rounded-lg cursor-pointer transition-all hover:border-blue-500 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50">
                      <input
                        type="radio"
                        name="tripType"
                        value="oneWay"
                        checked={tripType === 'oneWay'}
                        onChange={(e) => setTripType(e.target.value as 'oneWay' | 'roundTrip')}
                        className="mr-3"
                      />
                      <div className="text-center">
                        <div className="font-semibold text-gray-900">{t.routes.oneWay}</div>
                        <div className="text-sm text-gray-600">A → B</div>
                      </div>
                    </label>
                    <label className="flex items-center justify-center px-6 py-4 border-2 border-gray-300 rounded-lg cursor-pointer transition-all hover:border-blue-500 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50">
                      <input
                        type="radio"
                        name="tripType"
                        value="roundTrip"
                        checked={tripType === 'roundTrip'}
                        onChange={(e) => setTripType(e.target.value as 'oneWay' | 'roundTrip')}
                        className="mr-3"
                      />
                      <div className="text-center">
                        <div className="font-semibold text-gray-900">{t.routes.roundTrip}</div>
                        <div className="text-sm text-gray-600">A → B → A</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Popular Routes */}
                <div className="pt-6 border-t">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {t.routes.popularRoutes}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {popularRoutes.map((route, index) => {
                      const fromLoc = locations.find((l) => l.id === route.from);
                      const toLoc = locations.find((l) => l.id === route.to);
                      return (
                        <button
                          key={index}
                          onClick={() => handlePopularRouteClick(route.from, route.to)}
                          className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
                        >
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium text-gray-900">
                              {fromLoc?.name[language]}
                            </span>
                            <svg
                              className="w-4 h-4 text-gray-400"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                            <span className="font-medium text-gray-900">
                              {toLoc?.name[language]}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{route.distance}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <Button
                    variant="outline"
                    onClick={() => router.back()}
                    className="flex-1"
                  >
                    {t.routes.back}
                  </Button>
                  <Button onClick={handleContinue} className="flex-1">
                    {t.routes.continue}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <BookingSummary />
          </div>
        </div>
      </div>
    </div>
  );
}
