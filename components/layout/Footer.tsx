'use client';

import { useLanguage } from '@/lib/contexts/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-white dark:bg-[#111418] border-t border-[#f0f2f4] dark:border-gray-800 pt-16 pb-8 px-4 lg:px-10 mt-0">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Logo & Desc */}
          <div className="md:col-span-1 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[#111418] dark:text-white">
              <div className="size-6 flex items-center justify-center text-brand-primary">
                <span className="material-symbols-outlined text-2xl">directions_car</span>
              </div>
              <h2 className="text-lg font-bold">ThaiDriver</h2>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              {t.footer.description}
            </p>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-bold text-[#111418] dark:text-white mb-4">{t.footer.company}</h3>
            <ul className="flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400">
              <li><a href="#" className="hover:text-brand-primary transition-colors">{t.footer.aboutUs}</a></li>
              <li><a href="#" className="hover:text-brand-primary transition-colors">{t.footer.ourFleet}</a></li>
              <li><a href="#" className="hover:text-brand-primary transition-colors">{t.nav.services}</a></li>
              <li><a href="#" className="hover:text-brand-primary transition-colors">{t.footer.blog}</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-bold text-[#111418] dark:text-white mb-4">{t.footer.support}</h3>
            <ul className="flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400">
              <li><a href="#" className="hover:text-brand-primary transition-colors">{t.footer.contact}</a></li>
              <li><a href="#" className="hover:text-brand-primary transition-colors">{t.footer.faq}</a></li>
              <li><a href="#" className="hover:text-brand-primary transition-colors">{t.footer.terms}</a></li>
              <li><a href="#" className="hover:text-brand-primary transition-colors">{t.footer.privacy}</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-[#111418] dark:text-white mb-4">{t.footer.contact}</h3>
            <ul className="flex flex-col gap-3 text-sm text-gray-500 dark:text-gray-400">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">call</span>
                <span>+66 2 123 4567</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">mail</span>
                <span>booking@thaidriver.com</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">location_on</span>
                <span>Bangkok, Thailand</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#f0f2f4] dark:border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-400">{t.footer.copyright}</p>
          <div className="flex gap-4">
            <a href="#" className="text-gray-400 hover:text-brand-primary"><span className="material-symbols-outlined text-[20px]">public</span></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
