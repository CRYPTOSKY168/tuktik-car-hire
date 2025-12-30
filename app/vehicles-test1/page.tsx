'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBooking, Vehicle } from '@/lib/contexts/BookingContext';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { FirestoreService } from '@/lib/firebase/firestore';

// Vehicle tier mapping
const getTier = (vehicle: any): 'standard' | 'luxury' => {
  const name = vehicle.name?.toLowerCase() || '';
  const type = vehicle.type?.toLowerCase() || '';
  if (name.includes('alphard') || name.includes('mercedes') ||
      name.includes('bmw') || name.includes('vip') ||
      type.includes('luxury') || vehicle.price > 2500) {
    return 'luxury';
  }
  return 'standard';
};

// Get popular badge based on type/price
const isPopular = (vehicle: any): boolean => {
  const type = vehicle.type?.toLowerCase() || '';
  return type === 'sedan' || (vehicle.price >= 1000 && vehicle.price <= 1500);
};

export default function VehiclesTest1Page() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { updateBooking, bookingData, locations } = useBooking();
  const { formatPrice, currency } = useCurrency();

  // State
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [showPromo, setShowPromo] = useState(true);
  const [routePrices, setRoutePrices] = useState<Record<string, number> | null>(null);

  // Location Picker State
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationPickerType, setLocationPickerType] = useState<'pickup' | 'dropoff'>('pickup');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Vehicles from Firestore
  useEffect(() => {
    const fetchVehicles = async () => {
      setIsLoading(true);
      try {
        const dbVehicles = await FirestoreService.getVehicles();
        const activeVehicles = dbVehicles
          .filter(v => v.isActive !== false)
          .sort((a, b) => ((a as any).sortOrder || 99) - ((b as any).sortOrder || 99))
          .map(v => {
            const vAny = v as any;
            return {
              id: v.id,
              name: v.name,
              type: v.type,
              price: v.price,
              priceUSD: vAny.priceUSD,
              passengers: vAny.capacity || vAny.passengers || 4,
              luggage: vAny.luggage || 2,
              transmission: vAny.transmission || 'Auto',
              image: v.image || '',
              icon: vAny.icon || '',
              iconBg: vAny.iconBg || '',
              description: vAny.description || '',
              waitTime: vAny.waitTime || '',
              features: Array.isArray(v.features) ? v.features : [],
              desc: vAny.description || (Array.isArray(v.features) ? v.features.slice(0, 2).join(', ') : ''),
              tier: vAny.isVip ? 'luxury' : getTier(v),
              popular: vAny.isPopular || isPopular(v),
              isVip: vAny.isVip || false,
              eta: vAny.waitTime ? vAny.waitTime : `${Math.floor(Math.random() * 10) + 3}`,
            };
          });

        setVehicles(activeVehicles);
        // Select first vehicle by default
        if (activeVehicles.length > 0) {
          setSelected(activeVehicles[0]);
        }
      } catch (e) {
        console.error("Failed to load vehicles", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  // Fetch Dynamic Route Price
  useEffect(() => {
    const fetchRoutePrice = async () => {
      if (bookingData.pickupLocation && bookingData.dropoffLocation && locations.length > 0) {
        const resolveLocationObj = (input: string) => {
          return locations.find(l =>
            l.name?.en?.toLowerCase() === input.toLowerCase() ||
            l.name?.th?.toLowerCase() === input.toLowerCase()
          );
        };

        const originLoc = resolveLocationObj(bookingData.pickupLocation);
        const destinationLoc = resolveLocationObj(bookingData.dropoffLocation);

        const originId = originLoc?.id || bookingData.pickupLocation;
        const destinationId = destinationLoc?.id || bookingData.dropoffLocation;

        let prices = await FirestoreService.getRoutePrice(originId, destinationId);

        if (!prices && originLoc && destinationLoc) {
          const enOrigin = originLoc.name.en;
          const enDest = destinationLoc.name.en;
          let retryPrices = await FirestoreService.getRoutePrice(enOrigin, enDest);

          if (!retryPrices) {
            const cleanName = (s: string) => s.replace(/\s*\([^)]*\)/g, '').trim();
            retryPrices = await FirestoreService.getRoutePrice(cleanName(enOrigin), cleanName(enDest));
          }

          if (retryPrices) prices = retryPrices;
        }

        setRoutePrices(prices as any);
      } else {
        setRoutePrices(null);
      }
    };
    fetchRoutePrice();
  }, [bookingData.pickupLocation, bookingData.dropoffLocation, locations]);

  // Get dynamic price based on route
  const getDynamicPrice = (vehicle: any): number => {
    if (routePrices) {
      const type = vehicle.type?.toLowerCase() || '';
      const name = vehicle.name?.toLowerCase() || '';
      const features = vehicle.features?.join(' ').toLowerCase() || '';
      const combined = `${type} ${name} ${features}`;

      if (combined.includes('luxury') || combined.includes('vip') ||
        name.includes('alphard') || name.includes('mercedes') ||
        name.includes('bmw') || name.includes('tesla')) {
        return routePrices['luxury'] || vehicle.price;
      }

      if (combined.includes('minibus') || combined.includes('bus') ||
        combined.includes('transit') || (type === 'van' && vehicle.passengers > 9)) {
        return routePrices['minibus'] || routePrices['van'] || vehicle.price;
      }

      if (type === 'van' || combined.includes('van')) return routePrices['van'] || vehicle.price;
      if (type === 'suv' || combined.includes('suv')) return routePrices['suv'] || vehicle.price;
      if (type === 'sedan' || combined.includes('sedan')) return routePrices['sedan'] || vehicle.price;

      if (routePrices[type]) return routePrices[type];
    }
    return vehicle.price;
  };

  // Handle booking confirmation
  const handleBooking = () => {
    if (!selected) return;

    setIsBooking(true);

    const finalPrice = getDynamicPrice(selected);

    updateBooking({
      vehicle: {
        id: selected.id,
        name: selected.name,
        type: selected.type,
        price: finalPrice,
        image: selected.image,
        passengers: selected.passengers,
        luggage: selected.luggage,
        transmission: selected.transmission,
        features: selected.features || [],
        isFixedPrice: false
      } as Vehicle
    });

    router.push('/payment');
  };

  // Handle back navigation
  const handleBack = () => {
    router.back();
  };

  // Open location picker
  const openLocationPicker = (type: 'pickup' | 'dropoff') => {
    setLocationPickerType(type);
    setSearchQuery('');
    setShowLocationPicker(true);
  };

  // Handle location selection
  const handleLocationSelect = (location: any) => {
    const locationName = language === 'th' ? location.name?.th : location.name?.en;
    if (locationPickerType === 'pickup') {
      updateBooking({ pickupLocation: locationName || location.name?.en });
    } else {
      updateBooking({ dropoffLocation: locationName || location.name?.en });
    }
    setShowLocationPicker(false);
  };

  // Filter locations based on search
  const filteredLocations = locations.filter(loc => {
    const searchLower = searchQuery.toLowerCase();
    const nameTh = loc.name?.th?.toLowerCase() || '';
    const nameEn = loc.name?.en?.toLowerCase() || '';
    return nameTh.includes(searchLower) || nameEn.includes(searchLower);
  });

  // Get location icon based on type
  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'airport':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        );
      case 'hotel':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
    }
  };

  const isLuxury = selected?.tier === 'luxury';

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gray-100">
        <div className="max-w-[430px] mx-auto bg-white min-h-screen min-h-[100dvh] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">{language === 'th' ? 'กำลังโหลด...' : 'Loading...'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gray-100">
      <div className="max-w-[430px] mx-auto bg-white min-h-screen min-h-[100dvh] flex flex-col relative shadow-2xl">

        {/* ===== HEADER (Minimal like Uber) ===== */}
        <header className="sticky top-0 z-40 bg-white">
          <div className="px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 flex items-center">
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 active:scale-95 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="ml-4 text-lg font-semibold text-gray-900">
              {language === 'th' ? 'เลือกรถ' : 'Select Vehicle'}
            </h1>
          </div>
        </header>

        {/* ===== SCROLLABLE CONTENT ===== */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 pb-[200px]">

            {/* ----- Route Section (Connected) ----- */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
              <div className="flex">
                {/* Left: Connection Line */}
                <div className="flex flex-col items-center mr-4">
                  <div className="w-3 h-3 rounded-full bg-green-500 ring-4 ring-green-100" />
                  <div className="w-0.5 h-10 bg-gray-300 my-1" />
                  <div className="w-3 h-3 rounded-full bg-red-500 ring-4 ring-red-100" />
                </div>

                {/* Right: Location Info - Clickable */}
                <div className="flex-1 space-y-2">
                  {/* Pickup - Clickable */}
                  <button
                    onClick={() => openLocationPicker('pickup')}
                    className="w-full text-left p-2 -m-2 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors group"
                  >
                    <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                      {language === 'th' ? 'จุดรับ' : 'Pickup'}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className={`text-[15px] font-semibold ${bookingData.pickupLocation ? 'text-gray-900' : 'text-gray-400'}`}>
                        {bookingData.pickupLocation || (language === 'th' ? 'เลือกจุดรับ' : 'Select pickup')}
                      </p>
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>

                  {/* Divider */}
                  <div className="h-px bg-gray-100 mx-2" />

                  {/* Dropoff - Clickable */}
                  <button
                    onClick={() => openLocationPicker('dropoff')}
                    className="w-full text-left p-2 -m-2 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors group"
                  >
                    <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                      {language === 'th' ? 'จุดส่ง' : 'Dropoff'}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className={`text-[15px] font-semibold ${bookingData.dropoffLocation ? 'text-gray-900' : 'text-gray-400'}`}>
                        {bookingData.dropoffLocation || (language === 'th' ? 'เลือกจุดส่ง' : 'Select dropoff')}
                      </p>
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* ----- Promo Banner (Small) ----- */}
            {showPromo && (
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎁</span>
                  <div>
                    <span className="text-white font-bold text-sm">FIRST20</span>
                    <span className="text-white/90 text-sm ml-2">
                      {language === 'th' ? 'ลด 20% เที่ยวแรก' : '20% off first trip'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowPromo(false)}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 active:scale-95 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* ----- Section Title ----- */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900">
                {language === 'th' ? 'เลือกประเภทรถ' : 'Select Vehicle Type'}
              </h2>
              <span className="text-xs text-gray-500">
                {vehicles.length} {language === 'th' ? 'ประเภท' : 'types'}
              </span>
            </div>

            {/* ----- Vehicle List (Vertical Cards) ----- */}
            <div className="space-y-3">
              {vehicles.map((v) => {
                const isSelected = selected?.id === v.id;
                const isVip = v.tier === 'luxury';
                const displayPrice = getDynamicPrice(v);

                return (
                  <button
                    key={v.id}
                    onClick={() => setSelected(v)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                      isSelected
                        ? isVip
                          ? 'border-amber-400 bg-amber-50 shadow-lg shadow-amber-100/50'
                          : 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-100/50'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Vehicle Icon/Image */}
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden ${
                        v.iconBg || (isSelected
                          ? isVip ? 'bg-amber-100' : 'bg-blue-100'
                          : 'bg-gray-100')
                      }`}>
                        {v.icon ? (
                          <span className="text-3xl">{v.icon}</span>
                        ) : v.image ? (
                          <img
                            src={v.image}
                            alt={v.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h8M8 17v-4m8 4v-4m-8 0h8m-8 0V9a4 4 0 014-4h0a4 4 0 014 4v4" />
                          </svg>
                        )}
                      </div>

                      {/* Vehicle Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-bold ${
                            isSelected
                              ? isVip ? 'text-amber-900' : 'text-blue-900'
                              : 'text-gray-900'
                          }`}>
                            {v.name}
                          </h3>
                          {v.popular && !isVip && (
                            <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full">
                              {language === 'th' ? 'ยอดนิยม' : 'Popular'}
                            </span>
                          )}
                          {isVip && (
                            <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                              VIP
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{v.desc}</p>

                        {/* Specs */}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-xs text-gray-600">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                            </svg>
                            {v.passengers}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-600">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {v.luggage}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {v.eta} {language === 'th' ? 'นาที' : 'min'}
                          </span>
                        </div>
                      </div>

                      {/* Price & Check */}
                      <div className="text-right flex-shrink-0">
                        <p className={`text-lg font-bold ${
                          isSelected
                            ? isVip ? 'text-amber-600' : 'text-blue-600'
                            : 'text-gray-900'
                        }`}>
                          {formatPrice(displayPrice)}
                        </p>
                        {isSelected && (
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center mt-1 ml-auto ${
                            isVip ? 'bg-amber-500' : 'bg-blue-500'
                          }`}>
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expanded Info when Selected */}
                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-gray-200/50">
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-white rounded-full text-xs text-gray-700 shadow-sm">
                            <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {language === 'th' ? 'คนขับมืออาชีพ' : 'Pro Driver'}
                          </span>
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-white rounded-full text-xs text-gray-700 shadow-sm">
                            <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {language === 'th' ? 'รวมทางด่วน' : 'Toll Included'}
                          </span>
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-white rounded-full text-xs text-gray-700 shadow-sm">
                            <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {language === 'th' ? 'ประกันภัย' : 'Insurance'}
                          </span>
                          {isVip && (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 rounded-full text-xs text-amber-700 font-semibold shadow-sm">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              VIP Service
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

          </div>
        </div>

        {/* ===== FIXED BOTTOM CTA ===== */}
        {selected && (
          <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
            <div className="max-w-[430px] mx-auto pointer-events-auto">
              <div className="bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))]">

                {/* Selected Vehicle Summary */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden ${
                      selected.iconBg || (isLuxury ? 'bg-amber-100' : 'bg-blue-100')
                    }`}>
                      {selected.icon ? (
                        <span className="text-2xl">{selected.icon}</span>
                      ) : selected.image ? (
                        <img src={selected.image} alt={selected.name} className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17h8M8 17v-4m8 4v-4m-8 0h8m-8 0V9a4 4 0 014-4h0a4 4 0 014 4v4" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{selected.name}</p>
                      <p className="text-xs text-gray-500">
                        {selected.passengers} {language === 'th' ? 'ที่นั่ง' : 'seats'} • {selected.eta} {language === 'th' ? 'นาที' : 'min'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${isLuxury ? 'text-amber-600' : 'text-gray-900'}`}>
                      {formatPrice(getDynamicPrice(selected))}
                    </p>
                  </div>
                </div>

                {/* Book Button */}
                <button
                  onClick={handleBooking}
                  disabled={isBooking || !bookingData.pickupLocation || !bookingData.dropoffLocation}
                  className={`w-full h-14 rounded-2xl font-bold text-white text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                    isLuxury
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-200'
                      : 'bg-gray-900 hover:bg-gray-800 shadow-gray-300'
                  } ${(isBooking || !bookingData.pickupLocation || !bookingData.dropoffLocation) ? 'opacity-70' : 'active:scale-[0.98]'}`}
                >
                  {isBooking ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {language === 'th' ? 'กำลังดำเนินการ...' : 'Processing...'}
                    </>
                  ) : !bookingData.pickupLocation || !bookingData.dropoffLocation ? (
                    language === 'th' ? 'กรุณาเลือกจุดรับ-ส่ง' : 'Select pickup & dropoff'
                  ) : (
                    language === 'th' ? 'ยืนยันการจอง' : 'Confirm Booking'
                  )}
                </button>

                {/* Trust Badges */}
                <div className="flex items-center justify-center gap-4 mt-3">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {language === 'th' ? 'ยกเลิกฟรี 24 ชม.' : 'Free cancel 24h'}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {language === 'th' ? 'ประกันครอบคลุม' : 'Full Insurance'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ===== LOCATION PICKER BOTTOM SHEET ===== */}
      {showLocationPicker && (
        <div className="fixed inset-0 z-[100]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowLocationPicker(false)}
          />

          {/* Bottom Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] flex flex-col animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-4 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {locationPickerType === 'pickup'
                    ? (language === 'th' ? 'เลือกจุดรับ' : 'Select Pickup')
                    : (language === 'th' ? 'เลือกจุดส่ง' : 'Select Dropoff')
                  }
                </h2>
                <button
                  onClick={() => setShowLocationPicker(false)}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 active:scale-95 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search Input */}
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'th' ? 'ค้นหาสถานที่...' : 'Search locations...'}
                  className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Location List */}
            <div className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
              {filteredLocations.length > 0 ? (
                <div className="p-4 space-y-2">
                  {filteredLocations.map((loc) => {
                    const locName = language === 'th' ? loc.name?.th : loc.name?.en;
                    const isSelected =
                      (locationPickerType === 'pickup' && bookingData.pickupLocation === locName) ||
                      (locationPickerType === 'dropoff' && bookingData.dropoffLocation === locName);

                    return (
                      <button
                        key={loc.id}
                        onClick={() => handleLocationSelect(loc)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98] ${
                          isSelected
                            ? 'bg-blue-50 border-2 border-blue-500'
                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                        }`}
                      >
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          loc.type === 'airport' ? 'bg-blue-100 text-blue-600' :
                          loc.type === 'hotel' ? 'bg-amber-100 text-amber-600' :
                          'bg-gray-200 text-gray-600'
                        }`}>
                          {getLocationIcon(loc.type)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-left">
                          <p className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                            {locName}
                          </p>
                          <p className="text-sm text-gray-500 capitalize">{loc.type}</p>
                        </div>

                        {/* Check mark */}
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">
                    {language === 'th' ? 'ไม่พบสถานที่' : 'No locations found'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
