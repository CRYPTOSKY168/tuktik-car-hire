// Script to add vehicle categories to Firestore
// Run with: node scripts/add-vehicle-categories.js

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

const vehicleCategories = [
  {
    name: 'Economy',
    nameEn: 'Economy',
    nameTh: 'รถประหยัด',
    type: 'sedan',
    description: 'Toyota Vios, Honda City',
    descriptionTh: 'โตโยต้า วีออส, ฮอนด้า ซิตี้',
    seats: 4,
    passengers: 4,
    luggage: 2,
    price: 850,
    priceUSD: 25,
    waitTime: '2-4',
    features: ['คนขับมืออาชีพ', 'รวมทางด่วน', 'ประกันภัย'],
    featuresEn: ['Professional Driver', 'Expressway Included', 'Insurance'],
    image: '/images/vehicles/economy.png',
    isActive: true,
    isPopular: false,
    isVip: false,
    sortOrder: 1,
  },
  {
    name: 'Comfort',
    nameEn: 'Comfort',
    nameTh: 'รถสบาย',
    type: 'sedan',
    description: 'Toyota Camry, Honda Accord',
    descriptionTh: 'โตโยต้า คัมรี่, ฮอนด้า แอคคอร์ด',
    seats: 4,
    passengers: 4,
    luggage: 3,
    price: 1200,
    priceUSD: 35,
    waitTime: '3-5',
    features: ['คนขับมืออาชีพ', 'รวมทางด่วน', 'ประกันภัย', 'น้ำดื่มฟรี'],
    featuresEn: ['Professional Driver', 'Expressway Included', 'Insurance', 'Free Water'],
    image: '/images/vehicles/comfort.png',
    isActive: true,
    isPopular: true,
    isVip: false,
    sortOrder: 2,
  },
  {
    name: 'SUV',
    nameEn: 'SUV',
    nameTh: 'รถอเนกประสงค์',
    type: 'suv',
    description: 'Toyota Fortuner, Honda CR-V',
    descriptionTh: 'โตโยต้า ฟอร์จูนเนอร์, ฮอนด้า ซีอาร์-วี',
    seats: 6,
    passengers: 6,
    luggage: 4,
    price: 1500,
    priceUSD: 45,
    waitTime: '5-8',
    features: ['คนขับมืออาชีพ', 'รวมทางด่วน', 'ประกันภัย', 'พื้นที่กว้างขวาง'],
    featuresEn: ['Professional Driver', 'Expressway Included', 'Insurance', 'Spacious'],
    image: '/images/vehicles/suv.png',
    isActive: true,
    isPopular: false,
    isVip: false,
    sortOrder: 3,
  },
  {
    name: 'Premium',
    nameEn: 'Premium',
    nameTh: 'รถพรีเมียม',
    type: 'luxury',
    description: 'Mercedes E-Class, BMW 5 Series',
    descriptionTh: 'เมอร์เซเดส อี-คลาส, บีเอ็มดับเบิลยู ซีรีส์ 5',
    seats: 4,
    passengers: 4,
    luggage: 3,
    price: 2500,
    priceUSD: 75,
    waitTime: '8-12',
    features: ['คนขับมืออาชีพ', 'รวมทางด่วน', 'ประกันภัย', 'น้ำดื่มฟรี', 'WiFi'],
    featuresEn: ['Professional Driver', 'Expressway Included', 'Insurance', 'Free Water', 'WiFi'],
    image: '/images/vehicles/premium.png',
    isActive: true,
    isPopular: false,
    isVip: true,
    sortOrder: 4,
  },
  {
    name: 'Van',
    nameEn: 'Van',
    nameTh: 'รถตู้',
    type: 'van',
    description: 'Toyota Hiace, Hyundai H1',
    descriptionTh: 'โตโยต้า ไฮเอซ, ฮุนได เอชวัน',
    seats: 10,
    passengers: 10,
    luggage: 8,
    price: 1800,
    priceUSD: 55,
    waitTime: '10-15',
    features: ['คนขับมืออาชีพ', 'รวมทางด่วน', 'ประกันภัย', 'เหมาะกับกลุ่ม'],
    featuresEn: ['Professional Driver', 'Expressway Included', 'Insurance', 'Group Friendly'],
    image: '/images/vehicles/van.png',
    isActive: true,
    isPopular: false,
    isVip: false,
    sortOrder: 5,
  },
  {
    name: 'VIP',
    nameEn: 'VIP',
    nameTh: 'รถวีไอพี',
    type: 'luxury',
    description: 'Toyota Alphard, Mercedes V-Class',
    descriptionTh: 'โตโยต้า อัลฟาร์ด, เมอร์เซเดส วี-คลาส',
    seats: 6,
    passengers: 6,
    luggage: 4,
    price: 3500,
    priceUSD: 105,
    waitTime: '15-20',
    features: ['คนขับมืออาชีพ', 'รวมทางด่วน', 'ประกันภัย', 'น้ำดื่มฟรี', 'WiFi', 'ที่นั่ง Captain Seat'],
    featuresEn: ['Professional Driver', 'Expressway Included', 'Insurance', 'Free Water', 'WiFi', 'Captain Seats'],
    image: '/images/vehicles/vip.png',
    isActive: true,
    isPopular: false,
    isVip: true,
    sortOrder: 6,
  },
];

async function addVehicles() {
  console.log('Starting to add vehicle categories...\n');

  for (const vehicle of vehicleCategories) {
    try {
      // Check if vehicle with same name exists
      const existingQuery = await db.collection('vehicles')
        .where('name', '==', vehicle.name)
        .get();

      if (!existingQuery.empty) {
        console.log(`⚠️  ${vehicle.name} already exists, updating...`);
        const docId = existingQuery.docs[0].id;
        await db.collection('vehicles').doc(docId).update({
          ...vehicle,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ Updated: ${vehicle.name}`);
      } else {
        const docRef = await db.collection('vehicles').add({
          ...vehicle,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ Added: ${vehicle.name} (ID: ${docRef.id})`);
      }
    } catch (error) {
      console.error(`❌ Error adding ${vehicle.name}:`, error.message);
    }
  }

  console.log('\n✅ Done! All vehicle categories have been processed.');
  process.exit(0);
}

addVehicles().catch(console.error);
