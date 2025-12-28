
import { storage } from './config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const StorageService = {
    async uploadSlip(file: File): Promise<string> {
        // Fail-safe: If storage is not initialized or fails, return a mock URL
        // so the user flow is not blocked.
        if (!storage) {
            console.warn("Firebase Storage not initialized. Using mock URL.");
            return this.getMockUrl(file);
        }

        // Production Mode: We want to fail strictly if upload fails,
        // so the user knows to retry. No silent mocks.
        const filename = `slips/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, filename);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        return url;
    },

    async getMockUrl(file: File): Promise<string> {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    // Compress to JPEG with 0.5 quality to ensure small size (<1MB)
                    resolve(canvas.toDataURL('image/jpeg', 0.5));
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    },

    async uploadProfileImage(file: File, userId: string): Promise<string> {
        if (!storage) {
            console.warn("Firebase Storage not initialized. Using mock URL.");
            return this.getMockUrl(file);
        }

        // Production Mode: Strict upload
        const extension = file.name.split('.').pop();
        const filename = `profile_images/${userId}/${Date.now()}.${extension}`;
        const storageRef = ref(storage, filename);

        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        return url;
    },

    async uploadVehicleImage(file: Blob | File, vehicleId: string): Promise<string> {
        if (!storage) {
            console.warn("Storage not init");
            return "";
        }
        const extension = 'jpg'; // Default for scraped images
        const filename = `vehicles/${vehicleId}-${Date.now()}.${extension}`;
        const storageRef = ref(storage, filename);
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
    },

    async uploadDriverDocument(file: File, userId: string, docType: 'id_card' | 'driver_license'): Promise<string> {
        if (!storage) {
            console.warn("Firebase Storage not initialized. Using mock URL.");
            return this.getMockUrl(file);
        }

        const extension = file.name.split('.').pop() || 'jpg';
        const filename = `driver_documents/${userId}/${docType}_${Date.now()}.${extension}`;
        const storageRef = ref(storage, filename);

        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        return url;
    }
};
