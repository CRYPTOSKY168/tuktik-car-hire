'use client';

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
                <p className="text-gray-600 mb-4">Last updated: January 5, 2026</p>

                <div className="space-y-6 text-gray-700">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
                        <p>
                            TukTik (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the TukTik mobile application.
                            This Privacy Policy explains how we collect, use, and protect your personal information
                            when you use our airport transfer booking service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li><strong>Personal Information:</strong> Name, phone number, email address</li>
                            <li><strong>Location Data:</strong> Pickup and drop-off locations for your trips</li>
                            <li><strong>Payment Information:</strong> Payment method details (processed securely via third-party providers)</li>
                            <li><strong>Device Information:</strong> Device type, operating system, app version</li>
                            <li><strong>Usage Data:</strong> Booking history, app interactions</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>To process and manage your bookings</li>
                            <li>To connect you with drivers</li>
                            <li>To send booking confirmations and updates</li>
                            <li>To process payments</li>
                            <li>To improve our services</li>
                            <li>To provide customer support</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Information Sharing</h2>
                        <p>We share your information only with:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                            <li><strong>Drivers:</strong> Name, phone number, and pickup/drop-off locations to complete your trip</li>
                            <li><strong>Payment Processors:</strong> To process your payments securely</li>
                            <li><strong>Legal Requirements:</strong> When required by law</li>
                        </ul>
                        <p className="mt-2">We do not sell your personal information to third parties.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Security</h2>
                        <p>
                            We implement industry-standard security measures to protect your data, including:
                        </p>
                        <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                            <li>Encrypted data transmission (HTTPS/TLS)</li>
                            <li>Secure cloud storage (Firebase/Google Cloud)</li>
                            <li>Access controls and authentication</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Your Rights</h2>
                        <p>You have the right to:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                            <li>Access your personal data</li>
                            <li>Request correction of inaccurate data</li>
                            <li>Request deletion of your account and data</li>
                            <li>Opt-out of marketing communications</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Location Services</h2>
                        <p>
                            Our app uses location services to:
                        </p>
                        <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                            <li>Determine your pickup location</li>
                            <li>Track driver location during your trip</li>
                            <li>Calculate accurate routes and fares</li>
                        </ul>
                        <p className="mt-2">
                            You can disable location services in your device settings, but some features may not work properly.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Push Notifications</h2>
                        <p>
                            We send push notifications for booking updates, driver arrivals, and promotions.
                            You can manage notification preferences in your device settings.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Data Retention</h2>
                        <p>
                            We retain your data for as long as your account is active or as needed to provide services.
                            Booking history is kept for 2 years for legal and business purposes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Children&apos;s Privacy</h2>
                        <p>
                            Our service is not intended for children under 13. We do not knowingly collect
                            personal information from children under 13.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Changes to This Policy</h2>
                        <p>
                            We may update this Privacy Policy from time to time. We will notify you of significant
                            changes through the app or via email.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Contact Us</h2>
                        <p>
                            If you have questions about this Privacy Policy, please contact us at:
                        </p>
                        <ul className="list-none space-y-1 ml-4 mt-2">
                            <li><strong>Email:</strong> support@tuktik.app</li>
                            <li><strong>Website:</strong> https://car-rental-phi-lime.vercel.app</li>
                        </ul>
                    </section>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                    <p className="text-sm text-gray-500 text-center">
                        &copy; 2026 TukTik. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
