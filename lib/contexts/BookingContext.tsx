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
  isFixedPrice?: boolean;
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

  // Additional booking details
  flightNumber: string;
  passengerCount: number;
  luggageCount: number;
  specialRequests: string;

  // Payment
  paymentMethod: 'card' | 'promptpay' | 'bank_transfer' | 'cash';
}

interface BookingContextType {
  bookingData: BookingData;
  updateBooking: (data: Partial<BookingData>) => void;
  calculateTotal: () => number;
  resetBooking: () => void;
  locations: any[];
  routes: any[];
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
  flightNumber: '',
  passengerCount: 1,
  luggageCount: 1,
  specialRequests: '',
  paymentMethod: 'card',
};

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [bookingData, setBookingData] = useState<BookingData>(defaultBookingData);
  const [locations, setLocations] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);

  // Fetch locations & routes from Firestore on mount
  React.useEffect(() => {
    import('@/lib/firebase/firestore').then(({ FirestoreService }) => {
      // Fetch Locations
      FirestoreService.getLocations().then(data => {
        if (data.length > 0) {
          setLocations(data.filter(l => l.isActive !== false));
        } else {
          // Fallback to static if DB empty
          import('@/lib/data/locations').then(m => setLocations(m.locations));
        }
      });

      // Fetch Routes
      FirestoreService.getRoutes().then(data => {
        setRoutes(data);
      });
    });
  }, []);

  const updateBooking = (data: Partial<BookingData>) => {
    setBookingData((prev) => ({ ...prev, ...data }));
  };

  const calculateTotal = () => {
    if (!bookingData.vehicle) return 0;

    // Base price per trip (includes driver, fuel, tolls)
    let vehicleCost = Number(bookingData.vehicle.price);

    // If it's a fixed price route (from Admin), skip distance calculation
    if (bookingData.vehicle.isFixedPrice) {
      // Keep vehicleCost as is (it's already the fixed route price)
    } else {
      // Advanced Pricing Engine: Distance Based
      // Use dynamic locations state
      const findLoc = (name: string) => locations.find(l => l.name?.en === name || l.name?.th === name);
      const pickupLoc = findLoc(bookingData.pickupLocation) as any;
      const dropoffLoc = findLoc(bookingData.dropoffLocation) as any;

      if (pickupLoc?.coordinates && dropoffLoc?.coordinates) {
        const R = 6371;
        const dLat = (dropoffLoc.coordinates.lat - pickupLoc.coordinates.lat) * Math.PI / 180;
        const dLon = (dropoffLoc.coordinates.lng - pickupLoc.coordinates.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(pickupLoc.coordinates.lat * Math.PI / 180) * Math.cos(dropoffLoc.coordinates.lat * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        // Rate Card (THB per km)
        let rate = 30;
        const type = bookingData.vehicle.type?.toLowerCase();
        if (type === 'sedan') rate = 25;
        else if (type === 'suv') rate = 35;
        else if (type === 'van') rate = 45;
        else if (type === 'luxury' || Number(bookingData.vehicle.price) > 2000) rate = 60;

        // Price calculation: Base price (covers first 30km) + Distance * Rate
        // We ensure the price never drops below standard base price
        const calculatedPrice = Number(bookingData.vehicle.price) + (Math.max(0, distance - 30) * rate);
        vehicleCost = Math.round(calculatedPrice);
      }
    }

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
        locations, // Expose dynamic locations
        routes,    // Expose routes
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
