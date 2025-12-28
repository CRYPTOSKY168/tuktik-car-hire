'use client';

import { useLanguage } from '@/lib/contexts/LanguageContext';

export default function ContactPage() {
    const { t } = useLanguage();

    return (
        <main className="flex-1 flex flex-col items-center min-h-screen bg-white dark:bg-[#111418]">
            <div className="w-full max-w-[1200px] px-6 lg:px-20 py-16">
                <h1 className="text-4xl font-black mb-12 text-center text-slate-900 dark:text-white">{t.nav.contact}</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    {/* Info */}
                    <div>
                        <h3 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Get in Touch</h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-8">
                            Have questions about our fleet or services? Need a custom quote? Contact us using the details below or fill out the form.
                        </p>

                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-brand-primary shrink-0">
                                    <span className="material-symbols-outlined">call</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">Phone</h4>
                                    <p className="text-slate-600 dark:text-slate-400">+66 2 123 4567</p>
                                    <p className="text-slate-500 text-sm">Mon-Sun, 9am - 6pm</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-brand-primary shrink-0">
                                    <span className="material-symbols-outlined">mail</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">Email</h4>
                                    <p className="text-slate-600 dark:text-slate-400">booking@thaidriver.com</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-brand-primary shrink-0">
                                    <span className="material-symbols-outlined">location_on</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">Office</h4>
                                    <p className="text-slate-600 dark:text-slate-400">
                                        123 Sukhumvit Road<br />
                                        Watthana, Bangkok 10110<br />
                                        Thailand
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">First Name</label>
                                    <input type="text" className="w-full rounded-lg border-slate-300 px-3 py-2 text-sm focus:border-brand-primary focus:ring-brand-primary" placeholder="John" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
                                    <input type="text" className="w-full rounded-lg border-slate-300 px-3 py-2 text-sm focus:border-brand-primary focus:ring-brand-primary" placeholder="Doe" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                                <input type="email" className="w-full rounded-lg border-slate-300 px-3 py-2 text-sm focus:border-brand-primary focus:ring-brand-primary" placeholder="john@example.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Message</label>
                                <textarea className="w-full rounded-lg border-slate-300 px-3 py-2 text-sm focus:border-brand-primary focus:ring-brand-primary min-h-[120px]" placeholder="How can we help?"></textarea>
                            </div>
                            <button className="w-full bg-brand-primary text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors">
                                Send Message
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </main>
    );
}
