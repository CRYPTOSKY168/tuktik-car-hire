'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBooking } from '@/lib/contexts/BookingContext';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { locations } from '@/lib/data/locations';
import Button from '../ui/Button';

export default function BookingForm() {
  const router = useRouter();
  const { bookingData, updateBooking } = useBooking();
  const { t, language } = useLanguage();

  const [formData, setFormData] = useState({
    pickupLocation: bookingData.pickupLocation || '',
    dropoffLocation: bookingData.dropoffLocation || '',
    pickupDate: bookingData.pickupDate || '',
    pickupTime: bookingData.pickupTime || '10:00',
    tripType: bookingData.tripType || 'oneWay',
    vehicleType: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBooking({
      pickupLocation: formData.pickupLocation,
      dropoffLocation: formData.dropoffLocation,
      pickupDate: formData.pickupDate,
      pickupTime: formData.pickupTime,
      tripType: formData.tripType,
    });
    router.push('/vehicles');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur-sm rounded-xl p-6 md:p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.home.booking.title}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pickup Location */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t.home.booking.pickupLocation}
          </label>
          <select
            name="pickupLocation"
            value={formData.pickupLocation}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all bg-gray-50 hover:bg-white"
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
            {t.home.booking.dropoffLocation}
          </label>
          <select
            name="dropoffLocation"
            value={formData.dropoffLocation}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all bg-gray-50 hover:bg-white"
          >
            <option value="">{t.home.booking.selectLocation}</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name[language]}
              </option>
            ))}
          </select>
        </div>

        {/* Pickup Date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t.home.booking.pickupDate}
          </label>
          <input
            type="date"
            name="pickupDate"
            value={formData.pickupDate}
            onChange={handleChange}
            min={today}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all bg-gray-50 hover:bg-white"
          />
        </div>

        {/* Pickup Time */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t.home.booking.pickupTime}
          </label>
          <input
            type="time"
            name="pickupTime"
            value={formData.pickupTime}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all bg-gray-50 hover:bg-white"
          />
        </div>

        {/* Trip Type */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t.home.booking.tripType}
          </label>
          <div className="flex gap-4">
            <label className="flex-1 flex items-center justify-center px-6 py-3 border-2 border-gray-200 rounded-lg cursor-pointer transition-all hover:border-brand-primary has-[:checked]:border-brand-primary has-[:checked]:bg-brand-primary/5">
              <input
                type="radio"
                name="tripType"
                value="oneWay"
                checked={formData.tripType === 'oneWay'}
                onChange={handleChange}
                className="mr-3"
              />
              <div className="text-center">
                <div className="font-semibold text-gray-900">{t.home.booking.oneWay}</div>
                <div className="text-sm text-gray-600">A → B</div>
              </div>
            </label>
            <label className="flex-1 flex items-center justify-center px-6 py-3 border-2 border-gray-200 rounded-lg cursor-pointer transition-all hover:border-brand-primary has-[:checked]:border-brand-primary has-[:checked]:bg-brand-primary/5">
              <input
                type="radio"
                name="tripType"
                value="roundTrip"
                checked={formData.tripType === 'roundTrip'}
                onChange={handleChange}
                className="mr-3"
              />
              <div className="text-center">
                <div className="font-semibold text-gray-900">{t.home.booking.roundTrip}</div>
                <div className="text-sm text-gray-600">A → B → A</div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="mt-8">
        <Button type="submit" className="w-full" size="lg">
          {t.home.booking.searchVehicles}
        </Button>
      </div>
    </form>
  );
}
