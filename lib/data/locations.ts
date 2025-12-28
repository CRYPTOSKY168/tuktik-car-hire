export interface Location {
  id: string;
  name: {
    en: string;
    th: string;
  };
  type: 'airport' | 'city' | 'province';
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export const locations: Location[] = [
  {
    id: 'bkk-airport',
    name: { en: 'Suvarnabhumi Airport (BKK)', th: 'สนามบินสุวรรณภูมิ (BKK)' },
    type: 'airport',
    coordinates: { lat: 13.6900, lng: 100.7501 },
  },
  {
    id: 'dmk-airport',
    name: { en: 'Don Mueang Airport (DMK)', th: 'สนามบินดอนเมือง (DMK)' },
    type: 'airport',
    coordinates: { lat: 13.9125, lng: 100.6067 },
  },
  {
    id: 'cnx-airport',
    name: { en: 'Chiang Mai Airport (CNX)', th: 'สนามบินเชียงใหม่ (CNX)' },
    type: 'airport',
    coordinates: { lat: 18.7677, lng: 98.9640 },
  },
  {
    id: 'hkt-airport',
    name: { en: 'Phuket Airport (HKT)', th: 'สนามบินภูเก็ต (HKT)' },
    type: 'airport',
    coordinates: { lat: 8.1119, lng: 98.3065 },
  },
  {
    id: 'usm-airport',
    name: { en: 'Samui Airport (USM)', th: 'สนามบินสมุย (USM)' },
    type: 'airport',
    coordinates: { lat: 9.5516, lng: 100.0617 },
  },
  {
    id: 'bangkok',
    name: { en: 'Bangkok City Center', th: 'กรุงเทพฯ เขตเมือง' },
    type: 'city',
    coordinates: { lat: 13.7563, lng: 100.5018 },
  },
  {
    id: 'pattaya',
    name: { en: 'Pattaya', th: 'พัทยา' },
    type: 'city',
    coordinates: { lat: 12.9236, lng: 100.8824 },
  },
  {
    id: 'chiang-mai',
    name: { en: 'Chiang Mai City', th: 'เชียงใหม่ เขตเมือง' },
    type: 'city',
    coordinates: { lat: 18.7883, lng: 98.9853 },
  },
  {
    id: 'phuket-town',
    name: { en: 'Phuket Town', th: 'ภูเก็ต เขตเมือง' },
    type: 'city',
    coordinates: { lat: 7.8804, lng: 98.3923 },
  },
  {
    id: 'patong',
    name: { en: 'Patong Beach', th: 'หาดป่าตอง' },
    type: 'city',
    coordinates: { lat: 7.8960, lng: 98.2953 },
  },
  {
    id: 'krabi',
    name: { en: 'Krabi', th: 'กระบี่' },
    type: 'province',
    coordinates: { lat: 8.0863, lng: 98.9063 },
  },
  {
    id: 'hua-hin',
    name: { en: 'Hua Hin', th: 'หัวหิน' },
    type: 'province',
    coordinates: { lat: 12.5684, lng: 99.9577 },
  },
  {
    id: 'ayutthaya',
    name: { en: 'Ayutthaya', th: 'พระนครศรีอยุธยา' },
    type: 'province',
    coordinates: { lat: 14.3532, lng: 100.5693 },
  },
  {
    id: 'chiang-rai',
    name: { en: 'Chiang Rai', th: 'เชียงราย' },
    type: 'province',
    coordinates: { lat: 19.9105, lng: 99.8406 },
  },
  {
    id: 'koh-samui',
    name: { en: 'Koh Samui', th: 'เกาะสมุย' },
    type: 'province',
    coordinates: { lat: 9.5120, lng: 100.0136 },
  },
];

export const popularRoutes = [
  {
    from: 'bkk-airport',
    to: 'pattaya',
    distance: '147 km',
  },
  {
    from: 'bkk-airport',
    to: 'hua-hin',
    distance: '230 km',
  },
  {
    from: 'cnx-airport',
    to: 'chiang-rai',
    distance: '180 km',
  },
  {
    from: 'hkt-airport',
    to: 'krabi',
    distance: '165 km',
  },
  {
    from: 'bangkok',
    to: 'ayutthaya',
    distance: '80 km',
  },
];
