'use client';

import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/contexts/LanguageContext';

interface Step {
  id: number;
  label: { en: string; th: string };
  icon: string;
  paths: string[];
}

const steps: Step[] = [
  {
    id: 1,
    label: { en: 'Select Vehicle', th: 'เลือกรถ' },
    icon: 'directions_car',
    paths: ['/vehicles']
  },
  {
    id: 2,
    label: { en: 'Payment', th: 'ชำระเงิน' },
    icon: 'payment',
    paths: ['/payment']
  },
  {
    id: 3,
    label: { en: 'Confirmation', th: 'ยืนยัน' },
    icon: 'check_circle',
    paths: ['/confirmation', '/payment/success']
  }
];

export default function BookingProgress() {
  const pathname = usePathname();
  const { language } = useLanguage();

  // Only show on booking flow pages
  const isBookingFlow = steps.some(step => step.paths.some(p => pathname?.startsWith(p)));

  if (!isBookingFlow) {
    return null;
  }

  // Determine current step
  const getCurrentStep = (): number => {
    for (const step of steps) {
      if (step.paths.some(p => pathname?.startsWith(p))) {
        return step.id;
      }
    }
    return 1;
  };

  const currentStep = getCurrentStep();

  return (
    <div className="w-full bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 md:px-10 py-4">
        <div className="flex items-center justify-between relative">
          {/* Progress Line Background */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-16 md:mx-24"></div>

          {/* Progress Line Active */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mx-16 md:mx-24 transition-all duration-500"
            style={{
              width: `calc(${((currentStep - 1) / (steps.length - 1)) * 100}% - ${currentStep === 1 ? 0 : 32}px)`
            }}
          ></div>

          {steps.map((step) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const isPending = step.id > currentStep;

            return (
              <div key={step.id} className="flex flex-col items-center relative z-10">
                {/* Step Circle */}
                <div
                  className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30'
                      : isCurrent
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/40 scale-110'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {isCompleted ? (
                    <span className="material-symbols-outlined text-2xl md:text-3xl">check</span>
                  ) : (
                    <span className="material-symbols-outlined text-2xl md:text-3xl">{step.icon}</span>
                  )}
                </div>

                {/* Step Label */}
                <div className="mt-2 text-center">
                  <span
                    className={`text-xs md:text-sm font-bold whitespace-nowrap ${
                      isCompleted
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isCurrent
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {language === 'th' ? step.label.th : step.label.en}
                  </span>
                </div>

                {/* Step Number Badge */}
                <div
                  className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {step.id}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
