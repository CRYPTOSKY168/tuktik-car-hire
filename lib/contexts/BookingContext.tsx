'use client';

import React, { createContext, useContext, useState } from 'react';

export interface Vehicle {
  id: string;
  name: string;
  type: string;
  price: number;
  image: string;
  passengers: number;
  luggage: number;
  transmission: string;
  features: string[];
}

export interface BookingData {
  // Trip details
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  pickupTime: string;
  tripType: 'oneWay' | 'roundTrip';

  // Vehicle
  vehicle: Vehicle | null;

  // Extras
  addInsurance: boolean;
  addLuggage: boolean;

  // Personal info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  // Payment
  paymentMethod: 'card' | 'promptpay';
}

interface BookingContextType {
  bookingData: BookingData;
  updateBooking: (data: Partial<BookingData>) => void;
  calculateTotal: () => number;
  resetBooking: () => void;
}

const defaultBookingData: BookingData = {
  pickupLocation: '',
  dropoffLocation: '',
  pickupDate: '',
  pickupTime: '10:00',
  tripType: 'oneWay',
  vehicle: null,
  addInsurance: false,
  addLuggage: false,
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  paymentMethod: 'card',
};

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [bookingData, setBookingData] = useState<BookingData>(defaultBookingData);

  const updateBooking = (data: Partial<BookingData>) => {
    setBookingData((prev) => ({ ...prev, ...data }));
  };

  const calculateTotal = () => {
    if (!bookingData.vehicle) return 0;

    // Base price per trip (includes driver, fuel, tolls)
    let vehicleCost = bookingData.vehicle.price;

    // Round trip gets 1.8x multiplier (discount vs 2 one-way trips)
    if (bookingData.tripType === 'roundTrip') {
      vehicleCost = vehicleCost * 1.8;
    }

    // Travel insurance (optional)
    const insuranceCost = bookingData.addInsurance ? 500 : 0;

    // Extra luggage storage (optional)
    const luggageCost = bookingData.addLuggage ? 300 : 0;

    // Tax and fees (7% VAT)
    const tax = (vehicleCost + insuranceCost + luggageCost) * 0.07;

    return vehicleCost + insuranceCost + luggageCost + tax;
  };

  const resetBooking = () => {
    setBookingData(defaultBookingData);
  };

  return (
    <BookingContext.Provider
      value={{
        bookingData,
        updateBooking,
        calculateTotal,
        resetBooking,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
}
