import { db } from '@/firebaseConfig';
import {
    addDoc,
    collection,
    onSnapshot,
    query,
    Timestamp,
    Unsubscribe,
    where
} from 'firebase/firestore';

// 1. Import shared types (Ensure file name matches, e.g. 'types.ts')
import { Trip, TripPayload } from '@/constants/types';

export const TripService = {
    /**
     * Saves a newly generated trip to Firestore
     * We use 'TripPayload' because the ID hasn't been generated yet.
     */
    async saveTrip(userId: string, tripData: Omit<TripPayload, 'userId' | 'createdAt'>) {
        try {
            // 2. Data Sanitization
            const cleanData = {
                ...tripData,
                vehicle: {
                    ...tripData.vehicle,
                    mpg: Number(tripData.vehicle.mpg) || 0,
                    gasPrice: Number(tripData.vehicle.gasPrice) || 0,
                },
                // Ensure dates are Date objects
                startDate: tripData.startDate ? new Date(tripData.startDate) : null,
                endDate: tripData.endDate ? new Date(tripData.endDate) : null,
            };

            // 3. Create the document
            const docRef = await addDoc(collection(db, 'trips'), {
                ...cleanData,
                userId: userId,
                createdAt: new Date(), // Server timestamp
            });

            console.log("Trip saved with ID: ", docRef.id);
            return docRef.id;
        } catch (error) {
            console.error("Error adding trip: ", error);
            throw error;
        }
    },

    /**
     * Real-time listener for a user's trips
     */
    subscribeToUserTrips(userId: string, onUpdate: (trips: Trip[]) => void): Unsubscribe {
        const q = query(
            collection(db, 'trips'),
            where('userId', '==', userId)
        );

        return onSnapshot(q, (snapshot) => {
            const trips = snapshot.docs.map(doc => {
                const data = doc.data();

                // 4. Map Firestore data to your strict 'Trip' type
                return {
                    ...data,
                    id: doc.id,
                    // safe timestamp conversion
                    startDate: data.startDate instanceof Timestamp ? data.startDate.toDate() : (data.startDate ? new Date(data.startDate) : null),
                    endDate: data.endDate instanceof Timestamp ? data.endDate.toDate() : (data.endDate ? new Date(data.endDate) : null),
                } as Trip;
            });

            onUpdate(trips);
        }, (error) => {
            console.error("Error fetching trips:", error);
        });
    }
};