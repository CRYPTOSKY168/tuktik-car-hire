'use client';

import BookingForm from '@/components/booking/BookingForm';
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { FirestoreService } from '@/lib/firebase/firestore';
import { useEffect, useState, useMemo, useCallback } from 'react';

export default function Home() {
  const { t, language } = useLanguage();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const data = await FirestoreService.getVehicles();
        setVehicles(data);
      } catch (error) {
        console.error("Failed to fetch vehicles", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  const getVehicleTypeConfig = useCallback((type: string) => {
    switch (type?.toLowerCase()) {
      case 'sedan': return { gradient: 'from-blue-400 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-700' };
      case 'suv': return { gradient: 'from-orange-400 to-orange-600', bg: 'bg-orange-50', text: 'text-orange-700' };
      case 'van': return { gradient: 'from-purple-400 to-purple-600', bg: 'bg-purple-50', text: 'text-purple-700' };
      default: return { gradient: 'from-gray-400 to-gray-600', bg: 'bg-gray-50', text: 'text-gray-700' };
    }
  }, []);

  return (
    <div className="bg-[#f0f4f8]">
      {/* Hero Section */}
      <section className="relative min-h-[700px] lg:min-h-[800px] overflow-hidden">
        {/* Background with Gradient Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url("/images/hero-bg.jpg")` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-indigo-900/85 to-purple-900/80" />

        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 pt-32 lg:pt-40 pb-20">
          <div className="flex flex-col items-center text-center mb-12">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-6">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="text-white/90 text-sm font-medium">Premium Car Service in Thailand</span>
            </div>

            {/* Main Title */}
            <h1 className="text-white text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight mb-6 max-w-4xl">
              {t.home.hero.title}
            </h1>

            {/* Subtitle */}
            <p className="text-blue-100/80 text-lg md:text-xl font-medium max-w-2xl mb-8">
              {t.home.hero.subtitle}
            </p>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-6 mb-12">
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-400 text-lg">verified</span>
                </div>
                <span>Licensed & Insured</span>
              </div>
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-400 text-lg">star</span>
                </div>
                <span>4.9/5 Rating</span>
              </div>
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-400 text-lg">support_agent</span>
                </div>
                <span>24/7 Support</span>
              </div>
            </div>
          </div>

          {/* Booking Widget */}
          <div className="max-w-5xl mx-auto">
            <BookingForm />
          </div>
        </div>

        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#f0f4f8"/>
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 lg:py-20 bg-[#f0f4f8]">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[
              { value: '500+', label: t.home.stats.destinations, icon: 'location_on', gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/30' },
              { value: '50+', label: t.home.stats.vehicles, icon: 'directions_car', gradient: 'from-emerald-500 to-green-600', shadow: 'shadow-emerald-500/30' },
              { value: '10K+', label: t.home.stats.travelers, icon: 'groups', gradient: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/30' },
              { value: '99%', label: language === 'th' ? 'ความพึงพอใจ' : 'Satisfaction', icon: 'sentiment_satisfied', gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/30' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 lg:p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg ${stat.shadow} group-hover:scale-110 transition-transform`}>
                    <span className="material-symbols-outlined text-white text-xl lg:text-2xl">{stat.icon}</span>
                  </div>
                  <div>
                    <p className="text-2xl lg:text-3xl font-black text-gray-800">{stat.value}</p>
                    <p className="text-xs lg:text-sm text-gray-400 font-medium">{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12 lg:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-4">
              <span className="material-symbols-outlined text-blue-600 text-lg">auto_awesome</span>
              <span className="text-blue-600 text-sm font-bold">Why Choose Us</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-gray-800 mb-4">
              {t.home.features.title}
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              {t.home.features.subtitle}
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                icon: 'airline_seat_recline_extra',
                title: t.home.features.feature1Title,
                desc: t.home.features.feature1Desc,
                gradient: 'from-blue-500 to-indigo-600',
                shadow: 'shadow-blue-500/30',
                bgLight: 'bg-blue-50',
              },
              {
                icon: 'translate',
                title: t.home.features.feature2Title,
                desc: t.home.features.feature2Desc,
                gradient: 'from-emerald-500 to-green-600',
                shadow: 'shadow-emerald-500/30',
                bgLight: 'bg-emerald-50',
              },
              {
                icon: 'price_check',
                title: t.home.features.feature3Title,
                desc: t.home.features.feature3Desc,
                gradient: 'from-amber-500 to-orange-600',
                shadow: 'shadow-amber-500/30',
                bgLight: 'bg-amber-50',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-lg ${feature.shadow} mb-6 group-hover:scale-110 transition-transform`}>
                  <span className="material-symbols-outlined text-white text-2xl lg:text-3xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.desc}</p>

                {/* Decorative Dots */}
                <div className="flex gap-1 mt-6">
                  <div className={`w-8 h-1 rounded-full ${feature.bgLight}`}></div>
                  <div className={`w-4 h-1 rounded-full ${feature.bgLight}`}></div>
                  <div className={`w-2 h-1 rounded-full ${feature.bgLight}`}></div>
                </div>
              </div>
            ))}
          </div>

          {/* Additional Features List */}
          <div className="mt-12 lg:mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: 'schedule', text: language === 'th' ? 'จองง่าย 24/7' : '24/7 Booking' },
              { icon: 'local_airport', text: language === 'th' ? 'รับ-ส่งสนามบิน' : 'Airport Pickup' },
              { icon: 'payments', text: language === 'th' ? 'ราคาคงที่' : 'Fixed Pricing' },
              { icon: 'verified_user', text: language === 'th' ? 'ประกันภัยครบ' : 'Full Insurance' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                </div>
                <span className="text-sm font-semibold text-gray-700">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fleet Section */}
      <section className="py-16 lg:py-24 bg-[#f0f4f8]">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          {/* Section Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-4">
                <span className="material-symbols-outlined text-blue-600 text-lg">directions_car</span>
                <span className="text-blue-600 text-sm font-bold">Our Fleet</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-black text-gray-800 mb-2">
                {t.home.fleet.title}
              </h2>
              <p className="text-gray-500">{t.home.fleet.subtitle}</p>
            </div>
            <Link
              href="/book"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30"
            >
              {t.home.fleet.viewAll}
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
          </div>

          {/* Vehicles Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
                  <div className="w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
                </div>
                <p className="text-blue-600 font-semibold">Loading vehicles...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.slice(0, 3).map((vehicle) => {
                const typeConfig = getVehicleTypeConfig(vehicle.type);
                return (
                  <div
                    key={vehicle.id}
                    className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    {/* Image */}
                    <div className="relative h-52 bg-gradient-to-br from-gray-100 to-gray-50 overflow-hidden">
                      <Image
                        src={vehicle.image || '/images/camry.jpg'}
                        alt={vehicle.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      {/* Overlay Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Type Badge */}
                      <div className="absolute top-4 left-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs uppercase font-bold tracking-wider ${typeConfig.bg} ${typeConfig.text}`}>
                          {vehicle.type}
                        </span>
                      </div>

                      {/* Quick View Button */}
                      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                        <Link
                          href="/book"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-800 font-bold rounded-lg text-sm shadow-lg hover:bg-gray-50"
                        >
                          <span className="material-symbols-outlined text-lg">visibility</span>
                          View
                        </Link>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 lg:p-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{vehicle.name}</h3>
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                        {vehicle.description || `${vehicle.type} Class Vehicle`}
                      </p>

                      {/* Specs */}
                      <div className="flex gap-4 mb-4">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm">person</span>
                          </div>
                          <span className="text-sm font-medium">{vehicle.passengers}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm">luggage</span>
                          </div>
                          <span className="text-sm font-medium">{vehicle.luggage}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm">ac_unit</span>
                          </div>
                          <span className="text-sm font-medium">A/C</span>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div>
                          <span className="text-xs text-gray-400 font-medium">{t.home.fleet.startingFrom}</span>
                          <p className="text-2xl font-black text-blue-600">฿{Number(vehicle.price).toLocaleString()}</p>
                        </div>
                        <Link
                          href="/book"
                          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-sm hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30"
                        >
                          Book Now
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 lg:py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-full mb-4">
              <span className="material-symbols-outlined text-amber-600 text-lg">format_quote</span>
              <span className="text-amber-600 text-sm font-bold">Testimonials</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-gray-800 mb-4">
              {t.home.testimonials.title}
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              {language === 'th' ? 'ความคิดเห็นจากลูกค้าที่ใช้บริการของเรา' : 'What our customers say about our service'}
            </p>
          </div>

          {/* Testimonials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                review: t.home.testimonials.review1,
                name: 'Sarah Jenkins',
                role: language === 'th' ? 'นักท่องเที่ยว' : 'Tourist',
                avatar: '/images/avatar1.jpg',
                rating: 5,
              },
              {
                review: t.home.testimonials.review2,
                name: 'Michael Chen',
                role: language === 'th' ? 'นักธุรกิจ' : 'Business Traveler',
                avatar: '/images/avatar2.jpg',
                rating: 5,
              },
              {
                review: t.home.testimonials.review3,
                name: 'Emily Rossi',
                role: language === 'th' ? 'ครอบครัว' : 'Family Trip',
                avatar: '/images/avatar3.jpg',
                rating: 5,
              },
            ].map((testimonial, i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm hover:shadow-lg transition-all group"
              >
                {/* Quote Icon */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6">
                  <span className="material-symbols-outlined text-white text-xl">format_quote</span>
                </div>

                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <span key={j} className="material-symbols-outlined text-amber-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  ))}
                </div>

                {/* Review Text */}
                <p className="text-gray-600 mb-6 leading-relaxed">"{testimonial.review}"</p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 overflow-hidden">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{testimonial.name}</p>
                    <p className="text-sm text-gray-400">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />

        <div className="max-w-4xl mx-auto px-4 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-full border border-white/20 mb-6">
            <span className="material-symbols-outlined text-white/90 text-lg">rocket_launch</span>
            <span className="text-white/90 text-sm font-medium">Start Your Journey</span>
          </div>

          <h2 className="text-3xl lg:text-5xl font-black text-white mb-6">
            {language === 'th' ? 'พร้อมเริ่มต้นการเดินทางของคุณ?' : 'Ready to Start Your Journey?'}
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
            {language === 'th'
              ? 'จองรถพร้อมคนขับวันนี้ รับส่วนลด 10% สำหรับการจองครั้งแรก'
              : 'Book your car with driver today and get 10% off on your first booking'}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-600 font-bold rounded-xl hover:bg-gray-50 transition-all shadow-2xl"
            >
              <span className="material-symbols-outlined text-xl">search</span>
              {t.home.booking.searchVehicles}
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur text-white font-bold rounded-xl hover:bg-white/20 transition-all border border-white/30"
            >
              <span className="material-symbols-outlined text-xl">support_agent</span>
              {t.footer.contact}
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 lg:py-24 bg-[#f0f4f8]" id="contact">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Contact Info */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-6">
                <span className="material-symbols-outlined text-blue-600 text-lg">contact_support</span>
                <span className="text-blue-600 text-sm font-bold">Get In Touch</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-black text-gray-800 mb-4">
                {t.footer.contact}
              </h2>
              <p className="text-gray-500 mb-8">
                {language === 'th'
                  ? 'มีคำถาม? ติดต่อเราได้ตลอด 24 ชั่วโมง เรายินดีให้บริการ'
                  : 'Have questions? Contact us anytime. We\'re here to help you 24/7'}
              </p>

              <div className="space-y-4">
                {[
                  { icon: 'call', label: language === 'th' ? 'โทรศัพท์' : 'Phone', value: '02-123-4567', gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/30' },
                  { icon: 'mail', label: language === 'th' ? 'อีเมล' : 'Email', value: 'info@tuktik.com', gradient: 'from-emerald-500 to-green-600', shadow: 'shadow-emerald-500/30' },
                  { icon: 'location_on', label: language === 'th' ? 'ที่อยู่' : 'Address', value: 'Bangkok, Thailand', gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/30' },
                  { icon: 'schedule', label: language === 'th' ? 'เวลาทำการ' : 'Hours', value: language === 'th' ? 'เปิดทุกวัน 24 ชม.' : 'Open 24/7', gradient: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/30' },
                ].map((contact, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${contact.gradient} flex items-center justify-center shadow-lg ${contact.shadow}`}>
                      <span className="material-symbols-outlined text-white text-xl">{contact.icon}</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{contact.label}</p>
                      <p className="text-gray-800 font-bold">{contact.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Form / Map Placeholder */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <h3 className="text-xl font-bold text-white">{language === 'th' ? 'ส่งข้อความหาเรา' : 'Send us a Message'}</h3>
                <p className="text-blue-100 text-sm">{language === 'th' ? 'เราจะตอบกลับภายใน 24 ชั่วโมง' : 'We\'ll respond within 24 hours'}</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-bold text-gray-500 uppercase mb-2">{language === 'th' ? 'ชื่อ' : 'Name'}</label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder={language === 'th' ? 'ชื่อของคุณ' : 'Your name'}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-xs font-bold text-gray-500 uppercase mb-2">{language === 'th' ? 'อีเมล' : 'Email'}</label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder={language === 'th' ? 'อีเมลของคุณ' : 'Your email'}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="contact-message" className="block text-xs font-bold text-gray-500 uppercase mb-2">{language === 'th' ? 'ข้อความ' : 'Message'}</label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={4}
                    placeholder={language === 'th' ? 'ข้อความของคุณ...' : 'Your message...'}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                  />
                </div>
                <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-lg">send</span>
                  {language === 'th' ? 'ส่งข้อความ' : 'Send Message'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
