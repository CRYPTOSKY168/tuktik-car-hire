'use client';

import { useLanguage } from '@/lib/contexts/LanguageContext';

export default function ServicesPage() {
    const { t } = useLanguage();

    const services = [
        {
            icon: 'flight',
            title: 'Airport Transfers',
            description: 'Reliable pickup and drop-off at Suvarnabhumi and Don Mueang airports. We track your flight to ensure we are there when you land.'
        },
        {
            icon: 'schedule',
            title: 'Hourly Charter',
            description: 'Flexible car rental with driver by the hour. Perfect for business meetings, city tours, or shopping trips around Bangkok.'
        },
        {
            icon: 'location_on',
            title: 'Inter-City Travel',
            description: 'Comfortable trips to Pattaya, Hua Hin, Ayutthaya, and other destinations. Enjoy the scenery while we handle the driving.'
        }
    ];

    return (
        <main className="flex-1 flex flex-col items-center min-h-screen bg-white dark:bg-[#111418]">
            <div className="w-full max-w-[1200px] px-6 lg:px-20 py-16">
                <h1 className="text-4xl font-black mb-12 text-center text-slate-900 dark:text-white">{t.nav.services}</h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {services.map((service, idx) => (
                        <div key={idx} className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-shadow">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mb-6 text-brand-primary">
                                <span className="material-symbols-outlined text-3xl">{service.icon}</span>
                            </div>
                            <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">{service.title}</h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                                {service.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
