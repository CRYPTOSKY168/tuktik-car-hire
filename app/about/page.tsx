'use client';

import { useLanguage } from '@/lib/contexts/LanguageContext';

export default function AboutPage() {
    const { t } = useLanguage();

    return (
        <main className="flex-1 flex flex-col items-center min-h-screen bg-white dark:bg-[#111418]">
            <div className="w-full max-w-[1000px] px-6 lg:px-20 py-16">
                <h1 className="text-4xl font-black mb-12 text-center text-slate-900 dark:text-white">{t.footer.aboutUs}</h1>

                <div className="prose dark:prose-invert max-w-none">
                    <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                        ThaiDriver has been providing premium car rental services with professional drivers in Thailand for over 10 years.
                        Our mission is to provide safe, reliable, and comfortable transportation for both business and leisure travelers.
                    </p>

                    <div className="my-12 relative rounded-2xl overflow-hidden aspect-video bg-slate-200">
                        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                            <span className="material-symbols-outlined text-6xl">business</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div>
                            <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Our Standards</h3>
                            <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                                <li className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-brand-primary">check_circle</span>
                                    Professional, English-speaking drivers
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-brand-primary">check_circle</span>
                                    Well-maintained, insured vehicles
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-brand-primary">check_circle</span>
                                    24/7 Customer Support
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Why Choose Us</h3>
                            <p className="text-slate-600 dark:text-slate-400">
                                We understand that navigating Bangkok traffic can be stressful. Let our experienced drivers handle the roads while you relax
                                straight to your destination. We prioritize punctuality and safety above all else.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
