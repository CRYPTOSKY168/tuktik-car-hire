'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthToken } from '@/lib/hooks/useAuthToken';

interface VehicleResult {
  name: string;
  status: 'added' | 'updated';
  id?: string;
}

export default function SeedVehiclesPage() {
  const router = useRouter();
  const { getAuthHeaders } = useAuthToken();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VehicleResult[]>([]);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const vehicleCategories = [
    { name: 'Economy', price: 850, passengers: 4, luggage: 2, description: 'Toyota Vios, Honda City', icon: '🚗', iconBg: 'bg-blue-100' },
    { name: 'Comfort', price: 1200, passengers: 4, luggage: 3, description: 'Toyota Camry, Honda Accord', badge: 'ยอดนิยม', icon: '🚙', iconBg: 'bg-green-100' },
    { name: 'SUV', price: 1500, passengers: 6, luggage: 4, description: 'Toyota Fortuner, Honda CR-V', icon: '🚕', iconBg: 'bg-orange-100' },
    { name: 'Premium', price: 2500, passengers: 4, luggage: 3, description: 'Mercedes E-Class, BMW 5 Series', badge: 'VIP', icon: '✨', iconBg: 'bg-amber-100' },
    { name: 'Van', price: 1800, passengers: 10, luggage: 8, description: 'Toyota Hiace, Hyundai H1', icon: '🚐', iconBg: 'bg-yellow-100' },
    { name: 'VIP', price: 3500, passengers: 6, luggage: 4, description: 'Toyota Alphard, Mercedes V-Class', badge: 'VIP', icon: '👑', iconBg: 'bg-purple-100' },
  ];

  const handleSeed = async () => {
    setLoading(true);
    setError('');
    setResults([]);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/seed-vehicles', {
        method: 'POST',
        headers,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to seed vehicles');
      }

      setResults(data.results);
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            กลับ
          </button>
          <h1 className="text-2xl font-bold text-gray-800">เพิ่มประเภทรถใหม่</h1>
          <p className="text-gray-600">เพิ่ม 6 ประเภทรถลงในฐานข้อมูล</p>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">ประเภทรถที่จะเพิ่ม</h2>
          <div className="space-y-3">
            {vehicleCategories.map((v) => (
              <div
                key={v.name}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
              >
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${v.iconBg}`}>
                  <span className="text-2xl">{v.icon}</span>
                </div>
                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{v.name}</span>
                    {v.badge && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        v.badge === 'VIP'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {v.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{v.description}</p>
                  <div className="flex gap-4 text-sm text-gray-500 mt-1">
                    <span>👤 {v.passengers} คน</span>
                    <span>🧳 {v.luggage} ใบ</span>
                  </div>
                </div>
                {/* Price */}
                <div className="text-right">
                  <span className="text-xl font-bold text-blue-600">฿{v.price.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {!done ? (
            <>
              <p className="text-gray-600 mb-4">
                กดปุ่มด้านล่างเพื่อเพิ่มประเภทรถทั้งหมดลงในฐานข้อมูล
                ถ้ามีรถชื่อเดียวกันอยู่แล้ว ระบบจะอัปเดตข้อมูลแทน
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <button
                onClick={handleSeed}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    กำลังเพิ่มข้อมูล...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">add</span>
                    เพิ่มประเภทรถทั้งหมด
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">check_circle</span>
                เพิ่มข้อมูลสำเร็จ!
              </div>

              <div className="space-y-2 mb-4">
                {results.map((r) => (
                  <div
                    key={r.name}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium">{r.name}</span>
                    <span className={`text-sm px-2 py-1 rounded ${
                      r.status === 'added'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {r.status === 'added' ? 'เพิ่มใหม่' : 'อัปเดต'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/admin/vehicles')}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">directions_car</span>
                  ไปหน้าจัดการรถ
                </button>
                <button
                  onClick={() => router.push('/admin')}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300"
                >
                  กลับหน้าหลัก
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
