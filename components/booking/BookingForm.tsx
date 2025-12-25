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
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
      {/* Pick-up */}
      <div className="md:col-span-3 flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t.home.booking.pickupLocation}</label>
        <div className="flex items-center bg-background-light dark:bg-gray-800 rounded-lg px-3 py-3 border border-gray-200 dark:border-gray-700 focus-within:border-brand-primary transition-colors">
          <span className="material-symbols-outlined text-gray-400 mr-2">location_on</span>
          <select
            name="pickupLocation"
            value={formData.pickupLocation}
            onChange={handleChange}
            required
            className="bg-transparent border-none p-0 text-sm w-full focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400"
          >
            <option value="">{t.home.booking.selectLocation}</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name[language]}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* Drop-off */}
      <div className="md:col-span-3 flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t.home.booking.dropoffLocation}</label>
        <div className="flex items-center bg-background-light dark:bg-gray-800 rounded-lg px-3 py-3 border border-gray-200 dark:border-gray-700 focus-within:border-brand-primary transition-colors">
          <span className="material-symbols-outlined text-gray-400 mr-2">flag</span>
          <select
            name="dropoffLocation"
            value={formData.dropoffLocation}
            onChange={handleChange}
            required
            className="bg-transparent border-none p-0 text-sm w-full focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400"
          >
            <option value="">{t.home.booking.selectLocation}</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name[language]}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* Date */}
      <div className="md:col-span-3 flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t.home.booking.pickupDate}</label>
        <div className="flex items-center bg-background-light dark:bg-gray-800 rounded-lg px-3 py-3 border border-gray-200 dark:border-gray-700 focus-within:border-brand-primary transition-colors">
          <span className="material-symbols-outlined text-gray-400 mr-2">calendar_month</span>
          <input
            type="date"
            name="pickupDate"
            value={formData.pickupDate}
            onChange={handleChange}
            min={today}
            required
            className="bg-transparent border-none p-0 text-sm w-full focus:ring-0 text-gray-900 dark:text-white"
          />
        </div>
      </div>
      {/* Search Button */}
      <div className="md:col-span-3">
        <button type="submit" className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-blue-600 text-white rounded-lg py-3 px-6 font-bold text-sm transition-all shadow-lg shadow-blue-500/30 h-[46px]">
          <span className="material-symbols-outlined text-[20px]">search</span>
          {t.home.booking.searchVehicles}
        </button>
      </div>
    </form>
  );
}
