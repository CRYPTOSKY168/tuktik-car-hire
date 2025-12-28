import admin from 'firebase-admin';
import * as fs from 'fs';

// Initialize Firebase Admin SDK
// This should only be used in server-side code (API routes, server components)

const getAdminApp = () => {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }

    // Option 1: Use GOOGLE_APPLICATION_CREDENTIALS (file path)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        try {
            const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            return admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id,
            });
        } catch (e) {
            console.error('Failed to load GOOGLE_APPLICATION_CREDENTIALS:', e);
        }
    }

    // Option 2: Use service account from environment variable (base64 encoded)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            const serviceAccount = JSON.parse(
                Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString()
            );
            return admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id,
            });
        } catch (e) {
            console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e);
        }
    }

    // Option 4: Use individual environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (projectId &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY) {
        console.log('Firebase Admin Init - Project:', projectId);
        console.log('Firebase Admin Init - Client Email:', process.env.FIREBASE_CLIENT_EMAIL?.substring(0, 20) + '...');
        console.log('Firebase Admin Init - Private Key length:', process.env.FIREBASE_PRIVATE_KEY?.length);

        try {
            const app = admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: projectId,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                }),
                projectId: projectId,
            });
            console.log('Firebase Admin initialized successfully');
            return app;
        } catch (initError: any) {
            console.error('Firebase Admin init error:', initError.message);
            throw initError;
        }
    }

    // Option 5: Use application default credentials (works in Google Cloud environment)
    try {
        return admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
    } catch (e) {
        console.error('Failed to initialize Firebase Admin with default credentials:', e);
        throw new Error(
            'Firebase Admin SDK initialization failed.\n' +
            'Please set up credentials using one of these methods:\n' +
            '1. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY env vars (recommended)\n' +
            '2. Set GOOGLE_APPLICATION_CREDENTIALS env var to path of service account JSON\n' +
            '3. Set FIREBASE_SERVICE_ACCOUNT_KEY env var (base64 encoded JSON)'
        );
    }
};

export const adminApp = getAdminApp();
export const adminAuth = admin.auth(adminApp);
export const adminDb = admin.firestore(adminApp);
