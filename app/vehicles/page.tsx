'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBooking } from '@/lib/contexts/BookingContext';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { vehicles as initialVehicles } from '@/lib/data/vehicles';
import { Vehicle } from '@/lib/contexts/BookingContext';
import Link from 'next/link';
// We'll define a local list of vehicles that matches the assets we downloaded, 
// basically mocking the "database" content for this new design.
// In a real app we'd map the existing data to these images.

const getVehicles = (t: any) => [
  { id: 'mercedes-e', name: t.vehicles.vehiclesList.mercedesE.name, type: 'sedan', price: 150, passengers: 3, luggage: 2, transmission: 'Auto', image: '/images/mercedes-e.jpg', desc: t.vehicles.vehiclesList.mercedesE.desc, tag: t.vehicles.vehiclesList.mercedesE.tag },
  { id: 'alphard', name: t.vehicles.vehiclesList.alphard.name, type: 'van', price: 200, passengers: 6, luggage: 4, transmission: 'Auto', image: '/images/alphard.jpg', desc: t.vehicles.vehiclesList.alphard.desc, tag: t.vehicles.vehiclesList.alphard.tag },
  { id: 'bmw5', name: t.vehicles.vehiclesList.bmw5.name, type: 'sedan', price: 160, passengers: 3, luggage: 2, transmission: 'Hybrid', image: '/images/bmw5.jpg', desc: t.vehicles.vehiclesList.bmw5.desc, tag: t.vehicles.vehiclesList.bmw5.tag },
  { id: 'tesla-s', name: t.vehicles.vehiclesList.teslaS.name, type: 'sedan', price: 180, passengers: 4, luggage: 2, transmission: 'EV', image: '/images/tesla-s.jpg', desc: t.vehicles.vehiclesList.teslaS.desc, tag: t.vehicles.vehiclesList.teslaS.tag },
  { id: 'mercedes-v', name: t.vehicles.vehiclesList.mercedesV.name, type: 'van', price: 250, passengers: 7, luggage: 6, transmission: 'Auto', image: '/images/mercedes-v.jpg', desc: t.vehicles.vehiclesList.mercedesV.desc, tag: t.vehicles.vehiclesList.mercedesV.tag },
  { id: 'audi-a6', name: t.vehicles.vehiclesList.audiA6.name, type: 'sedan', price: 155, passengers: 3, luggage: 2, transmission: 'A/C', image: '/images/audi-a6.jpg', desc: t.vehicles.vehiclesList.audiA6.desc, tag: t.vehicles.vehiclesList.audiA6.tag },
  { id: 'lexus-es', name: t.vehicles.vehiclesList.lexusES.name, type: 'sedan', price: 140, passengers: 3, luggage: 2, transmission: 'Quiet', image: '/images/lexus-es.jpg', desc: t.vehicles.vehiclesList.lexusES.desc, tag: t.vehicles.vehiclesList.lexusES.tag },
  { id: 'escalade', name: t.vehicles.vehiclesList.escalade.name, type: 'suv', price: 300, passengers: 6, luggage: 5, transmission: 'Prem.', image: '/images/cadillac-escalade.jpg', desc: t.vehicles.vehiclesList.escalade.desc, tag: t.vehicles.vehiclesList.escalade.tag },
  { id: 'suburban', name: t.vehicles.vehiclesList.suburban.name, type: 'suv', price: 280, passengers: 7, luggage: 6, transmission: 'Power', image: '/images/chevy-suburban.jpg', desc: t.vehicles.vehiclesList.suburban.desc, tag: t.vehicles.vehiclesList.suburban.tag },
  { id: 'camry', name: t.home.fleet.camry.name, type: 'sedan', price: 90, passengers: 4, luggage: 2, transmission: 'Eco', image: '/images/camry.jpg', desc: t.home.fleet.camry.desc, tag: t.home.fleet.economy },
  { id: 'odyssey', name: t.vehicles.vehiclesList.odyssey.name, type: 'van', price: 130, passengers: 7, luggage: 4, transmission: 'Safe', image: '/images/honda-odyssey.jpg', desc: t.vehicles.vehiclesList.odyssey.desc, tag: t.vehicles.vehiclesList.odyssey.tag },
  { id: 'transit', name: t.vehicles.vehiclesList.transit.name, type: 'van', price: 220, passengers: 12, luggage: 10, transmission: 'XL', image: '/images/ford-transit.jpg', desc: t.vehicles.vehiclesList.transit.desc, tag: t.vehicles.vehiclesList.transit.tag },
];

export default function VehiclesPage() {
  const router = useRouter();
  const { updateBooking } = useBooking();
  const { t } = useLanguage();

  const displayVehicles = getVehicles(t);

  const handleVehicleSelect = (vehicle: any) => {
    // Map to the shape expected by context if needed, or update context type
    updateBooking({
      vehicle: {
        id: vehicle.id,
        name: vehicle.name,
        type: vehicle.type,
        price: vehicle.price,
        image: vehicle.image,
        passengers: vehicle.passengers,
        luggage: vehicle.luggage,
        transmission: vehicle.transmission
      } as Vehicle
    });
    router.push('/payment'); // Proceed to payment
  };

  return (
    <main className="flex-1 flex flex-col items-center min-h-screen bg-white dark:bg-[#111418]">
      <div className="w-full max-w-[1440px] px-6 lg:px-20 py-8">
        {/* PageHeading */}
        <div className="mb-8 flex flex-col gap-2 md:mb-10">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white md:text-5xl">{t.vehicles.title}</h1>
          <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-400">{t.vehicles.subtitle}</p>
        </div>

        {/* Sticky Filters Bar */}
        <div className="sticky top-[72px] z-40 -mx-6 mb-8 bg-background-light/95 px-6 py-4 backdrop-blur dark:bg-background-dark/95 lg:-mx-20 lg:px-20 border-b border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 mr-2 text-slate-500 dark:text-slate-400">
              <span className="material-symbols-outlined">tune</span>
              <span className="text-sm font-medium">{t.vehicles.filters}</span>
            </div>
            <button className="group flex h-9 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white pl-4 pr-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-brand-primary hover:text-brand-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand-primary">
              <span>{t.home.booking.vehicleType}</span>
              <span className="material-symbols-outlined text-[20px] text-slate-400 group-hover:text-brand-primary">keyboard_arrow_down</span>
            </button>
            <button className="group flex h-9 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white pl-4 pr-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-brand-primary hover:text-brand-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand-primary">
              <span>{t.vehicles.priceRange}</span>
              <span className="material-symbols-outlined text-[20px] text-slate-400 group-hover:text-brand-primary">keyboard_arrow_down</span>
            </button>
            <button className="group flex h-9 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white pl-4 pr-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-brand-primary hover:text-brand-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand-primary">
              <span>{t.vehicles.passengers}</span>
              <span className="material-symbols-outlined text-[20px] text-slate-400 group-hover:text-brand-primary">keyboard_arrow_down</span>
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-slate-500">Sort by:</span>
              <button className="text-sm font-semibold text-slate-900 dark:text-white hover:text-brand-primary flex items-center gap-1">
                Recommended <span className="material-symbols-outlined text-[18px]">sort</span>
              </button>
            </div>
          </div>
        </div>

        {/* Vehicle Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayVehicles.map((vehicle) => (
            <div key={vehicle.id} className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url('${vehicle.image}')` }}></div>
                {vehicle.tag && (
                  <div className="absolute top-3 right-3 rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-slate-900 shadow-sm backdrop-blur">
                    {vehicle.tag}
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="mb-2">
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">{vehicle.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{vehicle.desc}</p>
                </div>
                <div className="mb-4 flex items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1.5" title="Passengers">
                    <span className="material-symbols-outlined text-[18px] text-brand-primary">group</span>
                    <span>{vehicle.passengers}</span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Luggage">
                    <span className="material-symbols-outlined text-[18px] text-brand-primary">luggage</span>
                    <span>{vehicle.luggage}</span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Transmission">
                    <span className="material-symbols-outlined text-[18px] text-brand-primary">settings</span>
                    <span>{vehicle.transmission}</span>
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-700">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400">Daily Rate</span>
                    <span className="text-xl font-bold text-brand-primary">${vehicle.price}</span>
                  </div>
                  <button
                    onClick={() => handleVehicleSelect(vehicle)}
                    className="rounded-lg bg-brand-primary/10 px-4 py-2 text-sm font-bold text-brand-primary transition-colors hover:bg-brand-primary hover:text-white">
                    {t.vehicles.selectVehicle}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
