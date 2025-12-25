'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBooking } from '@/lib/contexts/BookingContext';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { vehicles } from '@/lib/data/vehicles';
import { Vehicle } from '@/lib/contexts/BookingContext';
import VehicleCard from '@/components/ui/VehicleCard';
import Button from '@/components/ui/Button';

export default function VehiclesPage() {
  const router = useRouter();
  const { bookingData, updateBooking } = useBooking();
  const { t } = useLanguage();

  const [filteredVehicles, setFilteredVehicles] = useState(vehicles);
  const [filters, setFilters] = useState({
    type: '',
    minPrice: 0,
    maxPrice: 5000,
    passengers: 0,
    transmission: '',
  });

  useEffect(() => {
    let filtered = [...vehicles];

    if (filters.type) {
      filtered = filtered.filter((v) => v.type === filters.type);
    }

    if (filters.passengers > 0) {
      filtered = filtered.filter((v) => v.passengers >= filters.passengers);
    }

    if (filters.transmission) {
      filtered = filtered.filter((v) => v.transmission === filters.transmission);
    }

    filtered = filtered.filter(
      (v) => v.price >= filters.minPrice && v.price <= filters.maxPrice
    );

    setFilteredVehicles(filtered);
  }, [filters]);

  const handleVehicleSelect = (vehicle: Vehicle) => {
    updateBooking({ vehicle });
    router.push('/routes');
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      minPrice: 0,
      maxPrice: 5000,
      passengers: 0,
      transmission: '',
    });
  };

  const vehicleTypes = [
    { value: '', label: t.home.booking.all },
    { value: 'sedan', label: t.home.booking.sedan },
    { value: 'suv', label: t.home.booking.suv },
    { value: 'van', label: t.home.booking.van },
    { value: 'luxury', label: t.home.booking.luxury },
  ];

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {t.vehicles.title}
          </h1>
          <p className="text-xl text-gray-600">{t.vehicles.subtitle}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">{t.vehicles.filters}</h2>
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {t.vehicles.clearFilters}
                </button>
              </div>

              {/* Vehicle Type Filter */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {t.home.booking.vehicleType}
                </label>
                <div className="space-y-2">
                  {vehicleTypes.map((type) => (
                    <label key={type.value} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value={type.value}
                        checked={filters.type === type.value}
                        onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-gray-700">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {t.vehicles.priceRange}
                </label>
                <div className="space-y-3">
                  <input
                    type="range"
                    min="0"
                    max="5000"
                    step="100"
                    value={filters.maxPrice}
                    onChange={(e) =>
                      setFilters({ ...filters, maxPrice: parseInt(e.target.value) })
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>฿0</span>
                    <span className="font-semibold text-blue-600">
                      ฿{filters.maxPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Passenger Capacity Filter */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {t.vehicles.capacity}
                </label>
                <select
                  value={filters.passengers}
                  onChange={(e) =>
                    setFilters({ ...filters, passengers: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="0">Any</option>
                  <option value="4">4+</option>
                  <option value="5">5+</option>
                  <option value="7">7+</option>
                  <option value="10">10+</option>
                </select>
              </div>

              {/* Transmission Filter */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {t.vehicles.transmission}
                </label>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="transmission"
                      value=""
                      checked={filters.transmission === ''}
                      onChange={(e) =>
                        setFilters({ ...filters, transmission: e.target.value })
                      }
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700">Any</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="transmission"
                      value="automatic"
                      checked={filters.transmission === 'automatic'}
                      onChange={(e) =>
                        setFilters({ ...filters, transmission: e.target.value })
                      }
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700 capitalize">
                      {t.vehicles.automatic}
                    </span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="transmission"
                      value="manual"
                      checked={filters.transmission === 'manual'}
                      onChange={(e) =>
                        setFilters({ ...filters, transmission: e.target.value })
                      }
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700 capitalize">{t.vehicles.manual}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicles Grid */}
          <div className="lg:w-3/4">
            {filteredVehicles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredVehicles.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    onSelect={handleVehicleSelect}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <svg
                  className="w-24 h-24 text-gray-300 mx-auto mb-4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No vehicles found</h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your filters to see more options
                </p>
                <Button onClick={clearFilters} variant="outline">
                  {t.vehicles.clearFilters}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
