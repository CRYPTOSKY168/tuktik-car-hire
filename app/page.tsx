'use client';

import BookingForm from '@/components/booking/BookingForm';
import Link from "next/link";
import { useLanguage } from '@/lib/contexts/LanguageContext';

export default function Home() {
  const { t, language } = useLanguage();

  return (
    <div>
      {/* Hero Section */}
      <div
        className="relative flex flex-col items-center justify-center min-h-[600px] w-full bg-cover bg-center bg-no-repeat p-4 lg:p-20"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6)), url("/images/hero-bg.jpg")`
        }}
      >
        <div className="flex flex-col gap-6 text-center max-w-[800px] z-10 mb-8 mt-16 md:mt-0">
          <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em] md:text-6xl md:leading-[1.1]">
            {t.home.hero.title}
          </h1>
          <h2 className="text-gray-200 text-lg font-medium leading-normal md:text-xl">
            {t.home.hero.subtitle}
          </h2>
        </div>

        {/* Booking Widget */}
        <div className="w-full max-w-[1000px] bg-white dark:bg-[#1a202c] rounded-2xl p-4 md:p-6 shadow-xl z-20">
          <BookingForm />
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white dark:bg-[#111418] border-b border-[#f0f2f4] dark:border-gray-800">
        <div className="max-w-[1200px] mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-wrap gap-4 md:gap-8 justify-center">
            <div className="flex min-w-[150px] flex-1 flex-col items-center gap-1 p-4">
              <p className="text-brand-primary text-3xl md:text-4xl font-black leading-tight">500+</p>
              <p className="text-[#617589] dark:text-gray-400 text-sm font-medium leading-normal text-center">Destinations Covered</p>
            </div>
            <div className="w-px bg-gray-200 dark:bg-gray-800 hidden md:block"></div>
            <div className="flex min-w-[150px] flex-1 flex-col items-center gap-1 p-4">
              <p className="text-brand-primary text-3xl md:text-4xl font-black leading-tight">50+</p>
              <p className="text-[#617589] dark:text-gray-400 text-sm font-medium leading-normal text-center">Luxury Vehicles</p>
            </div>
            <div className="w-px bg-gray-200 dark:bg-gray-800 hidden md:block"></div>
            <div className="flex min-w-[150px] flex-1 flex-col items-center gap-1 p-4">
              <p className="text-brand-primary text-3xl md:text-4xl font-black leading-tight">10k+</p>
              <p className="text-[#617589] dark:text-gray-400 text-sm font-medium leading-normal text-center">Happy Travelers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Section */}
      <div className="bg-background-light dark:bg-background-dark py-16 px-4 md:px-10">
        <div className="max-w-[960px] mx-auto flex flex-col gap-10">
          <div className="flex flex-col gap-4 text-center md:text-left">
            <h2 className="text-[#111418] dark:text-white text-3xl md:text-4xl font-bold leading-tight tracking-tight">
              Why Choose ThaiDriver?
            </h2>
            <p className="text-[#617589] dark:text-gray-400 text-base font-normal leading-normal max-w-[720px]">
              Experience the best in long-distance travel with our premium chauffeur service across Thailand.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="flex flex-col gap-4 rounded-xl border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1a202c] p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-brand-primary">
                <span className="material-symbols-outlined text-[28px]">airline_seat_recline_extra</span>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-[#111418] dark:text-white text-lg font-bold">Door-to-Door Service</h3>
                <p className="text-[#617589] dark:text-gray-400 text-sm leading-relaxed">
                  We pick you up from your hotel, airport, or residence and drop you off exactly where you need to be.
                </p>
              </div>
            </div>
            {/* Card 2 */}
            <div className="flex flex-col gap-4 rounded-xl border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1a202c] p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-brand-primary">
                <span className="material-symbols-outlined text-[28px]">translate</span>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-[#111418] dark:text-white text-lg font-bold">English Speaking Drivers</h3>
                <p className="text-[#617589] dark:text-gray-400 text-sm leading-relaxed">
                  Communication is easy. Our drivers are professional, polite, and fluent in basic English.
                </p>
              </div>
            </div>
            {/* Card 3 */}
            <div className="flex flex-col gap-4 rounded-xl border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1a202c] p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-brand-primary">
                <span className="material-symbols-outlined text-[28px]">price_check</span>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-[#111418] dark:text-white text-lg font-bold">Fixed Rates</h3>
                <p className="text-[#617589] dark:text-gray-400 text-sm leading-relaxed">
                  All-inclusive pricing including fuel, tolls, and parking. No hidden fees or surprises at the end of your trip.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fleet Section */}
      <div className="bg-white dark:bg-[#111418] py-16 px-4 md:px-10">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-8">
          <div className="flex justify-between items-end pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-col gap-2">
              <h2 className="text-[#111418] dark:text-white text-3xl font-bold tracking-tight">Our Premium Fleet</h2>
              <p className="text-[#617589] dark:text-gray-400">Choose the perfect vehicle for your journey.</p>
            </div>
            <Link href="/vehicles" className="hidden md:flex items-center text-brand-primary font-bold text-sm hover:underline gap-1">
              View All Vehicles <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Vehicle Card 1 */}
            <div className="group flex flex-col rounded-xl overflow-hidden border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1a202c] shadow-sm hover:shadow-lg transition-all">
              <div className="relative h-48 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <img src="/images/camry.jpg" alt="Toyota Camry" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3 bg-white/90 dark:bg-black/80 backdrop-blur px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">Economy</div>
              </div>
              <div className="p-5 flex flex-col flex-1 gap-4">
                <div>
                  <h3 className="text-xl font-bold text-[#111418] dark:text-white">Toyota Camry</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Perfect for couples or small families.</p>
                </div>
                <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">person</span> 3</div>
                  <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">luggage</span> 2</div>
                </div>
                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <div className="text-xs text-gray-500">Starting from</div>
                  <span className="text-lg font-bold text-brand-primary">฿2,500</span>
                </div>
              </div>
            </div>
            {/* Vehicle Card 2 */}
            <div className="group flex flex-col rounded-xl overflow-hidden border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1a202c] shadow-sm hover:shadow-lg transition-all">
              <div className="relative h-48 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <img src="/images/fortuner.jpg" alt="Toyota Fortuner" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3 bg-white/90 dark:bg-black/80 backdrop-blur px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">Business</div>
              </div>
              <div className="p-5 flex flex-col flex-1 gap-4">
                <div>
                  <h3 className="text-xl font-bold text-[#111418] dark:text-white">Toyota Fortuner</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Ideal for extra legroom and luggage.</p>
                </div>
                <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">person</span> 4</div>
                  <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">luggage</span> 4</div>
                </div>
                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <div className="text-xs text-gray-500">Starting from</div>
                  <span className="text-lg font-bold text-brand-primary">฿3,000</span>
                </div>
              </div>
            </div>
            {/* Vehicle Card 3 */}
            <div className="group flex flex-col rounded-xl overflow-hidden border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1a202c] shadow-sm hover:shadow-lg transition-all">
              <div className="relative h-48 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <img src="/images/van.jpg" alt="Toyota Commuter VIP" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3 bg-brand-primary/90 text-white backdrop-blur px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">VIP Van</div>
              </div>
              <div className="p-5 flex flex-col flex-1 gap-4">
                <div>
                  <h3 className="text-xl font-bold text-[#111418] dark:text-white">Toyota Commuter VIP</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Maximum comfort for larger groups.</p>
                </div>
                <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">person</span> 9</div>
                  <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">luggage</span> 8</div>
                </div>
                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <div className="text-xs text-gray-500">Starting from</div>
                  <span className="text-lg font-bold text-brand-primary">฿4,500</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="bg-background-light dark:bg-background-dark py-16 px-4 md:px-10">
        <div className="max-w-[960px] mx-auto">
          <h2 className="text-[#111418] dark:text-white text-2xl font-bold mb-8 text-center">What our customers say</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Review 1 */}
            <div className="bg-white dark:bg-[#1a202c] p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-1 text-yellow-400 mb-3">
                <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                <span className="material-symbols-outlined text-[20px] fill-current">star</span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">"The driver was waiting for us at the airport with a sign. The car was spotless and the drive to Hua Hin was very smooth."</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                  <img src="/images/avatar1.jpg" alt="Sarah Jenkins" className="w-full h-full object-cover" />
                </div>
                <span className="text-sm font-bold text-[#111418] dark:text-white">Sarah Jenkins</span>
              </div>
            </div>
            {/* Review 2 */}
            <div className="bg-white dark:bg-[#1a202c] p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-1 text-yellow-400 mb-3">
                <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                <span className="material-symbols-outlined text-[20px] fill-current">star</span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">"Excellent service! Used them for a business trip from Bangkok to Pattaya. Wi-Fi in the car was a life saver."</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                  <img src="/images/avatar2.jpg" alt="Michael Chen" className="w-full h-full object-cover" />
                </div>
                <span className="text-sm font-bold text-[#111418] dark:text-white">Michael Chen</span>
              </div>
            </div>
            {/* Review 3 */}
            <div className="bg-white dark:bg-[#1a202c] p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hidden lg:block">
              <div className="flex items-center gap-1 text-yellow-400 mb-3">
                <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                <span className="material-symbols-outlined text-[20px] fill-current">star</span>
                <span className="material-symbols-outlined text-[20px] fill-current">star</span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">"Highly recommended. The VIP Van was incredibly comfortable for our family of 6. Will book again."</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                  <img src="/images/avatar3.jpg" alt="Emily Rossi" className="w-full h-full object-cover" />
                </div>
                <span className="text-sm font-bold text-[#111418] dark:text-white">Emily Rossi</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <section className="py-20 bg-white" id="contact">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              {t.footer.contact}
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              {t.home.features.feature3Desc}
            </p>
            <div className="flex flex-wrap justify-center gap-8 text-lg">
              <div className="flex items-center space-x-2">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-gray-700">02-123-4567</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-gray-700">info@tuktik.com</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
