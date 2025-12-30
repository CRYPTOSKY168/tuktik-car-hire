'use client';

import { useState, useEffect } from 'react';

// Vehicle data
const vehicles = [
  { id: 'eco', name: 'Economy', desc: 'Vios, City, Yaris', icon: '🚗', passengers: 4, luggage: 2, eta: '2-4', price: 850, popular: false },
  { id: 'comfort', name: 'Comfort', desc: 'Camry, Accord, Altis', icon: '🚙', passengers: 4, luggage: 3, eta: '3-5', price: 1200, popular: true },
  { id: 'suv', name: 'SUV', desc: 'Fortuner, CR-V, X-Trail', icon: '🚐', passengers: 6, luggage: 4, eta: '5-8', price: 1500, popular: false },
  { id: 'premium', name: 'Premium', desc: 'Mercedes E, BMW 5', icon: '✨', passengers: 4, luggage: 2, eta: '8-12', price: 3500, tier: 'luxury', popular: false },
  { id: 'van', name: 'Van', desc: 'Hiace, Commuter', icon: '🚌', passengers: 10, luggage: 8, eta: '10-15', price: 2000, popular: false },
  { id: 'vip', name: 'VIP', desc: 'Alphard, Vellfire', icon: '👑', passengers: 6, luggage: 4, eta: '12-18', price: 4500, tier: 'luxury', popular: false },
];

export default function VehiclesTest2Page() {
  const [selectedVehicle, setSelectedVehicle] = useState(vehicles[1]);
  const [activeTab, setActiveTab] = useState('book');
  const [isLoading, setIsLoading] = useState(false);
  const [showVehicleDetail, setShowVehicleDetail] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleBook = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert('จองสำเร็จ! 🎉');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] max-w-md mx-auto relative overflow-hidden">
      {/* ============================================ */}
      {/* BACKGROUND - Animated Gradient */}
      {/* ============================================ */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -left-20 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 right-0 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* ============================================ */}
      {/* STATUS BAR (Fake iOS Style) */}
      {/* ============================================ */}
      <div className="relative z-50 flex justify-between items-center px-6 py-2 text-white/80 text-sm">
        <span className="font-semibold">{currentTime}</span>
        <div className="absolute left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-b-3xl" /> {/* Dynamic Island */}
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3C7.46 3 3.34 4.78.29 7.67c-.18.18-.29.43-.29.71 0 .28.11.53.29.71l2.48 2.48c.18.18.43.29.71.29.27 0 .52-.11.7-.28.79-.74 1.69-1.36 2.66-1.85.33-.16.56-.5.56-.9v-3.1c1.45-.48 3-.73 4.6-.73s3.15.25 4.6.73v3.1c0 .4.23.74.56.9.98.49 1.87 1.12 2.67 1.85.18.18.43.28.7.28.28 0 .53-.11.71-.29l2.48-2.48c.18-.18.29-.43.29-.71 0-.28-.11-.53-.29-.71C20.66 4.78 16.54 3 12 3z"/></svg>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
          <div className="flex items-center">
            <div className="w-6 h-3 border border-white/80 rounded-sm relative">
              <div className="absolute inset-0.5 bg-green-400 rounded-sm" style={{ width: '80%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      <header className="relative z-40 px-5 pt-2 pb-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">TukTik</h1>
              <p className="text-white/50 text-xs">Premium Transfer</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Notification */}
            <button className="relative w-10 h-10 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center border border-white/10">
              <span className="material-symbols-rounded text-white/80">notifications</span>
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">3</span>
            </button>

            {/* Profile */}
            <button className="w-10 h-10 rounded-xl overflow-hidden border-2 border-purple-500/50 shadow-lg shadow-purple-500/20">
              <div className="w-full h-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold">
                P
              </div>
            </button>
          </div>
        </div>

        {/* Greeting */}
        <div className="mt-4">
          <p className="text-white/60 text-sm">สวัสดีตอนเย็น 👋</p>
          <h2 className="text-white text-xl font-bold">จะไปไหนวันนี้?</h2>
        </div>
      </header>

      {/* ============================================ */}
      {/* MAIN CONTENT */}
      {/* ============================================ */}
      <main className="relative z-30 px-5 pb-32">

        {/* -------- Route Card -------- */}
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl p-5 border border-white/10 shadow-2xl">
          {/* From */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center">
                <div className="w-4 h-4 bg-green-500 rounded-full shadow-lg shadow-green-500/50" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-white/50 text-xs uppercase tracking-wider">จุดรับ</p>
              <p className="text-white font-semibold">สนามบินสุวรรณภูมิ (BKK)</p>
              <p className="text-white/40 text-xs">Terminal 1, Gate 3</p>
            </div>
            <button className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
              <span className="material-symbols-rounded text-white/60 text-sm">edit</span>
            </button>
          </div>

          {/* Divider with swap button */}
          <div className="relative my-4 flex items-center">
            <div className="flex-1 border-t border-dashed border-white/20" />
            <button className="mx-3 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30 hover:scale-110 transition-transform">
              <span className="material-symbols-rounded text-white">swap_vert</span>
            </button>
            <div className="flex-1 border-t border-dashed border-white/20" />
          </div>

          {/* To */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center">
                <div className="w-4 h-4 bg-red-500 rounded-full shadow-lg shadow-red-500/50" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-white/50 text-xs uppercase tracking-wider">จุดส่ง</p>
              <p className="text-white font-semibold">กรุงเทพฯ สุขุมวิท</p>
              <p className="text-white/40 text-xs">Asok, Terminal 21</p>
            </div>
            <button className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
              <span className="material-symbols-rounded text-white/60 text-sm">edit</span>
            </button>
          </div>

          {/* Schedule */}
          <div className="mt-5 flex gap-3">
            <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 rounded-2xl border border-white/10">
              <span className="material-symbols-rounded text-blue-400">calendar_today</span>
              <span className="text-white/80 text-sm">วันนี้</span>
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 rounded-2xl border border-white/10">
              <span className="material-symbols-rounded text-purple-400">schedule</span>
              <span className="text-white/80 text-sm">ตอนนี้</span>
            </button>
          </div>
        </div>

        {/* -------- Vehicle Selection -------- */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-lg">เลือกรถ</h3>
            <button className="text-blue-400 text-sm flex items-center gap-1">
              ดูทั้งหมด
              <span className="material-symbols-rounded text-sm">chevron_right</span>
            </button>
          </div>

          {/* Vehicle Cards - Horizontal Scroll */}
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-5 px-5 scrollbar-hide">
            {vehicles.map((vehicle) => {
              const isSelected = selectedVehicle.id === vehicle.id;
              const isLuxury = vehicle.tier === 'luxury';

              return (
                <button
                  key={vehicle.id}
                  onClick={() => setSelectedVehicle(vehicle)}
                  className={`relative flex-shrink-0 w-28 p-4 rounded-3xl border transition-all duration-300 ${
                    isSelected
                      ? isLuxury
                        ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/50 shadow-lg shadow-amber-500/20 scale-105'
                        : 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/50 shadow-lg shadow-blue-500/20 scale-105'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {/* Popular badge */}
                  {vehicle.popular && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full">
                      <span className="text-[10px] text-white font-bold">POPULAR</span>
                    </div>
                  )}

                  {/* Luxury badge */}
                  {isLuxury && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full">
                      <span className="text-[10px] text-white font-bold">VIP</span>
                    </div>
                  )}

                  <div className="flex flex-col items-center text-center">
                    <span className="text-3xl mb-2">{vehicle.icon}</span>
                    <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-white/70'}`}>
                      {vehicle.name}
                    </span>
                    <span className={`text-lg font-bold mt-1 ${
                      isSelected
                        ? isLuxury ? 'text-amber-400' : 'text-blue-400'
                        : 'text-white/50'
                    }`}>
                      ฿{vehicle.price.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-white/40 mt-1">
                      {vehicle.eta} นาที
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* -------- Selected Vehicle Detail -------- */}
        <div className={`mt-2 p-5 rounded-3xl border transition-all duration-500 ${
          selectedVehicle.tier === 'luxury'
            ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30'
            : 'bg-white/5 border-white/10'
        }`}>
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl ${
              selectedVehicle.tier === 'luxury'
                ? 'bg-gradient-to-br from-amber-500/30 to-orange-500/30'
                : 'bg-gradient-to-br from-blue-500/30 to-purple-500/30'
            }`}>
              {selectedVehicle.icon}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-white font-bold text-lg">{selectedVehicle.name}</h4>
                {selectedVehicle.tier === 'luxury' && (
                  <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full text-[10px] text-white font-bold">
                    PREMIUM
                  </span>
                )}
              </div>
              <p className="text-white/50 text-sm">{selectedVehicle.desc}</p>

              {/* Specs */}
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-rounded text-white/40 text-sm">person</span>
                  <span className="text-white/60 text-xs">{selectedVehicle.passengers}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-rounded text-white/40 text-sm">luggage</span>
                  <span className="text-white/60 text-xs">{selectedVehicle.luggage}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-rounded text-green-400 text-sm">schedule</span>
                  <span className="text-green-400 text-xs">{selectedVehicle.eta} นาที</span>
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="text-right">
              <p className={`text-2xl font-bold ${
                selectedVehicle.tier === 'luxury' ? 'text-amber-400' : 'text-white'
              }`}>
                ฿{selectedVehicle.price.toLocaleString()}
              </p>
              <p className="text-white/40 text-xs">รวมทุกอย่าง</p>
            </div>
          </div>

          {/* Features */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
            <span className="px-3 py-1.5 bg-white/5 rounded-full text-xs text-white/60 flex items-center gap-1">
              <span className="material-symbols-rounded text-green-400 text-sm">check_circle</span>
              คนขับมืออาชีพ
            </span>
            <span className="px-3 py-1.5 bg-white/5 rounded-full text-xs text-white/60 flex items-center gap-1">
              <span className="material-symbols-rounded text-green-400 text-sm">check_circle</span>
              รวมค่าทางด่วน
            </span>
            <span className="px-3 py-1.5 bg-white/5 rounded-full text-xs text-white/60 flex items-center gap-1">
              <span className="material-symbols-rounded text-green-400 text-sm">check_circle</span>
              ยกเลิกฟรี
            </span>
            {selectedVehicle.tier === 'luxury' && (
              <span className="px-3 py-1.5 bg-amber-500/20 rounded-full text-xs text-amber-400 flex items-center gap-1">
                <span className="material-symbols-rounded text-sm">star</span>
                VIP Service
              </span>
            )}
          </div>
        </div>

        {/* -------- Promo Code -------- */}
        <button className="mt-4 w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <span className="material-symbols-rounded text-white">local_offer</span>
            </div>
            <div className="text-left">
              <p className="text-white font-medium text-sm">ใช้โค้ดส่วนลด</p>
              <p className="text-purple-400 text-xs">FIRST20 - ลด 20%</p>
            </div>
          </div>
          <span className="material-symbols-rounded text-white/40">chevron_right</span>
        </button>

        {/* -------- Payment Summary -------- */}
        <div className="mt-4 p-5 bg-white/5 rounded-3xl border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/60">ค่าโดยสาร</span>
            <span className="text-white">฿{selectedVehicle.price.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/60">ค่าทางด่วน</span>
            <span className="text-green-400">รวมแล้ว</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/60">ส่วนลด (FIRST20)</span>
            <span className="text-red-400">-฿{Math.round(selectedVehicle.price * 0.2).toLocaleString()}</span>
          </div>
          <div className="border-t border-white/10 pt-3 mt-3">
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-lg">รวมทั้งหมด</span>
              <span className={`text-2xl font-bold ${
                selectedVehicle.tier === 'luxury' ? 'text-amber-400' : 'text-white'
              }`}>
                ฿{Math.round(selectedVehicle.price * 0.8).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* -------- Book Button -------- */}
        <button
          onClick={handleBook}
          disabled={isLoading}
          className={`mt-6 w-full py-5 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
            selectedVehicle.tier === 'luxury'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xl shadow-amber-500/30'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-2xl shadow-purple-500/30'
          } ${isLoading ? 'opacity-70 scale-98' : 'hover:scale-[1.02] active:scale-98'}`}
        >
          {isLoading ? (
            <>
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              กำลังค้นหาคนขับ...
            </>
          ) : (
            <>
              <span className="material-symbols-rounded">directions_car</span>
              จองเลย
            </>
          )}
        </button>

        {/* Safety note */}
        <p className="text-center text-white/30 text-xs mt-4 flex items-center justify-center gap-2">
          <span className="material-symbols-rounded text-sm">verified_user</span>
          คนขับผ่านการตรวจสอบ • ประกันภัยครอบคลุม
        </p>
      </main>

      {/* ============================================ */}
      {/* BOTTOM NAVIGATION */}
      {/* ============================================ */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto">
        {/* Glassmorphism background */}
        <div className="absolute inset-0 bg-[#0a0a0f]/80 backdrop-blur-2xl border-t border-white/10" />

        <div className="relative flex items-center justify-around py-4 px-6">
          {[
            { id: 'home', icon: 'home', label: 'หน้าแรก' },
            { id: 'book', icon: 'local_taxi', label: 'จองรถ' },
            { id: 'history', icon: 'history', label: 'ประวัติ' },
            { id: 'profile', icon: 'person', label: 'โปรไฟล์' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 transition-all ${
                  isActive ? 'scale-110' : 'opacity-50'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-purple-500/30'
                    : ''
                }`}>
                  <span className={`material-symbols-rounded ${isActive ? 'text-white' : 'text-white/50'}`}>
                    {tab.icon}
                  </span>
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-white' : 'text-white/50'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Home indicator (iPhone style) */}
        <div className="flex justify-center pb-2">
          <div className="w-32 h-1 bg-white/30 rounded-full" />
        </div>
      </nav>
    </div>
  );
}
