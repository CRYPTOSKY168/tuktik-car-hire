'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useState } from 'react';

export default function Header() {
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-white/20">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-brand-primary to-brand-accent text-white font-bold text-2xl px-4 py-2 rounded-xl shadow-lg shadow-brand-primary/20">
              TukTik
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-600 hover:text-brand-primary font-medium transition-colors">
              {t.nav.home}
            </Link>
            <Link href="/vehicles" className="text-gray-600 hover:text-brand-primary font-medium transition-colors">
              {t.nav.vehicles}
            </Link>
            <a href="#about" className="text-gray-600 hover:text-brand-primary font-medium transition-colors">
              {t.nav.aboutUs}
            </a>
            <a href="#contact" className="text-gray-600 hover:text-brand-primary font-medium transition-colors">
              {t.nav.contact}
            </a>

            {/* Language Switcher */}
            <div className="flex items-center space-x-2 border-l border-gray-200 pl-8">
              <button
                onClick={() => setLanguage('th')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${language === 'th'
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                TH
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${language === 'en'
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                EN
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t pt-4">
            <div className="flex flex-col space-y-4">
              <Link
                href="/"
                className="text-gray-700 hover:text-blue-600 transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t.nav.home}
              </Link>
              <Link
                href="/vehicles"
                className="text-gray-700 hover:text-blue-600 transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t.nav.vehicles}
              </Link>
              <a
                href="#about"
                className="text-gray-700 hover:text-blue-600 transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t.nav.aboutUs}
              </a>
              <a
                href="#contact"
                className="text-gray-700 hover:text-blue-600 transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t.nav.contact}
              </a>

              {/* Mobile Language Switcher */}
              <div className="flex items-center space-x-2 pt-4 border-t">
                <span className="text-gray-600 text-sm">{t.nav.language}:</span>
                <button
                  onClick={() => setLanguage('th')}
                  className={`px-3 py-1 rounded ${language === 'th'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700'
                    } transition`}
                >
                  TH
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1 rounded ${language === 'en'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700'
                    } transition`}
                >
                  EN
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
