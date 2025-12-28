'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBooking, Vehicle } from '@/lib/contexts/BookingContext';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { FirestoreService } from '@/lib/firebase/firestore';

export default function VehiclesPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { updateBooking, bookingData, locations } = useBooking();
  const { formatPrice } = useCurrency();
  const [isLoading, setIsLoading] = useState(true);

  // State for vehicles from DB
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<any[]>([]);

  // Filter state
  const [selectedType, setSelectedType] = useState('all');

  // Route Edit Dropdown
  const [routeEditDropdown, setRouteEditDropdown] = useState<'pickup' | 'dropoff' | null>(null);

  // Location Selection Dropdown (for initial selection)
  const [locationDropdown, setLocationDropdown] = useState<'pickup' | 'dropoff' | null>(null);

  // Fetch Vehicles from Firestore
  useEffect(() => {
    const fetchVehicles = async () => {
      setIsLoading(true);
      try {
        const dbVehicles = await FirestoreService.getVehicles();
        const activeVehicles = dbVehicles.filter(v => v.isActive !== false).map(v => ({
          id: v.id,
          name: v.name,
          type: v.type,
          price: v.price,
          priceUSD: v.priceUSD,
          passengers: v.capacity || v.passengers || 4,
          luggage: v.luggage || 2,
          transmission: v.transmission || 'Auto',
          image: v.image || '',
          features: Array.isArray(v.features) ? v.features : [],
          desc: Array.isArray(v.features) ? v.features.join(', ') : (v.features || v.desc || ''),
          tag: v.tag || '',
        }));

        setVehicles(activeVehicles);
        setFilteredVehicles(activeVehicles);
      } catch (e) {
        console.error("Failed to load vehicles", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  // Fetch Dynamic Route Price
  const [routePrices, setRoutePrices] = useState<Record<string, number> | null>(null);

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

  const getDynamicPrice = (vehicle: any) => {
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
        combined.includes('transit') || (type === 'van' && vehicle.capacity > 9)) {
        return routePrices['minibus'] || routePrices['van'] || vehicle.price;
      }

      if (type === 'van' || combined.includes('van')) return routePrices['van'] || vehicle.price;
      if (type === 'suv' || combined.includes('suv')) return routePrices['suv'] || vehicle.price;
      if (type === 'sedan' || combined.includes('sedan')) return routePrices['sedan'] || vehicle.price;

      if (routePrices[type]) return routePrices[type];
    }
    return vehicle.price;
  };

  // Apply filters
  useEffect(() => {
    let result = vehicles;
    if (selectedType !== 'all') {
      result = result.filter(v => {
        if (selectedType === 'luxury') return ['mercedes-s', 'tesla-s', 'bmw7', 'alphard'].includes(v.id) || v.price > 2000;
        return v.type === selectedType;
      });
    }
    setFilteredVehicles(result);
  }, [vehicles, selectedType]);

  const vehicleTypes = [
    { value: 'all', label: language === 'th' ? 'ทั้งหมด' : 'All', icon: 'apps' },
    { value: 'sedan', label: language === 'th' ? 'ซีดาน' : 'Sedan', icon: 'directions_car' },
    { value: 'suv', label: 'SUV', icon: 'directions_car' },
    { value: 'van', label: language === 'th' ? 'แวน' : 'Van', icon: 'airport_shuttle' },
  ];

  // Modal State
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [pendingVehicle, setPendingVehicle] = useState<any>(null);
  const [tripDetails, setTripDetails] = useState({
    pickupLocation: '',
    dropoffLocation: '',
    pickupDate: '',
    pickupTime: '10:00',
  });
  const [activeDropdown, setActiveDropdown] = useState<'pickup' | 'dropoff' | null>(null);

  const handleVehicleSelect = (vehicle: any) => {
    if (!bookingData.pickupLocation || !bookingData.dropoffLocation || !bookingData.pickupDate) {
      setPendingVehicle(vehicle);
      setTripDetails({
        pickupLocation: bookingData.pickupLocation || '',
        dropoffLocation: bookingData.dropoffLocation || '',
        pickupDate: bookingData.pickupDate || new Date().toISOString().split('T')[0],
        pickupTime: bookingData.pickupTime || '10:00',
      });
      setIsDetailsModalOpen(true);
      return;
    }
    proceedToBooking(vehicle);
  };

  const proceedToBooking = (vehicle: any) => {
    updateBooking({
      vehicle: {
        id: vehicle.id,
        name: vehicle.name,
        type: vehicle.type,
        price: vehicle.price,
        image: vehicle.image,
        passengers: vehicle.passengers,
        luggage: vehicle.luggage,
        transmission: vehicle.transmission,
        features: vehicle.features || [],
        isFixedPrice: vehicle.isFixedPrice || false
      } as Vehicle
    });
    router.push('/payment');
  };

  const handleConfirmDetails = (e: React.FormEvent) => {
    e.preventDefault();
    updateBooking({
      pickupLocation: tripDetails.pickupLocation,
      dropoffLocation: tripDetails.dropoffLocation,
      pickupDate: tripDetails.pickupDate,
      pickupTime: tripDetails.pickupTime,
    });
    setIsDetailsModalOpen(false);
    if (pendingVehicle) {
      proceedToBooking(pendingVehicle);
    }
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'sedan': return { bg: 'from-blue-500 to-indigo-600', light: 'bg-blue-50', text: 'text-blue-700', shadow: 'shadow-blue-500/30' };
      case 'suv': return { bg: 'from-orange-500 to-amber-600', light: 'bg-orange-50', text: 'text-orange-700', shadow: 'shadow-orange-500/30' };
      case 'van': return { bg: 'from-purple-500 to-violet-600', light: 'bg-purple-50', text: 'text-purple-700', shadow: 'shadow-purple-500/30' };
      default: return { bg: 'from-gray-500 to-gray-600', light: 'bg-gray-50', text: 'text-gray-700', shadow: 'shadow-gray-500/30' };
    }
  };

  // Check if both locations are selected
  const hasLocations = bookingData.pickupLocation && bookingData.dropoffLocation;

  // Loading State - Finance Style
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh] bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
          </div>
          <div className="text-center">
            <p className="text-gray-800 font-semibold">{language === 'th' ? 'กำลังโหลดรถ...' : 'Loading vehicles...'}</p>
            <p className="text-sm text-gray-500">{language === 'th' ? 'กรุณารอสักครู่' : 'Please wait'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full bg-[#f8fafc] dark:bg-[#0f1419] min-h-screen">
      <div className="w-full max-w-[1440px] mx-auto px-4 lg:px-8 py-6 lg:py-8">

        {/* Location Required View - Finance Style */}
        {!hasLocations && (
          <div className="min-h-[70vh] flex items-center justify-center">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12 max-w-xl w-full">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <span className="material-symbols-outlined text-white text-4xl">route</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                  {language === 'th' ? 'เลือกเส้นทางของคุณ' : 'Select Your Route'}
                </h2>
                <p className="text-gray-500">
                  {language === 'th'
                    ? 'กรุณาเลือกจุดรับและจุดส่งเพื่อดูราคาที่แม่นยำ'
                    : 'Select pickup and dropoff to see accurate pricing'}
                </p>
              </div>

              {/* Location Selectors - Custom Dropdown for Mobile */}
              <div className="space-y-4">
                {/* Pickup */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                      {language === 'th' ? 'จุดรับ' : 'Pickup Location'}
                    </span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setLocationDropdown(locationDropdown === 'pickup' ? null : 'pickup')}
                      className="w-full flex items-center gap-3 pl-12 pr-10 py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl hover:border-emerald-400 transition-all shadow-sm text-left"
                    >
                      <span className="absolute left-4 material-symbols-outlined text-emerald-500 text-xl">trip_origin</span>
                      <span className={`flex-1 font-semibold ${bookingData.pickupLocation ? 'text-gray-800 dark:text-white' : 'text-gray-400'}`}>
                        {bookingData.pickupLocation || (language === 'th' ? 'เลือกจุดรับของคุณ' : 'Select your pickup')}
                      </span>
                      <span className="absolute right-4 material-symbols-outlined text-gray-400">expand_more</span>
                    </button>

                    {/* Pickup Dropdown - Bottom Sheet on Mobile */}
                    {locationDropdown === 'pickup' && (
                      <>
                        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setLocationDropdown(null)}></div>
                        <div className="fixed bottom-0 left-0 right-0 sm:absolute sm:bottom-auto sm:top-full sm:left-0 sm:right-0 sm:mt-2 bg-white dark:bg-gray-800 sm:rounded-xl rounded-t-3xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-emerald-500 to-green-600">
                            <div className="sm:hidden w-12 h-1 bg-white/30 rounded-full mx-auto mb-3"></div>
                            <p className="text-sm font-bold text-white uppercase tracking-wider text-center sm:text-left">
                              {language === 'th' ? 'เลือกจุดรับ' : 'Select Pickup'}
                            </p>
                          </div>
                          <div className="max-h-[50vh] sm:max-h-64 overflow-y-auto">
                            {locations.map((loc) => (
                              <button
                                key={loc.id}
                                type="button"
                                onClick={() => {
                                  updateBooking({ pickupLocation: language === 'th' ? loc.name?.th : loc.name?.en });
                                  setLocationDropdown(null);
                                }}
                                className={`w-full text-left px-4 py-4 sm:py-3 text-base sm:text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex items-center gap-3 border-b border-gray-50 dark:border-gray-700 last:border-0 ${bookingData.pickupLocation === (language === 'th' ? loc.name?.th : loc.name?.en) ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                              >
                                <span className="material-symbols-outlined text-emerald-500 text-lg">location_on</span>
                                {language === 'th' ? loc.name?.th : loc.name?.en}
                                {bookingData.pickupLocation === (language === 'th' ? loc.name?.th : loc.name?.en) && (
                                  <span className="material-symbols-outlined text-emerald-500 ml-auto">check_circle</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center -my-2">
                  <button
                    type="button"
                    onClick={() => {
                      const temp = bookingData.pickupLocation;
                      updateBooking({
                        pickupLocation: bookingData.dropoffLocation,
                        dropoffLocation: temp
                      });
                    }}
                    className="w-10 h-10 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all shadow-sm group"
                    title={language === 'th' ? 'สลับจุดรับ-ส่ง' : 'Swap locations'}
                  >
                    <span className="material-symbols-outlined text-gray-400 group-hover:text-blue-500 transition-colors rotate-90">swap_vert</span>
                  </button>
                </div>

                {/* Dropoff */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      {language === 'th' ? 'จุดส่ง' : 'Dropoff Location'}
                    </span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setLocationDropdown(locationDropdown === 'dropoff' ? null : 'dropoff')}
                      className="w-full flex items-center gap-3 pl-12 pr-10 py-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl hover:border-red-400 transition-all shadow-sm text-left"
                    >
                      <span className="absolute left-4 material-symbols-outlined text-red-500 text-xl">location_on</span>
                      <span className={`flex-1 font-semibold ${bookingData.dropoffLocation ? 'text-gray-800 dark:text-white' : 'text-gray-400'}`}>
                        {bookingData.dropoffLocation || (language === 'th' ? 'เลือกจุดส่งของคุณ' : 'Select your dropoff')}
                      </span>
                      <span className="absolute right-4 material-symbols-outlined text-gray-400">expand_more</span>
                    </button>

                    {/* Dropoff Dropdown - Bottom Sheet on Mobile */}
                    {locationDropdown === 'dropoff' && (
                      <>
                        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setLocationDropdown(null)}></div>
                        <div className="fixed bottom-0 left-0 right-0 sm:absolute sm:bottom-auto sm:top-full sm:left-0 sm:right-0 sm:mt-2 bg-white dark:bg-gray-800 sm:rounded-xl rounded-t-3xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-red-500 to-rose-600">
                            <div className="sm:hidden w-12 h-1 bg-white/30 rounded-full mx-auto mb-3"></div>
                            <p className="text-sm font-bold text-white uppercase tracking-wider text-center sm:text-left">
                              {language === 'th' ? 'เลือกจุดส่ง' : 'Select Dropoff'}
                            </p>
                          </div>
                          <div className="max-h-[50vh] sm:max-h-64 overflow-y-auto">
                            {locations.map((loc) => (
                              <button
                                key={loc.id}
                                type="button"
                                onClick={() => {
                                  updateBooking({ dropoffLocation: language === 'th' ? loc.name?.th : loc.name?.en });
                                  setLocationDropdown(null);
                                }}
                                className={`w-full text-left px-4 py-4 sm:py-3 text-base sm:text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3 border-b border-gray-50 dark:border-gray-700 last:border-0 ${bookingData.dropoffLocation === (language === 'th' ? loc.name?.th : loc.name?.en) ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                              >
                                <span className="material-symbols-outlined text-red-500 text-lg">flag</span>
                                {language === 'th' ? loc.name?.th : loc.name?.en}
                                {bookingData.dropoffLocation === (language === 'th' ? loc.name?.th : loc.name?.en) && (
                                  <span className="material-symbols-outlined text-red-500 ml-auto">check_circle</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Back Button */}
              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <button
                  onClick={() => router.push('/')}
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  {language === 'th' ? 'กลับหน้าหลัก' : 'Back to Home'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Finance Style */}
        {hasLocations && (
          <>
            {/* Page Header */}
            <div className="mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white">
                    {language === 'th' ? 'เลือกรถของคุณ' : 'Choose Your Vehicle'}
                  </h1>
                  <p className="text-gray-500 text-sm mt-1">
                    {language === 'th' ? 'เลือกรถที่เหมาะกับการเดินทางของคุณ' : 'Select the perfect vehicle for your journey'}
                  </p>
                </div>

                {/* Route Display - Editable */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Pickup */}
                  <div className="relative">
                    <button
                      onClick={() => setRouteEditDropdown(routeEditDropdown === 'pickup' ? null : 'pickup')}
                      className="group flex items-center gap-2 px-4 py-3 bg-white hover:bg-gray-50 rounded-xl shadow-sm border border-gray-200 hover:border-emerald-400 transition-all"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-green-600 rounded-lg flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-white text-sm">trip_origin</span>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{language === 'th' ? 'จุดรับ' : 'Pickup'}</p>
                        <p className="text-sm font-semibold text-gray-800 max-w-[120px] truncate">{bookingData.pickupLocation}</p>
                      </div>
                      <span className="material-symbols-outlined text-gray-400 text-sm group-hover:text-emerald-500 transition-colors">edit</span>
                    </button>

                    {routeEditDropdown === 'pickup' && (
                      <>
                        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setRouteEditDropdown(null)}></div>
                        <div className="fixed bottom-0 left-0 right-0 sm:absolute sm:bottom-auto sm:top-full sm:left-0 sm:right-auto sm:mt-2 sm:w-72 bg-white dark:bg-gray-800 sm:rounded-xl rounded-t-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in slide-in-from-bottom sm:fade-in sm:zoom-in-95 duration-200">
                          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-emerald-500 to-green-600">
                            <div className="sm:hidden w-12 h-1 bg-white/30 rounded-full mx-auto mb-3"></div>
                            <p className="text-sm font-bold text-white uppercase tracking-wider text-center sm:text-left">{language === 'th' ? 'เลือกจุดรับ' : 'Select Pickup'}</p>
                          </div>
                          <div className="max-h-[50vh] sm:max-h-64 overflow-y-auto">
                            {locations.map((loc) => (
                              <button
                                key={loc.id}
                                onClick={() => {
                                  updateBooking({ pickupLocation: language === 'th' ? loc.name?.th : loc.name?.en });
                                  setRouteEditDropdown(null);
                                }}
                                className={`w-full text-left px-4 py-4 sm:py-3 text-base sm:text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex items-center gap-3 border-b border-gray-50 dark:border-gray-700 last:border-0 ${bookingData.pickupLocation === (language === 'th' ? loc.name?.th : loc.name?.en) ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                              >
                                <span className="material-symbols-outlined text-emerald-500 text-lg">location_on</span>
                                {language === 'th' ? loc.name?.th : loc.name?.en}
                                {bookingData.pickupLocation === (language === 'th' ? loc.name?.th : loc.name?.en) && (
                                  <span className="material-symbols-outlined text-emerald-500 ml-auto">check_circle</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-gray-400 text-sm">arrow_forward</span>
                  </div>

                  {/* Dropoff */}
                  <div className="relative">
                    <button
                      onClick={() => setRouteEditDropdown(routeEditDropdown === 'dropoff' ? null : 'dropoff')}
                      className="group flex items-center gap-2 px-4 py-3 bg-white hover:bg-gray-50 rounded-xl shadow-sm border border-gray-200 hover:border-red-400 transition-all"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-rose-600 rounded-lg flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-white text-sm">location_on</span>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{language === 'th' ? 'จุดส่ง' : 'Dropoff'}</p>
                        <p className="text-sm font-semibold text-gray-800 max-w-[120px] truncate">{bookingData.dropoffLocation}</p>
                      </div>
                      <span className="material-symbols-outlined text-gray-400 text-sm group-hover:text-red-500 transition-colors">edit</span>
                    </button>

                    {routeEditDropdown === 'dropoff' && (
                      <>
                        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setRouteEditDropdown(null)}></div>
                        <div className="fixed bottom-0 left-0 right-0 sm:absolute sm:bottom-auto sm:top-full sm:right-0 sm:left-auto sm:mt-2 sm:w-72 bg-white dark:bg-gray-800 sm:rounded-xl rounded-t-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in slide-in-from-bottom sm:fade-in sm:zoom-in-95 duration-200">
                          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-red-500 to-rose-600">
                            <div className="sm:hidden w-12 h-1 bg-white/30 rounded-full mx-auto mb-3"></div>
                            <p className="text-sm font-bold text-white uppercase tracking-wider text-center sm:text-left">{language === 'th' ? 'เลือกจุดส่ง' : 'Select Dropoff'}</p>
                          </div>
                          <div className="max-h-[50vh] sm:max-h-64 overflow-y-auto">
                            {locations.map((loc) => (
                              <button
                                key={loc.id}
                                onClick={() => {
                                  updateBooking({ dropoffLocation: language === 'th' ? loc.name?.th : loc.name?.en });
                                  setRouteEditDropdown(null);
                                }}
                                className={`w-full text-left px-4 py-4 sm:py-3 text-base sm:text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3 border-b border-gray-50 dark:border-gray-700 last:border-0 ${bookingData.dropoffLocation === (language === 'th' ? loc.name?.th : loc.name?.en) ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                              >
                                <span className="material-symbols-outlined text-red-500 text-lg">flag</span>
                                {language === 'th' ? loc.name?.th : loc.name?.en}
                                {bookingData.dropoffLocation === (language === 'th' ? loc.name?.th : loc.name?.en) && (
                                  <span className="material-symbols-outlined text-red-500 ml-auto">check_circle</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 overflow-x-auto">
                  {vehicleTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setSelectedType(type.value)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${selectedType === type.value
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                      <span className="material-symbols-outlined text-lg">{type.icon}</span>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Vehicle Grid - Finance Style Cards */}
            {filteredVehicles.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center shadow-sm">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
                  <span className="material-symbols-outlined text-4xl">directions_car</span>
                </div>
                <h3 className="text-lg font-bold text-gray-800">{language === 'th' ? 'ไม่พบรถ' : 'No vehicles found'}</h3>
                <p className="text-gray-500 mt-1">{language === 'th' ? 'ลองเปลี่ยนตัวกรองดูครับ' : 'Try adjusting your filters'}</p>
                <button
                  onClick={() => setSelectedType('all')}
                  className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-semibold hover:bg-blue-100 transition-colors"
                >
                  {language === 'th' ? 'ล้างตัวกรอง' : 'Clear Filters'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVehicles.map((vehicle) => {
                  const typeConfig = getTypeConfig(vehicle.type);
                  const dynamicPrice = getDynamicPrice(vehicle);

                  return (
                    <div
                      key={vehicle.id}
                      className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all duration-300"
                    >
                      {/* Image */}
                      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                        {vehicle.image ? (
                          <img
                            src={vehicle.image}
                            alt={vehicle.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <span className="material-symbols-outlined text-6xl">directions_car</span>
                          </div>
                        )}

                        {/* Type Badge */}
                        <div className="absolute top-3 left-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold ${typeConfig.light} ${typeConfig.text}`}>
                            <span className="material-symbols-outlined text-xs">directions_car</span>
                            {vehicle.type}
                          </span>
                        </div>

                        {/* Tag Badge */}
                        {vehicle.tag && (
                          <div className="absolute top-3 right-3">
                            <span className="px-2.5 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-lg text-[10px] uppercase font-bold shadow-lg">
                              {vehicle.tag}
                            </span>
                          </div>
                        )}

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        {/* Title */}
                        <div className="mb-3">
                          <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{vehicle.name}</h3>
                          <p className="text-sm text-gray-500 line-clamp-1">{vehicle.desc}</p>
                        </div>

                        {/* Specs */}
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                              <span className="material-symbols-outlined text-sm text-gray-500">group</span>
                            </div>
                            <span className="text-sm font-medium">{vehicle.passengers}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                              <span className="material-symbols-outlined text-sm text-gray-500">luggage</span>
                            </div>
                            <span className="text-sm font-medium">{vehicle.luggage}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                              <span className="material-symbols-outlined text-sm text-gray-500">settings</span>
                            </div>
                            <span className="text-sm font-medium">{vehicle.transmission}</span>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-100 pt-4">
                          {/* Price */}
                          <div className="flex items-end justify-between mb-4">
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                                {routePrices ? (language === 'th' ? 'ราคาเส้นทาง' : 'Route Price') : (language === 'th' ? 'เริ่มต้น' : 'Starting')}
                              </p>
                              <p className="text-2xl font-bold text-gray-800">
                                {formatPrice(dynamicPrice, vehicle.priceUSD)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold bg-emerald-50 px-2 py-1 rounded-full">
                              <span className="material-symbols-outlined text-sm">verified</span>
                              {language === 'th' ? 'รวมคนขับ' : 'Driver Included'}
                            </div>
                          </div>

                          {/* Book Button */}
                          <button
                            onClick={() => handleVehicleSelect({
                              ...vehicle,
                              price: dynamicPrice,
                              isFixedPrice: !!routePrices
                            })}
                            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group/btn"
                          >
                            <span>{language === 'th' ? 'จองเลย' : 'Book Now'}</span>
                            <span className="material-symbols-outlined text-lg group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Trip Details Modal - Premium Modern Design */}
        {isDetailsModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md"
            onClick={(e) => e.target === e.currentTarget && setIsDetailsModalOpen(false)}
          >
            <div className="bg-white dark:bg-gray-900 w-full sm:max-w-lg sm:rounded-3xl rounded-t-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 max-h-[92vh] overflow-y-auto">

              {/* Drag Handle - Mobile */}
              <div className="sm:hidden flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              </div>

              {/* Header with Gradient */}
              <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 pb-20">
                {/* Close Button */}
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white transition-all"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>

                {/* Header Content */}
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white/90 text-sm font-medium mb-3">
                    <span className="material-symbols-outlined text-lg">directions_car</span>
                    {language === 'th' ? 'ยืนยันการจอง' : 'Confirm Booking'}
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    {language === 'th' ? 'กรอกรายละเอียดการเดินทาง' : 'Enter Trip Details'}
                  </h2>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -bottom-4 left-0 right-0 h-8 bg-white dark:bg-gray-900 rounded-t-[2rem]"></div>
              </div>

              {/* Vehicle Card - Floating */}
              <div className="px-5 -mt-16 relative z-10">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4">
                  <div className="w-24 h-20 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 overflow-hidden flex-shrink-0 shadow-inner">
                    {pendingVehicle?.image ? (
                      <img src={pendingVehicle.image} alt={pendingVehicle.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-400 text-4xl">directions_car</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase rounded-md">
                        {pendingVehicle?.type || 'Sedan'}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg truncate">{pendingVehicle?.name}</h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        ฿{pendingVehicle?.price?.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-400">/{language === 'th' ? 'เที่ยว' : 'trip'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleConfirmDetails} className="p-5 pt-4 space-y-5">

                {/* Route Section - Timeline Style */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
                      <span className="material-symbols-outlined text-white text-sm">route</span>
                    </div>
                    <h3 className="font-bold text-gray-800 dark:text-white">
                      {language === 'th' ? 'เส้นทางการเดินทาง' : 'Trip Route'}
                    </h3>
                  </div>

                  {/* Visual Route */}
                  <div className="relative space-y-3 pl-1">
                    {/* Connecting Line */}
                    <div className="absolute left-[19px] top-[36px] bottom-[36px] w-0.5 bg-gradient-to-b from-emerald-400 via-blue-400 to-rose-400"></div>

                    {/* Pickup */}
                    <div className="relative">
                      <div
                        onClick={() => setActiveDropdown(activeDropdown === 'pickup' ? null : 'pickup')}
                        className={`flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-lg ${activeDropdown === 'pickup' ? 'border-emerald-400 shadow-lg shadow-emerald-500/20 scale-[1.02]' : 'border-gray-100 dark:border-gray-700 hover:border-emerald-300'}`}
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30">
                          <span className="material-symbols-outlined text-white">flight_takeoff</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider">{language === 'th' ? 'จุดรับ' : 'Pickup'}</p>
                          <p className={`font-bold text-base truncate ${tripDetails.pickupLocation ? 'text-gray-800 dark:text-white' : 'text-gray-400'}`}>
                            {tripDetails.pickupLocation || (language === 'th' ? 'แตะเพื่อเลือก' : 'Tap to select')}
                          </p>
                        </div>
                        <span className={`material-symbols-outlined transition-transform ${activeDropdown === 'pickup' ? 'rotate-180 text-emerald-500' : 'text-gray-400'}`}>expand_more</span>
                      </div>

                      {/* Pickup Dropdown */}
                      {activeDropdown === 'pickup' && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl max-h-52 overflow-y-auto z-30 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="p-2">
                            {locations.map((location) => (
                              <button
                                key={location.id}
                                type="button"
                                onClick={() => {
                                  setTripDetails({ ...tripDetails, pickupLocation: location.name[language] });
                                  setActiveDropdown(null);
                                }}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-3 ${tripDetails.pickupLocation === location.name[language] ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                              >
                                <span className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                                  <span className="material-symbols-outlined text-emerald-500 text-lg">location_on</span>
                                </span>
                                {location.name[language]}
                                {tripDetails.pickupLocation === location.name[language] && (
                                  <span className="material-symbols-outlined text-emerald-500 ml-auto">check_circle</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Dropoff */}
                    <div className="relative">
                      <div
                        onClick={() => setActiveDropdown(activeDropdown === 'dropoff' ? null : 'dropoff')}
                        className={`flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-lg ${activeDropdown === 'dropoff' ? 'border-rose-400 shadow-lg shadow-rose-500/20 scale-[1.02]' : 'border-gray-100 dark:border-gray-700 hover:border-rose-300'}`}
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-rose-400 to-red-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-500/30">
                          <span className="material-symbols-outlined text-white">flag</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-rose-600 dark:text-rose-400 uppercase font-bold tracking-wider">{language === 'th' ? 'จุดส่ง' : 'Dropoff'}</p>
                          <p className={`font-bold text-base truncate ${tripDetails.dropoffLocation ? 'text-gray-800 dark:text-white' : 'text-gray-400'}`}>
                            {tripDetails.dropoffLocation || (language === 'th' ? 'แตะเพื่อเลือก' : 'Tap to select')}
                          </p>
                        </div>
                        <span className={`material-symbols-outlined transition-transform ${activeDropdown === 'dropoff' ? 'rotate-180 text-rose-500' : 'text-gray-400'}`}>expand_more</span>
                      </div>

                      {/* Dropoff Dropdown */}
                      {activeDropdown === 'dropoff' && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl max-h-52 overflow-y-auto z-30 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="p-2">
                            {locations.map((location) => (
                              <button
                                key={location.id}
                                type="button"
                                onClick={() => {
                                  setTripDetails({ ...tripDetails, dropoffLocation: location.name[language] });
                                  setActiveDropdown(null);
                                }}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-3 ${tripDetails.dropoffLocation === location.name[language] ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                              >
                                <span className="w-8 h-8 bg-rose-100 dark:bg-rose-900/30 rounded-lg flex items-center justify-center">
                                  <span className="material-symbols-outlined text-rose-500 text-lg">flag</span>
                                </span>
                                {location.name[language]}
                                {tripDetails.dropoffLocation === location.name[language] && (
                                  <span className="material-symbols-outlined text-rose-500 ml-auto">check_circle</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Date & Time Section - Modern Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-4 border border-amber-100 dark:border-amber-800/30">
                    <label htmlFor="tripPickupDate" className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/30">
                        <span className="material-symbols-outlined text-white text-sm">calendar_month</span>
                      </div>
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                        {language === 'th' ? 'วันที่' : 'Date'}
                      </span>
                    </label>
                    <input
                      id="tripPickupDate"
                      name="tripPickupDate"
                      type="date"
                      autoComplete="off"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-0 py-1 bg-transparent border-0 font-bold text-gray-800 dark:text-white outline-none text-lg"
                      value={tripDetails.pickupDate}
                      onChange={(e) => setTripDetails({ ...tripDetails, pickupDate: e.target.value })}
                    />
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800/30">
                    <label htmlFor="tripPickupTime" className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <span className="material-symbols-outlined text-white text-sm">schedule</span>
                      </div>
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                        {language === 'th' ? 'เวลา' : 'Time'}
                      </span>
                    </label>
                    <input
                      id="tripPickupTime"
                      name="tripPickupTime"
                      type="time"
                      autoComplete="off"
                      required
                      className="w-full px-0 py-1 bg-transparent border-0 font-bold text-gray-800 dark:text-white outline-none text-lg"
                      value={tripDetails.pickupTime}
                      onChange={(e) => setTripDetails({ ...tripDetails, pickupTime: e.target.value })}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsDetailsModalOpen(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                  >
                    {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={!tripDetails.pickupLocation || !tripDetails.dropoffLocation}
                    className="flex-[1.5] py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="text-lg">{language === 'th' ? 'ยืนยันการจอง' : 'Confirm Booking'}</span>
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                </div>

                {/* Trust Badges - Modern Style */}
                <div className="flex items-center justify-center gap-6 pt-3 pb-2">
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-emerald-500 text-sm">verified</span>
                    </div>
                    <span className="text-xs font-medium">{language === 'th' ? 'คนขับมืออาชีพ' : 'Pro Driver'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-blue-500 text-sm">shield</span>
                    </div>
                    <span className="text-xs font-medium">{language === 'th' ? 'ปลอดภัย 100%' : '100% Safe'}</span>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
