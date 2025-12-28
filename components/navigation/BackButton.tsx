'use client';

import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/contexts/LanguageContext';

interface BackButtonProps {
  href?: string;
  label?: string;
  variant?: 'default' | 'minimal' | 'pill';
  className?: string;
}

export default function BackButton({
  href,
  label,
  variant = 'default',
  className = ''
}: BackButtonProps) {
  const router = useRouter();
  const { language } = useLanguage();

  const defaultLabel = language === 'th' ? 'กลับ' : 'Back';

  const handleClick = () => {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  const baseStyles = 'inline-flex items-center gap-2 font-bold transition-all group';

  const variants = {
    default: `${baseStyles} px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 hover:-translate-x-1`,
    minimal: `${baseStyles} text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400`,
    pill: `${baseStyles} px-5 py-2.5 rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:-translate-x-1`
  };

  return (
    <button
      onClick={handleClick}
      className={`${variants[variant]} ${className}`}
    >
      <span className="material-symbols-outlined text-xl group-hover:-translate-x-0.5 transition-transform">
        arrow_back
      </span>
      <span className="text-sm">{label || defaultLabel}</span>
    </button>
  );
}
