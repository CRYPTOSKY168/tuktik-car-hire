'use client';

import { useState } from 'react';

// Mock data with tier field (A+B solution)
const mockVehicles = [
  // SEDAN - Standard
  {
    id: 'camry',
    name: 'Toyota Camry',
    type: 'sedan',
    tier: 'standard',
    desc: 'Economy, Reliable',
    passengers: 4,
    luggage: 2,
    transmission: 'Auto',
    image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&h=250&fit=crop',
  },
  {
    id: 'lexus-es',
    name: 'Lexus ES',
    type: 'sedan',
    tier: 'standard',
    desc: 'Premium, Quiet',
    passengers: 4,
    luggage: 2,
    transmission: 'Auto',
    image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400&h=250&fit=crop',
  },
  // SEDAN - Luxury
  {
    id: 'mercedes-e',
    name: 'Mercedes-Benz E-Class',
    type: 'sedan',
    tier: 'luxury',
    desc: 'Executive, Leather Seats',
    passengers: 3,
    luggage: 2,
    transmission: 'Auto',
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400&h=250&fit=crop',
  },
  {
    id: 'bmw-5',
    name: 'BMW 5 Series',
    type: 'sedan',
    tier: 'luxury',
    desc: 'Business, Dynamic',
    passengers: 3,
    luggage: 2,
    transmission: 'Auto',
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&h=250&fit=crop',
  },
  {
    id: 'tesla-s',
    name: 'Tesla Model S',
    type: 'sedan',
    tier: 'luxury',
    desc: 'Electric, Silent',
    passengers: 4,
    luggage: 2,
    transmission: 'EV',
    image: 'https://images.unsplash.com/photo-1536700503339-1e4b06520771?w=400&h=250&fit=crop',
  },
  // SUV - Standard
  {
    id: 'fortuner',
    name: 'Toyota Fortuner',
    type: 'suv',
    tier: 'standard',
    desc: '7-Seater, Spacious',
    passengers: 7,
    luggage: 4,
    transmission: 'Auto',
    image: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=400&h=250&fit=crop',
  },
  {
    id: 'suburban',
    name: 'Chevrolet Suburban',
    type: 'suv',
    tier: 'standard',
    desc: 'Large SUV, Rugged',
    passengers: 7,
    luggage: 6,
    transmission: 'Auto',
    image: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=400&h=250&fit=crop',
  },
  // SUV - Luxury
  {
    id: 'escalade',
    name: 'Cadillac Escalade',
    type: 'suv',
    tier: 'luxury',
    desc: 'Luxury SUV, Spacious',
    passengers: 6,
    luggage: 5,
    transmission: 'Auto',
    image: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=400&h=250&fit=crop',
  },
  {
    id: 'range-rover',
    name: 'Range Rover',
    type: 'suv',
    tier: 'luxury',
    desc: 'Premium SUV, Elegant',
    passengers: 5,
    luggage: 4,
    transmission: 'Auto',
    image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400&h=250&fit=crop',
  },
  // VAN - Standard
  {
    id: 'hiace',
    name: 'Toyota Hiace',
    type: 'van',
    tier: 'standard',
    desc: 'Group Travel, 10 Seats',
    passengers: 10,
    luggage: 8,
    transmission: 'Auto',
    image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=400&h=250&fit=crop',
  },
  // VAN - Luxury
  {
    id: 'alphard',
    name: 'Toyota Alphard',
    type: 'van',
    tier: 'luxury',
    desc: 'VIP Van, Captain Seats',
    passengers: 6,
    luggage: 4,
    transmission: 'Auto',
    image: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=400&h=250&fit=crop',
  },
];

// Route prices (Ayutthaya → Bangkok)
const routePrices = {
  sedan: 1000,
  suv: 1200,
  van: 1500,
  luxury: 3500,
  minibus: 1800,
};

export default function VehiclesTestPage() {
  const [selectedType, setSelectedType] = useState('all');
  const [showLuxuryOnly, setShowLuxuryOnly] = useState(false);

  const vehicleTypes = [
    { value: 'all', label: 'ทั้งหมด', icon: 'apps' },
    { value: 'sedan', label: 'ซีดาน', icon: 'directions_car' },
    { value: 'suv', label: 'SUV', icon: 'directions_car' },
    { value: 'van', label: 'แวน', icon: 'airport_shuttle' },
  ];

  // Filter vehicles
  const filteredVehicles = mockVehicles.filter((v) => {
    if (selectedType !== 'all' && v.type !== selectedType) return false;
    if (showLuxuryOnly && v.tier !== 'luxury') return false;
    return true;
  });

  // Get price based on tier
  const getPrice = (vehicle: typeof mockVehicles[0]) => {
    if (vehicle.tier === 'luxury') {
      return routePrices.luxury;
    }
    return routePrices[vehicle.type as keyof typeof routePrices] || 1000;
  };

  // Get tier badge style
  const getTierBadge = (vehicle: typeof mockVehicles[0]) => {
    const type = vehicle.type.toUpperCase();

    if (vehicle.tier === 'luxury') {
      return {
        text: `✦ LUXURY ${type}`,
        bgClass: 'bg-gradient-to-r from-amber-500 to-yellow-400',
        textClass: 'text-white',
        icon: 'star',
      };
    }

    // Standard tier
    return {
      text: type,
      bgClass: 'bg-blue-100',
      textClass: 'text-blue-700',
      icon: 'directions_car',
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🧪 Vehicles Test Page</h1>
              <p className="text-sm text-gray-500">ทดสอบ UI แบบ A+B (Type + Tier)</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">เส้นทาง</p>
              <p className="font-medium">อยุธยา → กรุงเทพฯ</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Route Prices Info */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-6 text-white">
          <h2 className="font-bold mb-4">ราคาเส้นทาง: อยุธยา → กรุงเทพฯ</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-xs opacity-80">SEDAN</p>
              <p className="text-xl font-bold">฿{routePrices.sedan.toLocaleString()}</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-xs opacity-80">SUV</p>
              <p className="text-xl font-bold">฿{routePrices.suv.toLocaleString()}</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-xs opacity-80">VAN</p>
              <p className="text-xl font-bold">฿{routePrices.van.toLocaleString()}</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-xs opacity-80">MINIBUS</p>
              <p className="text-xl font-bold">฿{routePrices.minibus.toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-900 rounded-xl p-3 text-center">
              <p className="text-xs opacity-80">✦ LUXURY</p>
              <p className="text-xl font-bold">฿{routePrices.luxury.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            {/* Type Filter */}
            <div className="flex gap-2">
              {vehicleTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedType === type.value
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span className="material-symbols-rounded text-sm mr-1 align-middle">
                    {type.icon}
                  </span>
                  {type.label}
                </button>
              ))}
            </div>

            {/* Luxury Toggle */}
            <div className="ml-auto">
              <button
                onClick={() => setShowLuxuryOnly(!showLuxuryOnly)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  showLuxuryOnly
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="material-symbols-rounded text-sm">star</span>
                Luxury Only
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-gray-600">
            แสดง <span className="font-bold text-gray-900">{filteredVehicles.length}</span> คัน
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded">
              <span className="material-symbols-rounded text-xs">directions_car</span>
              Standard
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-white rounded">
              <span className="material-symbols-rounded text-xs">star</span>
              Luxury
            </span>
          </div>
        </div>

        {/* Vehicle Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((vehicle) => {
            const price = getPrice(vehicle);
            const badge = getTierBadge(vehicle);
            const isLuxury = vehicle.tier === 'luxury';

            return (
              <div
                key={vehicle.id}
                className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 ${
                  isLuxury ? 'ring-2 ring-amber-400' : ''
                }`}
              >
                {/* Image */}
                <div className="relative h-48 bg-gray-100">
                  <img
                    src={vehicle.image}
                    alt={vehicle.name}
                    className="w-full h-full object-cover"
                  />

                  {/* Tier Badge */}
                  <div className="absolute top-3 left-3">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg ${badge.bgClass} ${badge.textClass}`}
                    >
                      {isLuxury && (
                        <span className="material-symbols-rounded text-sm">star</span>
                      )}
                      {badge.text}
                    </span>
                  </div>

                  {/* Luxury Ribbon */}
                  {isLuxury && (
                    <div className="absolute top-0 right-0">
                      <div className="bg-gradient-to-l from-amber-500 to-yellow-400 text-white text-xs font-bold px-4 py-1 rounded-bl-lg shadow">
                        PREMIUM
                      </div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900">{vehicle.name}</h3>
                  <p className="text-sm text-gray-500 mb-3">{vehicle.desc}</p>

                  {/* Specs */}
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-rounded text-base">group</span>
                      {vehicle.passengers}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-rounded text-base">luggage</span>
                      {vehicle.luggage}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-rounded text-base">settings</span>
                      {vehicle.transmission}
                    </span>
                  </div>

                  {/* Price & Action */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <p className="text-xs text-gray-500">ราคาเส้นทาง</p>
                      <p className={`text-2xl font-bold ${isLuxury ? 'text-amber-600' : 'text-gray-900'}`}>
                        ฿{price.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      {isLuxury ? (
                        <span className="text-xs text-amber-600 flex items-center gap-1">
                          <span className="material-symbols-rounded text-sm">verified</span>
                          Premium Service
                        </span>
                      ) : (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <span className="material-symbols-rounded text-sm">check_circle</span>
                          รวมคนขับ
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Book Button */}
                  <button
                    className={`w-full mt-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                      isLuxury
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-white hover:from-amber-600 hover:to-yellow-500'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    จองเลย
                    <span className="material-symbols-rounded">arrow_forward</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-4">📋 สรุปความแตกต่าง (A+B Solution)</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">รถ</th>
                  <th className="text-left py-2 px-3">Type (ตัวถัง)</th>
                  <th className="text-left py-2 px-3">Tier (ระดับ)</th>
                  <th className="text-left py-2 px-3">Badge ที่แสดง</th>
                  <th className="text-right py-2 px-3">ราคา</th>
                </tr>
              </thead>
              <tbody>
                {mockVehicles.slice(0, 7).map((v) => (
                  <tr key={v.id} className="border-b">
                    <td className="py-2 px-3 font-medium">{v.name}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">{v.type}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        v.tier === 'luxury'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {v.tier}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {v.tier === 'luxury' ? (
                        <span className="px-2 py-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-white rounded text-xs font-bold">
                          ✦ LUXURY {v.type.toUpperCase()}
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {v.type.toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-bold">
                      ฿{getPrice(v).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
