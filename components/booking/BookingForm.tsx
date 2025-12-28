'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBooking } from '@/lib/contexts/BookingContext';
import { useLanguage } from '@/lib/contexts/LanguageContext';

export default function BookingForm() {
  const router = useRouter();
  const { bookingData, updateBooking, locations, routes } = useBooking();
  const { t, language } = useLanguage();
  const modalRef = useRef<HTMLDivElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    pickupLocation: bookingData.pickupLocation || '',
    dropoffLocation: bookingData.dropoffLocation || '',
    pickupDate: bookingData.pickupDate || '',
    pickupTime: bookingData.pickupTime || '10:00',
    tripType: bookingData.tripType || 'oneWay',
    vehicleType: '',
  });

  // UI State
  const [activeTab, setActiveTab] = useState<'oneWay' | 'roundTrip'>('oneWay');
  const [activeModal, setActiveModal] = useState<'pickup' | 'dropoff' | 'date' | 'time' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Generate time slots (6:00 - 23:00)
  const timeSlots = Array.from({ length: 18 }, (_, i) => {
    const hour = (i + 6).toString().padStart(2, '0');
    return `${hour}:00`;
  });

  // Generate next 30 days for date picker
  const getDateOptions = () => {
    const dates = [];
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);
      dates.push({
        value: date.toISOString().split('T')[0],
        label: date.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
        isToday: i === 0,
        isTomorrow: i === 1,
      });
    }
    return dates;
  };

  // Helpers
  const today = new Date().toISOString().split('T')[0];

  // Filter Logic - Show all locations if no routes configured
  const getFilteredLocations = (query: string, type: 'pickup' | 'dropoff') => {
    let filtered = locations;

    // Only apply route filtering if routes exist
    if (routes.length > 0) {
      if (type === 'pickup') {
        const validOrigins = new Set(routes.map((r: any) => r.originId));
        // Only filter if we have valid origins
        if (validOrigins.size > 0) {
          const routeFiltered = filtered.filter(l => validOrigins.has(l.id));
          // Use filtered results only if not empty
          if (routeFiltered.length > 0) {
            filtered = routeFiltered;
          }
        }
      } else if (type === 'dropoff' && formData.pickupLocation) {
        const pickupLoc = locations.find(l => l.name?.en === formData.pickupLocation || l.name?.th === formData.pickupLocation);
        if (pickupLoc) {
          const validDestinations = new Set(routes
            .filter((r: any) => r.originId === pickupLoc.id)
            .map((r: any) => r.destinationId));
          if (validDestinations.size > 0) {
            const routeFiltered = filtered.filter(l => validDestinations.has(l.id));
            // Use filtered results only if not empty
            if (routeFiltered.length > 0) {
              filtered = routeFiltered;
            }
          }
        }
      }
    }

    if (!query) return filtered;
    const lowerQuery = query.toLowerCase();
    return filtered.filter(l =>
      l.name && l.name[language] && l.name[language].toLowerCase().includes(lowerQuery)
    );
  };

  const handleSelectLocation = (field: 'pickupLocation' | 'dropoffLocation', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setActiveModal(null);
    setSearchQuery('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            const shortName = data.display_name ? data.display_name.split(',')[0] + " (Current)" : `Current (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;
            setFormData(prev => ({ ...prev, pickupLocation: shortName }));
            setActiveModal(null);
          } catch (e) {
            setFormData(prev => ({ ...prev, pickupLocation: `Current Location` }));
            setActiveModal(null);
          }
        },
        (error) => alert('Error: ' + error.message)
      );
    } else {
      alert("Geolocation not supported");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pickupLocation || !formData.dropoffLocation) {
      alert("Please select pick-up and drop-off locations");
      return;
    }
    updateBooking({
      pickupLocation: formData.pickupLocation,
      dropoffLocation: formData.dropoffLocation,
      pickupDate: formData.pickupDate,
      pickupTime: formData.pickupTime,
      tripType: activeTab,
    });
    router.push('/vehicles');
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setActiveModal(null);
        setSearchQuery('');
      }
    };
    if (activeModal) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeModal]);

  const getLocationTypeIcon = (type: string) => {
    switch (type) {
      case 'airport': return 'flight';
      case 'city': return 'location_city';
      case 'province': return 'map';
      default: return 'location_on';
    }
  };

  const getLocationTypeColor = (type: string) => {
    switch (type) {
      case 'airport': return { bg: 'bg-purple-100', text: 'text-purple-600', gradient: 'from-purple-500 to-indigo-600' };
      case 'city': return { bg: 'bg-blue-100', text: 'text-blue-600', gradient: 'from-blue-500 to-blue-600' };
      case 'province': return { bg: 'bg-orange-100', text: 'text-orange-600', gradient: 'from-orange-500 to-amber-600' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-600', gradient: 'from-gray-500 to-gray-600' };
    }
  };

  return (
    <div className="w-full">
      {/* Tab Switcher */}
      <div className="flex justify-center mb-6">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-1 inline-flex border border-white/20">
          <button
            type="button"
            onClick={() => setActiveTab('oneWay')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'oneWay'
                ? 'bg-white text-blue-600 shadow-lg'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
            {t.home.booking.oneWay}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roundTrip')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'roundTrip'
                ? 'bg-white text-blue-600 shadow-lg'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="material-symbols-outlined text-lg">sync_alt</span>
            {t.home.booking.roundTrip}
          </button>
        </div>
      </div>

      {/* Main Booking Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row gap-4">

            {/* Locations Section */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Pickup Location */}
              <div
                onClick={() => setActiveModal('pickup')}
                className="group cursor-pointer"
              >
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  {t.home.booking.pickupLocation}
                </label>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border-2 border-transparent hover:border-blue-500/30 transition-all group-hover:bg-blue-50/50">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <span className="material-symbols-outlined text-white text-xl">trip_origin</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold truncate ${formData.pickupLocation ? 'text-gray-800' : 'text-gray-400'}`}>
                      {formData.pickupLocation || t.home.booking.selectLocation}
                    </p>
                    <p className="text-xs text-gray-400">{language === 'th' ? 'คลิกเพื่อเลือก' : 'Click to select'}</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-300 group-hover:text-blue-500 transition-colors">chevron_right</span>
                </div>
              </div>

              {/* Dropoff Location */}
              <div
                onClick={() => setActiveModal('dropoff')}
                className="group cursor-pointer"
              >
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  {t.home.booking.dropoffLocation}
                </label>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border-2 border-transparent hover:border-orange-500/30 transition-all group-hover:bg-orange-50/50">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                    <span className="material-symbols-outlined text-white text-xl">location_on</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold truncate ${formData.dropoffLocation ? 'text-gray-800' : 'text-gray-400'}`}>
                      {formData.dropoffLocation || t.home.booking.selectLocation}
                    </p>
                    <p className="text-xs text-gray-400">{language === 'th' ? 'คลิกเพื่อเลือก' : 'Click to select'}</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-300 group-hover:text-orange-500 transition-colors">chevron_right</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden lg:flex items-center">
              <div className="w-px h-24 bg-gray-200"></div>
            </div>

            {/* Date/Time & Search */}
            <div className="flex flex-col sm:flex-row gap-4 lg:w-auto">
              {/* Date & Time */}
              <div className="flex gap-3">
                {/* Date Picker - Click to open modal */}
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    {t.home.booking.pickupDate}
                  </label>
                  <div
                    onClick={() => setActiveModal('date')}
                    className="p-4 bg-gray-50 rounded-xl border-2 border-transparent hover:border-emerald-500/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <span className="material-symbols-outlined text-white text-lg">calendar_today</span>
                      </div>
                      <div className="flex-1">
                        <p className={`font-bold ${formData.pickupDate ? 'text-gray-800' : 'text-gray-400'}`}>
                          {formData.pickupDate
                            ? new Date(formData.pickupDate).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                            : (language === 'th' ? 'เลือกวัน' : 'Select date')}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-gray-300 group-hover:text-emerald-500">expand_more</span>
                    </div>
                  </div>
                  {/* Hidden native input for form validation */}
                  <input type="hidden" name="pickupDate" value={formData.pickupDate} required />
                </div>

                {/* Time Picker - Click to open modal */}
                <div className="w-32">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    {t.home.booking.pickupTime}
                  </label>
                  <div
                    onClick={() => setActiveModal('time')}
                    className="p-4 bg-gray-50 rounded-xl border-2 border-transparent hover:border-purple-500/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <span className="material-symbols-outlined text-white text-lg">schedule</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">{formData.pickupTime}</p>
                      </div>
                      <span className="material-symbols-outlined text-gray-300 group-hover:text-purple-500">expand_more</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search Button */}
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto h-[72px] px-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-xl">search</span>
                  <span>{language === 'th' ? 'ค้นหา' : 'Search'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Info Bar */}
        <div className="px-4 lg:px-6 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-100">
          <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-8 text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <span className="material-symbols-outlined text-emerald-500 text-lg">verified</span>
              <span>{language === 'th' ? 'ยืนยันทันที' : 'Instant Confirmation'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <span className="material-symbols-outlined text-blue-500 text-lg">payments</span>
              <span>{language === 'th' ? 'ราคาคงที่' : 'Fixed Price'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <span className="material-symbols-outlined text-purple-500 text-lg">support_agent</span>
              <span>{language === 'th' ? 'ซัพพอร์ต 24/7' : '24/7 Support'}</span>
            </div>
          </div>
        </div>
      </form>

      {/* Location Selection Modal */}
      {(activeModal === 'pickup' || activeModal === 'dropoff') && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-4">
          <div
            ref={modalRef}
            className="bg-white w-full lg:max-w-xl lg:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] lg:max-h-[600px] overflow-hidden animate-in slide-in-from-bottom lg:zoom-in-95 duration-300"
          >
            {/* Modal Header */}
            <div className={`px-6 py-4 bg-gradient-to-r ${activeModal === 'pickup' ? 'from-blue-600 to-indigo-600' : 'from-orange-500 to-amber-600'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {activeModal === 'pickup' ? t.home.booking.pickupLocation : t.home.booking.dropoffLocation}
                  </h3>
                  <p className="text-white/70 text-sm">
                    {language === 'th' ? 'เลือกสถานที่' : 'Select a location'}
                  </p>
                </div>
                <button
                  onClick={() => { setActiveModal(null); setSearchQuery(''); }}
                  className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-white">close</span>
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                <input
                  type="text"
                  autoFocus
                  placeholder={language === 'th' ? 'ค้นหาสถานที่...' : 'Search locations...'}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {activeModal === 'pickup' && (
                <button
                  onClick={handleCurrentLocation}
                  className="mt-3 flex items-center gap-2 text-blue-600 text-sm font-bold hover:text-blue-700 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600 text-lg">my_location</span>
                  </div>
                  {language === 'th' ? 'ใช้ตำแหน่งปัจจุบัน' : 'Use current location'}
                </button>
              )}
            </div>

            {/* Location List */}
            <div className="flex-1 overflow-y-auto p-2">
              {getFilteredLocations(searchQuery, activeModal).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <span className="material-symbols-outlined text-5xl mb-3">search_off</span>
                  <p className="font-medium">{language === 'th' ? 'ไม่พบสถานที่' : 'No locations found'}</p>
                </div>
              ) : (
                getFilteredLocations(searchQuery, activeModal).map((loc) => {
                  const typeColor = getLocationTypeColor(loc.type);
                  return (
                    <div
                      key={loc.id}
                      onClick={() => handleSelectLocation(activeModal === 'pickup' ? 'pickupLocation' : 'dropoffLocation', loc.name[language])}
                      className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors group"
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${typeColor.gradient} flex items-center justify-center shadow-lg`}>
                        <span className="material-symbols-outlined text-white text-xl">
                          {getLocationTypeIcon(loc.type)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{loc.name[language]}</p>
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">{loc.type}</p>
                      </div>
                      <span className="material-symbols-outlined text-gray-300 group-hover:text-blue-500 transition-colors">arrow_forward</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Date Picker Modal */}
      {activeModal === 'date' && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-4">
          <div
            ref={modalRef}
            className="bg-white w-full lg:max-w-md lg:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col max-h-[70vh] lg:max-h-[500px] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-green-600">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{t.home.booking.pickupDate}</h3>
                  <p className="text-white/70 text-sm">{language === 'th' ? 'เลือกวันเดินทาง' : 'Select travel date'}</p>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-white">close</span>
                </button>
              </div>
            </div>

            {/* Date List */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-2 gap-2">
                {getDateOptions().map((date) => (
                  <button
                    key={date.value}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, pickupDate: date.value }));
                      setActiveModal(null);
                    }}
                    className={`p-4 rounded-xl text-left transition-all ${
                      formData.pickupDate === date.value
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30'
                        : 'bg-gray-50 hover:bg-emerald-50 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold">{date.label}</p>
                        {date.isToday && (
                          <span className={`text-xs font-bold ${formData.pickupDate === date.value ? 'text-white/80' : 'text-emerald-600'}`}>
                            {language === 'th' ? 'วันนี้' : 'Today'}
                          </span>
                        )}
                        {date.isTomorrow && (
                          <span className={`text-xs font-bold ${formData.pickupDate === date.value ? 'text-white/80' : 'text-emerald-600'}`}>
                            {language === 'th' ? 'พรุ่งนี้' : 'Tomorrow'}
                          </span>
                        )}
                      </div>
                      {formData.pickupDate === date.value && (
                        <span className="material-symbols-outlined">check_circle</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time Picker Modal */}
      {activeModal === 'time' && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-4">
          <div
            ref={modalRef}
            className="bg-white w-full lg:max-w-md lg:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col max-h-[70vh] lg:max-h-[500px] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-purple-500 to-violet-600">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{t.home.booking.pickupTime}</h3>
                  <p className="text-white/70 text-sm">{language === 'th' ? 'เลือกเวลารับ' : 'Select pickup time'}</p>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-white">close</span>
                </button>
              </div>
            </div>

            {/* Time Slots */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, pickupTime: time }));
                      setActiveModal(null);
                    }}
                    className={`p-4 rounded-xl text-center transition-all ${
                      formData.pickupTime === time
                        ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-gray-50 hover:bg-purple-50 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-lg">schedule</span>
                      <span className="font-bold">{time}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
