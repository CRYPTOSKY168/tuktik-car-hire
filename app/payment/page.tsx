'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBooking } from '@/lib/contexts/BookingContext';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import Button from '@/components/ui/Button';
import BookingSummary from '@/components/booking/BookingSummary';

export default function PaymentPage() {
  const router = useRouter();
  const { bookingData, updateBooking } = useBooking();
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    firstName: bookingData.firstName || '',
    lastName: bookingData.lastName || '',
    email: bookingData.email || '',
    phone: bookingData.phone || '',
    paymentMethod: bookingData.paymentMethod || 'card',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    promptpayNumber: '',
    agreeTerms: false,
  });

  const [processing, setProcessing] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agreeTerms) {
      alert('Please agree to the terms and conditions');
      return;
    }

    setProcessing(true);

    // Update booking data
    updateBooking({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      paymentMethod: formData.paymentMethod as 'card' | 'promptpay',
      addInsurance: bookingData.addInsurance,
      addLuggage: bookingData.addLuggage,
    });

    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      router.push('/confirmation');
    }, 2000);
  };

  if (!bookingData.vehicle) {
    router.push('/vehicles');
    return null;
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {t.payment.title}
          </h1>
          <p className="text-xl text-gray-600">{t.payment.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Payment Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {t.payment.personalInfo}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t.payment.firstName} *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t.payment.lastName} *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t.payment.email} *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t.payment.phone} *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      placeholder="08X-XXX-XXXX"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Add-ons */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Add-ons</h2>

                {/* Driver Included Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <strong>{t.booking.driverIncluded}</strong>
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="flex items-start p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={bookingData.addInsurance}
                      onChange={(e) => updateBooking({ addInsurance: e.target.checked })}
                      className="w-5 h-5 text-blue-600 focus:ring-blue-500 rounded mt-1"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {t.booking.insurance}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Comprehensive travel insurance for your peace of mind
                          </p>
                        </div>
                        <p className="font-semibold text-blue-600">฿500</p>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={bookingData.addLuggage}
                      onChange={(e) => updateBooking({ addLuggage: e.target.checked })}
                      className="w-5 h-5 text-blue-600 focus:ring-blue-500 rounded mt-1"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {t.booking.extraLuggage}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Additional luggage storage space for extra bags
                          </p>
                        </div>
                        <p className="font-semibold text-blue-600">฿300</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {t.payment.paymentMethod}
                </h2>

                {/* Payment Method Selection */}
                <div className="flex gap-4 mb-6">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={formData.paymentMethod === 'card'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div
                      className={`p-4 border-2 rounded-lg text-center transition ${
                        formData.paymentMethod === 'card'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <svg
                        className="w-8 h-8 mx-auto mb-2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span className="font-semibold">{t.payment.creditCard}</span>
                    </div>
                  </label>

                  <label className="flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="promptpay"
                      checked={formData.paymentMethod === 'promptpay'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div
                      className={`p-4 border-2 rounded-lg text-center transition ${
                        formData.paymentMethod === 'promptpay'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <svg
                        className="w-8 h-8 mx-auto mb-2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      <span className="font-semibold">{t.payment.promptpay}</span>
                    </div>
                  </label>
                </div>

                {/* Card Payment Fields */}
                {formData.paymentMethod === 'card' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {t.payment.cardNumber} *
                      </label>
                      <input
                        type="text"
                        name="cardNumber"
                        value={formData.cardNumber}
                        onChange={handleChange}
                        required
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t.payment.expiryDate} *
                        </label>
                        <input
                          type="text"
                          name="expiryDate"
                          value={formData.expiryDate}
                          onChange={handleChange}
                          required
                          placeholder="MM/YY"
                          maxLength={5}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t.payment.cvv} *
                        </label>
                        <input
                          type="text"
                          name="cvv"
                          value={formData.cvv}
                          onChange={handleChange}
                          required
                          placeholder="123"
                          maxLength={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* PromptPay Fields */}
                {formData.paymentMethod === 'promptpay' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t.payment.promptpayNumber} *
                    </label>
                    <input
                      type="tel"
                      name="promptpayNumber"
                      value={formData.promptpayNumber}
                      onChange={handleChange}
                      required
                      placeholder="08X-XXX-XXXX"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                {/* Terms and Conditions */}
                <div className="mt-6">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      name="agreeTerms"
                      checked={formData.agreeTerms}
                      onChange={handleChange}
                      required
                      className="w-5 h-5 text-blue-600 focus:ring-blue-500 rounded mt-1"
                    />
                    <span className="ml-3 text-gray-700">{t.payment.terms}</span>
                  </label>
                </div>

                {/* Submit Button */}
                <div className="mt-8">
                  <Button
                    type="submit"
                    disabled={processing}
                    className="w-full"
                    size="lg"
                  >
                    {processing ? t.payment.processing : t.payment.completeBooking}
                  </Button>
                </div>
              </div>
            </div>

            {/* Booking Summary */}
            <div className="lg:col-span-1">
              <BookingSummary />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
