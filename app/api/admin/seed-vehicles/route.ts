import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

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
    icon: '🚗',
    iconBg: 'bg-blue-100',
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
    icon: '🚙',
    iconBg: 'bg-green-100',
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
    icon: '🚕',
    iconBg: 'bg-orange-100',
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
    icon: '✨',
    iconBg: 'bg-amber-100',
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
    icon: '🚐',
    iconBg: 'bg-yellow-100',
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
    icon: '👑',
    iconBg: 'bg-purple-100',
    image: '/images/vehicles/vip.png',
    isActive: true,
    isPopular: false,
    isVip: true,
    sortOrder: 6,
  },
];

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Check if user is admin
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (userData?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const results: { name: string; status: string; id?: string }[] = [];

    for (const vehicle of vehicleCategories) {
      // Check if vehicle with same name exists
      const existingQuery = await adminDb.collection('vehicles')
        .where('name', '==', vehicle.name)
        .get();

      if (!existingQuery.empty) {
        // Update existing
        const docId = existingQuery.docs[0].id;
        await adminDb.collection('vehicles').doc(docId).update({
          ...vehicle,
          updatedAt: FieldValue.serverTimestamp(),
        });
        results.push({ name: vehicle.name, status: 'updated', id: docId });
      } else {
        // Add new
        const docRef = await adminDb.collection('vehicles').add({
          ...vehicle,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        results.push({ name: vehicle.name, status: 'added', id: docRef.id });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Vehicle categories seeded successfully',
      results,
    });
  } catch (error: any) {
    console.error('Error seeding vehicles:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to seed vehicles' },
      { status: 500 }
    );
  }
}

// GET to check current vehicles
export async function GET(request: NextRequest) {
  try {
    const snapshot = await adminDb.collection('vehicles').orderBy('sortOrder').get();
    const vehicles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      count: vehicles.length,
      vehicles,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
