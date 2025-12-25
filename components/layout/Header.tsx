'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useState } from 'react';

export default function Header() {
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#f0f2f4] dark:border-gray-800 px-4 py-3 bg-white dark:bg-[#111418] lg:px-10">
      <div className="flex items-center gap-4 text-[#111418] dark:text-white">
        <div className="size-8 flex items-center justify-center text-brand-primary">
          <span className="material-symbols-outlined text-3xl">directions_car</span>
        </div>
        <h2 className="text-[#111418] dark:text-white text-xl font-bold leading-tight tracking-[-0.015em]">ThaiDriver</h2>
      </div>
      <div className="flex flex-1 justify-end gap-8">
        <div className="hidden md:flex items-center gap-9">
          <Link href="/vehicles" className="text-[#111418] dark:text-gray-200 text-sm font-medium leading-normal hover:text-brand-primary transition-colors">
            {t.nav.vehicles}
          </Link>
          <a href="#" className="text-[#111418] dark:text-gray-200 text-sm font-medium leading-normal hover:text-brand-primary transition-colors">{t.nav.services}</a>
          <a href="#" className="text-[#111418] dark:text-gray-200 text-sm font-medium leading-normal hover:text-brand-primary transition-colors">{t.nav.contact}</a>
          <div className="flex items-center gap-1 cursor-pointer hover:opacity-80">
            <button
              onClick={() => setLanguage('en')}
              className={`text-sm font-bold leading-normal ${language === 'en' ? 'text-[#111418] dark:text-white' : 'text-[#617589]'}`}
            >
              EN
            </button>
            <span className="text-[#dbe0e6] text-sm font-medium">|</span>
            <button
              onClick={() => setLanguage('th')}
              className={`text-sm font-bold leading-normal ${language === 'th' ? 'text-[#111418] dark:text-white' : 'text-[#617589]'}`}
            >
              TH
            </button>
          </div>
        </div>
        <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-brand-primary hover:bg-blue-600 transition-colors text-white text-sm font-bold leading-normal tracking-[0.015em]">
          <span className="truncate">{t.home.booking.searchVehicles}</span>
        </button>
        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-gray-700"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
    </header>
  );
}
