'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import NotificationBell from '@/components/notifications/NotificationBell';

// LINE Official Account ID
const LINE_ID = '@tuktik';

export default function Header() {
  const { t, language, setLanguage } = useLanguage();
  const { user, signOut, isAdmin, isApprovedDriver } = useAuth();
  const { currency, toggleCurrency } = useCurrency();
  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Navigation links (memoized to prevent recreations)
  const navLinks = useMemo(() => [
    { name: t.nav.home, path: '/', icon: 'home' },
    { name: t.nav.vehicles, path: '/vehicles', icon: 'directions_car' },
    { name: t.nav.services, path: '/services', icon: 'concierge' },
    { name: language === 'th' ? 'เกี่ยวกับเรา' : 'About', path: '/about', icon: 'info' },
    { name: t.nav.contact, path: '/contact', icon: 'support_agent' },
  ], [t, language]);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle outside click for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Improved isActive to handle sub-routes (memoized)
  const isActive = useCallback((path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(path) || false;
  }, [pathname]);

  // Open LINE chat
  const openLineChat = () => {
    window.open(`https://line.me/R/ti/p/${LINE_ID}`, '_blank');
  };

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ease-in-out ${isScrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-lg shadow-gray-200/50 border-b border-gray-100 py-2'
          : 'bg-gradient-to-b from-black/50 to-transparent py-4'
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-white text-2xl">local_taxi</span>
              </div>
              <div className="flex flex-col">
                <h2 className={`text-xl font-black leading-tight tracking-tight transition-colors ${isScrolled ? 'text-gray-800' : 'text-white'
                  }`}>
                  TukTik
                </h2>
                <span className={`text-[10px] uppercase font-bold tracking-widest ${isScrolled ? 'text-gray-400' : 'text-white/70'
                  }`}>
                  Premium Transfer
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1 rounded-2xl p-1.5 transition-all duration-300 bg-white/95 backdrop-blur-lg shadow-lg border border-gray-200/50">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`relative px-3 xl:px-4 py-2.5 rounded-xl text-xs xl:text-sm font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${isActive(link.path)
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <span className="material-symbols-outlined text-lg">{link.icon}</span>
                  <span className="hidden xl:inline">{link.name}</span>
                </Link>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="hidden md:flex items-center gap-2">

              {/* LINE Quick Contact */}
              <button
                onClick={openLineChat}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all bg-[#00B900] text-white hover:bg-[#00a000] shadow-lg shadow-green-500/20"
                title="LINE"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                </svg>
                <span className="hidden xl:inline">{language === 'th' ? 'แชท' : 'Chat'}</span>
              </button>

              {/* Currency Toggle */}
              <button
                onClick={toggleCurrency}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
              >
                <span className="text-sm">{currency === 'THB' ? '🇹🇭' : '🇺🇸'}</span>
                <span>{currency}</span>
              </button>

              {/* Language Toggle */}
              <div className="flex p-0.5 rounded-xl bg-gray-100 border border-gray-200">
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all ${language === 'en'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage('th')}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all ${language === 'th'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  TH
                </button>
              </div>

              {/* Notification Bell */}
              {user && <NotificationBell />}

              {/* Divider */}
              <div className="w-px h-8 bg-gray-200"></div>

              {/* User Auth */}
              {!user ? (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className={`text-sm font-bold transition-colors px-3 py-2 rounded-xl ${isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}
                  >
                    {t.auth.login}
                  </Link>
                  <Link
                    href="/vehicles"
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    <span className="material-symbols-outlined text-lg">directions_car</span>
                    <span>{language === 'th' ? 'จองเลย' : 'Book Now'}</span>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {/* Book Now CTA for logged-in users */}
                  <Link
                    href="/vehicles"
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 transition-all hover:-translate-y-0.5"
                  >
                    <span className="material-symbols-outlined text-lg">add</span>
                    <span className="hidden xl:inline">{language === 'th' ? 'จองใหม่' : 'New Booking'}</span>
                  </Link>

                  {/* User Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl transition-all bg-gray-50 hover:bg-gray-100 border border-gray-200"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="" className="w-full h-full rounded-lg object-cover" />
                        ) : (
                          user.displayName?.charAt(0) || user.email?.[0].toUpperCase()
                        )}
                      </div>
                      <span className="material-symbols-outlined text-base text-gray-500">
                        {userDropdownOpen ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>

                    {/* Enhanced Dropdown Menu */}
                    {userDropdownOpen && (
                      <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 fade-in duration-200">
                        {/* User Info Header */}
                        <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                              {user.photoURL ? (
                                <img src={user.photoURL} alt="" className="w-full h-full rounded-xl object-cover" />
                              ) : (
                                user.displayName?.charAt(0) || user.email?.[0].toUpperCase()
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-white truncate">{user.displayName || 'Member'}</p>
                              <p className="text-xs text-blue-100 truncate">{user.email}</p>
                            </div>
                          </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 border-b border-gray-100">
                          <div className="text-center p-2 bg-white rounded-lg">
                            <p className="text-lg font-bold text-blue-600">0</p>
                            <p className="text-xs text-gray-500">{language === 'th' ? 'งานจอง' : 'Bookings'}</p>
                          </div>
                          <div className="text-center p-2 bg-white rounded-lg">
                            <p className="text-lg font-bold text-emerald-600">0</p>
                            <p className="text-xs text-gray-500">{language === 'th' ? 'คะแนน' : 'Points'}</p>
                          </div>
                        </div>

                        {/* Menu Items */}
                        <div className="p-2">
                          {/* Admin Panel Link - Only for admins */}
                          {isAdmin && (
                            <Link
                              href="/admin"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                                <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-sm">{language === 'th' ? 'แอดมิน' : 'Admin Panel'}</p>
                                <p className="text-xs text-gray-400">{language === 'th' ? 'จัดการระบบ' : 'System management'}</p>
                              </div>
                              <span className="material-symbols-outlined text-gray-300">chevron_right</span>
                            </Link>
                          )}

                          {/* Driver Portal Link - Only for approved drivers */}
                          {isApprovedDriver && (
                            <Link
                              href="/driver"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                                <span className="material-symbols-outlined text-xl">local_taxi</span>
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-sm">{language === 'th' ? 'คนขับ' : 'Driver Portal'}</p>
                                <p className="text-xs text-gray-400">{language === 'th' ? 'จัดการงานรับส่ง' : 'Manage rides'}</p>
                              </div>
                              <span className="material-symbols-outlined text-gray-300">chevron_right</span>
                            </Link>
                          )}

                          <Link
                            href="/dashboard"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                              <span className="material-symbols-outlined text-xl">dashboard</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{language === 'th' ? 'แดชบอร์ด' : 'Dashboard'}</p>
                              <p className="text-xs text-gray-400">{language === 'th' ? 'ภาพรวมบัญชี' : 'Account overview'}</p>
                            </div>
                            <span className="material-symbols-outlined text-gray-300">chevron_right</span>
                          </Link>

                          <Link
                            href="/dashboard#bookings"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                              <span className="material-symbols-outlined text-xl">confirmation_number</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{language === 'th' ? 'งานจองของฉัน' : 'My Bookings'}</p>
                              <p className="text-xs text-gray-400">{language === 'th' ? 'ดูและจัดการงานจอง' : 'View & manage bookings'}</p>
                            </div>
                            <span className="material-symbols-outlined text-gray-300">chevron_right</span>
                          </Link>

                          <Link
                            href="/dashboard#settings"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                              <span className="material-symbols-outlined text-xl">settings</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{language === 'th' ? 'ตั้งค่า' : 'Settings'}</p>
                              <p className="text-xs text-gray-400">{language === 'th' ? 'แก้ไขโปรไฟล์' : 'Edit profile'}</p>
                            </div>
                            <span className="material-symbols-outlined text-gray-300">chevron_right</span>
                          </Link>

                          <button
                            onClick={openLineChat}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <div className="w-9 h-9 rounded-lg bg-[#00B900]/10 flex items-center justify-center text-[#00B900]">
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                              </svg>
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-semibold text-sm">{language === 'th' ? 'ติดต่อ LINE' : 'Contact LINE'}</p>
                              <p className="text-xs text-gray-400">{language === 'th' ? 'สอบถามเพิ่มเติม' : 'Get support'}</p>
                            </div>
                            <span className="material-symbols-outlined text-gray-300">open_in_new</span>
                          </button>
                        </div>

                        {/* Logout */}
                        <div className="border-t border-gray-100 p-2">
                          <button
                            onClick={() => { signOut(); setUserDropdownOpen(false); }}
                            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                              <span className="material-symbols-outlined text-xl">logout</span>
                            </div>
                            <span className="font-semibold text-sm">{t.auth.logout}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Mobile Actions */}
            <div className="flex items-center gap-2 md:hidden">
              {/* LINE Quick Contact - Mobile */}
              <button
                onClick={openLineChat}
                className="p-2.5 rounded-xl bg-[#00B900] text-white"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                </svg>
              </button>

              {/* Notification Bell - Mobile */}
              {user && <NotificationBell />}

              {/* Mobile Menu Button */}
              <button
                className={`p-2.5 rounded-xl transition-colors ${isScrolled ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-white/10 text-white hover:bg-white/20'}`}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="material-symbols-outlined text-2xl">
                  {mobileMenuOpen ? 'close' : 'menu'}
                </span>
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-100 shadow-2xl animate-in slide-in-from-top duration-200 max-h-[80vh] overflow-y-auto">
            <div className="max-w-7xl mx-auto p-4">
              {/* CTA Button - Mobile */}
              <Link
                href="/vehicles"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-4 mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30"
              >
                <span className="material-symbols-outlined text-xl">directions_car</span>
                <span>{language === 'th' ? 'จองรถเลย' : 'Book Now'}</span>
              </Link>

              <nav className="space-y-1 mb-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    href={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive(link.path)
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                      : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <span className="material-symbols-outlined text-xl">{link.icon}</span>
                    <span className="font-semibold">{link.name}</span>
                  </Link>
                ))}
              </nav>

              <div className="h-px bg-gray-100 my-4"></div>

              {/* Mobile Actions */}
              <div className="space-y-4">
                {/* Auth Buttons */}
                {!user ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center py-3 text-sm font-bold text-blue-600 border-2 border-blue-600 rounded-xl hover:bg-blue-50"
                    >
                      {t.auth.login}
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center py-3 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30"
                    >
                      {t.auth.register}
                    </Link>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/30">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="" className="w-full h-full rounded-xl object-cover" />
                        ) : (
                          user.displayName?.charAt(0) || user.email?.[0].toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 truncate">{user.displayName || 'Member'}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                    </div>

                    {/* Admin & Driver Quick Links */}
                    {(isAdmin || isApprovedDriver) && (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100"
                          >
                            <span className="material-symbols-outlined text-red-600">admin_panel_settings</span>
                            <span className="text-sm font-medium text-red-700">{language === 'th' ? 'แอดมิน' : 'Admin'}</span>
                          </Link>
                        )}
                        {isApprovedDriver && (
                          <Link
                            href="/driver"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100"
                          >
                            <span className="material-symbols-outlined text-amber-600">local_taxi</span>
                            <span className="text-sm font-medium text-amber-700">{language === 'th' ? 'คนขับ' : 'Driver'}</span>
                          </Link>
                        )}
                      </div>
                    )}

                    {/* Quick Actions Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <Link
                        href="/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex flex-col items-center gap-1 p-3 bg-white rounded-xl border border-gray-100"
                      >
                        <span className="material-symbols-outlined text-blue-600">dashboard</span>
                        <span className="text-xs font-medium text-gray-600">{language === 'th' ? 'แดชบอร์ด' : 'Dashboard'}</span>
                      </Link>
                      <Link
                        href="/dashboard#bookings"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex flex-col items-center gap-1 p-3 bg-white rounded-xl border border-gray-100"
                      >
                        <span className="material-symbols-outlined text-emerald-600">confirmation_number</span>
                        <span className="text-xs font-medium text-gray-600">{language === 'th' ? 'งานจอง' : 'Bookings'}</span>
                      </Link>
                      <Link
                        href="/dashboard#settings"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex flex-col items-center gap-1 p-3 bg-white rounded-xl border border-gray-100"
                      >
                        <span className="material-symbols-outlined text-purple-600">settings</span>
                        <span className="text-xs font-medium text-gray-600">{language === 'th' ? 'ตั้งค่า' : 'Settings'}</span>
                      </Link>
                    </div>

                    <button
                      onClick={() => { signOut(); setMobileMenuOpen(false); }}
                      className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-semibold"
                    >
                      <span className="material-symbols-outlined text-lg">logout</span>
                      {t.auth.logout}
                    </button>
                  </div>
                )}

                {/* Currency & Language */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { toggleCurrency(); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 font-bold text-gray-700"
                  >
                    <span className="text-xl">{currency === 'THB' ? '🇹🇭' : '🇺🇸'}</span>
                    <span>{currency}</span>
                  </button>

                  <div className="flex p-1 bg-gray-100 rounded-xl">
                    <button
                      onClick={() => setLanguage('en')}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${language === 'en'
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-500'
                        }`}
                    >
                      EN
                    </button>
                    <button
                      onClick={() => setLanguage('th')}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${language === 'th'
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-500'
                        }`}
                    >
                      TH
                    </button>
                  </div>
                </div>

                {/* LINE Contact - Mobile */}
                <button
                  onClick={openLineChat}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-[#00B900] text-white rounded-xl font-bold"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                  </svg>
                  <span>{language === 'th' ? 'แชทกับเรา' : 'Chat with us'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
