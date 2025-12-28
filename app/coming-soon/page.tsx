'use client';

import Link from 'next/link';

export default function ComingSoon() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
            <h1 className="text-4xl font-bold mb-4">Coming Soon</h1>
            <p className="text-gray-600 mb-8">This page is currently under construction.</p>
            <Link href="/" className="px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-blue-700 transition-colors">
                Return Home
            </Link>
        </div>
    );
}
