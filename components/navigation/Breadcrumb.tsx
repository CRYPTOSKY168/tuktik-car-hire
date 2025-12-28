'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/contexts/LanguageContext';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: string;
}

// Route translations mapping
const routeLabels: Record<string, { en: string; th: string; icon: string }> = {
  '': { en: 'Home', th: 'หน้าแรก', icon: 'home' },
  'vehicles': { en: 'Vehicles', th: 'เลือกรถ', icon: 'directions_car' },
  'services': { en: 'Services', th: 'บริการ', icon: 'concierge' },
  'contact': { en: 'Contact', th: 'ติดต่อ', icon: 'support_agent' },
  'about': { en: 'About', th: 'เกี่ยวกับ', icon: 'info' },
  'routes': { en: 'Routes', th: 'เส้นทาง', icon: 'route' },
  'login': { en: 'Login', th: 'เข้าสู่ระบบ', icon: 'login' },
  'register': { en: 'Register', th: 'สมัครสมาชิก', icon: 'person_add' },
  'dashboard': { en: 'Dashboard', th: 'แดชบอร์ด', icon: 'dashboard' },
  'payment': { en: 'Payment', th: 'ชำระเงิน', icon: 'payment' },
  'confirmation': { en: 'Confirmation', th: 'ยืนยัน', icon: 'check_circle' },
  'success': { en: 'Success', th: 'สำเร็จ', icon: 'celebration' },
  'cancel': { en: 'Cancelled', th: 'ยกเลิก', icon: 'cancel' },
};

export default function Breadcrumb() {
  const pathname = usePathname();
  const { language } = useLanguage();

  // Don't show on home page or admin pages
  if (pathname === '/' || pathname?.startsWith('/admin')) {
    return null;
  }

  const pathSegments = pathname?.split('/').filter(Boolean) || [];

  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: language === 'th' ? 'หน้าแรก' : 'Home',
      href: '/',
      icon: 'home'
    }
  ];

  let currentPath = '';
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const routeInfo = routeLabels[segment] || {
      en: segment.charAt(0).toUpperCase() + segment.slice(1),
      th: segment.charAt(0).toUpperCase() + segment.slice(1),
      icon: 'chevron_right'
    };

    const isLast = index === pathSegments.length - 1;

    breadcrumbs.push({
      label: language === 'th' ? routeInfo.th : routeInfo.en,
      href: isLast ? undefined : currentPath,
      icon: routeInfo.icon
    });
  });

  return (
    <nav aria-label="Breadcrumb" className="w-full">
      <div className="max-w-7xl mx-auto px-4 md:px-10 pt-20 pb-2">
        <ol className="flex items-center gap-1 text-sm flex-wrap">
          {breadcrumbs.map((item, index) => (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <span className="material-symbols-outlined text-gray-300 text-lg mx-1">
                  chevron_right
                </span>
              )}

              {item.href ? (
                <Link
                  href={item.href}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all group"
                >
                  <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform">
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-sm">
                  <span className="material-symbols-outlined text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
