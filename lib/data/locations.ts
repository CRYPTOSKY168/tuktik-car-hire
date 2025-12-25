export interface Location {
  id: string;
  name: {
    en: string;
    th: string;
  };
  type: 'airport' | 'city' | 'province';
}

export const locations: Location[] = [
  {
    id: 'bkk-airport',
    name: { en: 'Suvarnabhumi Airport (BKK)', th: 'สนามบินสุวรรณภูมิ (BKK)' },
    type: 'airport',
  },
  {
    id: 'dmk-airport',
    name: { en: 'Don Mueang Airport (DMK)', th: 'สนามบินดอนเมือง (DMK)' },
    type: 'airport',
  },
  {
    id: 'cnx-airport',
    name: { en: 'Chiang Mai Airport (CNX)', th: 'สนามบินเชียงใหม่ (CNX)' },
    type: 'airport',
  },
  {
    id: 'hkt-airport',
    name: { en: 'Phuket Airport (HKT)', th: 'สนามบินภูเก็ต (HKT)' },
    type: 'airport',
  },
  {
    id: 'usm-airport',
    name: { en: 'Samui Airport (USM)', th: 'สนามบินสมุย (USM)' },
    type: 'airport',
  },
  {
    id: 'bangkok',
    name: { en: 'Bangkok City Center', th: 'กรุงเทพฯ เขตเมือง' },
    type: 'city',
  },
  {
    id: 'pattaya',
    name: { en: 'Pattaya', th: 'พัทยา' },
    type: 'city',
  },
  {
    id: 'chiang-mai',
    name: { en: 'Chiang Mai City', th: 'เชียงใหม่ เขตเมือง' },
    type: 'city',
  },
  {
    id: 'phuket-town',
    name: { en: 'Phuket Town', th: 'ภูเก็ต เขตเมือง' },
    type: 'city',
  },
  {
    id: 'patong',
    name: { en: 'Patong Beach', th: 'หาดป่าตอง' },
    type: 'city',
  },
  {
    id: 'krabi',
    name: { en: 'Krabi', th: 'กระบี่' },
    type: 'province',
  },
  {
    id: 'hua-hin',
    name: { en: 'Hua Hin', th: 'หัวหิน' },
    type: 'province',
  },
  {
    id: 'ayutthaya',
    name: { en: 'Ayutthaya', th: 'พระนครศรีอยุธยา' },
    type: 'province',
  },
  {
    id: 'chiang-rai',
    name: { en: 'Chiang Rai', th: 'เชียงราย' },
    type: 'province',
  },
  {
    id: 'koh-samui',
    name: { en: 'Koh Samui', th: 'เกาะสมุย' },
    type: 'province',
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
