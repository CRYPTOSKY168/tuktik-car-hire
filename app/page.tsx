'use client';

import BookingForm from '@/components/booking/BookingForm';
import { useLanguage } from '@/lib/contexts/LanguageContext';

export default function Home() {
  const { t } = useLanguage();

  return (
    <div>
      {/* Hero Section */}
      {/* Hero Section */}
      <section className="relative bg-brand-dark text-white pt-24 pb-32 overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-brand-primary/20 to-transparent skew-x-12 translate-x-20"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-2/3 bg-gradient-to-t from-brand-accent/20 to-transparent -skew-x-12 -translate-x-20"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-12 mb-16">
            {/* Text Content */}
            <div className="w-full md:w-1/2 text-center md:text-left">
              <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200 leading-tight">
                {t.home.hero.title}
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-lg mx-auto md:mx-0 font-light">
                {t.home.hero.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <p className="text-lg text-blue-200 border-l-4 border-brand-accent pl-4">
                  {t.home.hero.description}
                </p>
              </div>
            </div>

            {/* Illustration */}
            <div className="w-full md:w-1/2 flex justify-center perspective-1000">
              <img
                src="/hero-car.png"
                alt="Premium Electric Car"
                className="w-full max-w-xl object-contain drop-shadow-[0_20px_50px_rgba(59,130,246,0.5)] transform hover:scale-105 transition-transform duration-500 ease-out"
              />
            </div>
          </div>

          {/* Booking Form Container */}
          <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur-lg rounded-2xl p-2 shadow-2xl border border-white/20">
            <BookingForm />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-brand-light" id="about">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {t.home.features.title}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-brand-primary">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {t.home.features.feature1Title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.home.features.feature1Desc}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mb-6 text-brand-accent">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {t.home.features.feature2Title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.home.features.feature2Desc}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-brand-dark">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {t.home.features.feature3Title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.home.features.feature3Desc}
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mb-6 text-brand-primary">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {t.home.features.feature4Title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t.home.features.feature4Desc}
              </p>
            </div>
          </div>
        </div>
      </section>

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
