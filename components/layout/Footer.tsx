'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/contexts/LanguageContext';

export default function Footer() {
  const { t, language } = useLanguage();

  return (
    <footer className="bg-white border-t border-gray-100">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">

          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <span className="material-symbols-outlined text-white text-2xl">local_taxi</span>
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-800">TukTik</h2>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Premium Service</span>
              </div>
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-sm">
              {t.footer.description}
            </p>

            {/* Social Links */}
            <div className="flex gap-2">
              {[
                { icon: 'public', label: 'Website' },
                { icon: 'smart_display', label: 'YouTube' },
                { icon: 'tag', label: 'Twitter' },
              ].map((social, i) => (
                <button
                  key={i}
                  className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gradient-to-br hover:from-blue-500 hover:to-indigo-600 text-gray-400 hover:text-white transition-all flex items-center justify-center group"
                  title={social.label}
                >
                  <span className="material-symbols-outlined text-xl">{social.icon}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
              {t.footer.company}
            </h3>
            <ul className="space-y-3">
              {[
                { label: t.footer.aboutUs, href: '/about' },
                { label: t.footer.ourFleet, href: '/vehicles' },
                { label: t.nav.services, href: '/services' },
                { label: t.footer.blog, href: '#' },
              ].map((link, i) => (
                <li key={i}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1 group"
                  >
                    <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-green-600 rounded-full"></div>
              {t.footer.support}
            </h3>
            <ul className="space-y-3">
              {[
                { label: t.footer.contact, href: '/contact' },
                { label: t.footer.faq, href: '#' },
                { label: t.footer.terms, href: '#' },
                { label: t.footer.privacy, href: '#' },
              ].map((link, i) => (
                <li key={i}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1 group"
                  >
                    <span className="material-symbols-outlined text-xs opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-amber-500 to-orange-600 rounded-full"></div>
              {t.footer.contact}
            </h3>
            <ul className="space-y-3">
              {[
                { icon: 'call', text: '+66 2 123 4567', gradient: 'from-blue-500 to-indigo-600' },
                { icon: 'mail', text: 'info@tuktik.com', gradient: 'from-emerald-500 to-green-600' },
                { icon: 'location_on', text: 'Bangkok, Thailand', gradient: 'from-amber-500 to-orange-600' },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-sm`}>
                    <span className="material-symbols-outlined text-white text-sm">{item.icon}</span>
                  </div>
                  <span className="text-sm text-gray-600">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-400">
              {t.footer.copyright}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-gray-400">
                <span className="material-symbols-outlined text-emerald-500 text-sm">verified</span>
                {language === 'th' ? 'ได้รับอนุญาต' : 'Licensed'}
              </span>
              <span className="flex items-center gap-1 text-gray-400">
                <span className="material-symbols-outlined text-blue-500 text-sm">security</span>
                {language === 'th' ? 'ปลอดภัย 100%' : '100% Secure'}
              </span>
              <span className="flex items-center gap-1 text-gray-400">
                <span className="material-symbols-outlined text-amber-500 text-sm">support_agent</span>
                {language === 'th' ? 'ซัพพอร์ต 24/7' : '24/7 Support'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
