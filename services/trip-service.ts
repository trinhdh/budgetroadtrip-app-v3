import { BudgetCategory, ItineraryDay } from '@/constants/type';
import { db } from '@/firebaseConfig';
import {
    addDoc,
    collection,
    onSnapshot,
    query,
    Timestamp,
    where
} from 'firebase/firestore';

// 1. Updated Type to match your actual App Logic
export type TripData = {
    userId: string;
    origin: string;
    destination: string;
    startDate: Date | string | null;
    endDate?: Date | string | null;
    duration: number;

    travelers: { adults: number; children: number };
    budget: number;

    vehicle: { name: string; mpg: number; gasPrice: number };

    // --- UPDATED TYPES ---
    title: string;
    estimatedCost: number;
    budgetBreakdown: BudgetCategory[]; // <--- Strong typing
    itinerary: ItineraryDay[];         // <--- Strong typing

    spent: number;
    createdAt: any;
};

export const TripService = {
    /**
     * Saves a newly generated trip to Firestore
     * Uses 'Omit' to exclude fields we generate automatically (userId, createdAt)
     */
    async saveTrip(userId: string, tripData: Omit<TripData, 'userId' | 'createdAt'>) {
        try {
            // 2. Data Sanitization (Clean up before saving)
            const cleanData = {
                ...tripData,
                // Ensure numbers are actually numbers (inputs are often strings)
                vehicle: {
                    ...tripData.vehicle,
                    mpg: Number(tripData.vehicle.mpg) || 0,
                    gasPrice: Number(tripData.vehicle.gasPrice) || 0,
                },
                // Ensure dates are Date objects (better for Firestore querying)
                startDate: tripData.startDate ? new Date(tripData.startDate) : null,
            };

            // 3. Create the document
            const docRef = await addDoc(collection(db, 'trips'), {
                ...cleanData,
                userId: userId,
                createdAt: new Date(),
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
     * Returns an unsubscribe function
     */
    subscribeToUserTrips(userId: string, onUpdate: (trips: any[]) => void) {
        // Query trips for this user, ordered by creation time (optional)
        const q = query(
            collection(db, 'trips'),
            where('userId', '==', userId)
            // orderBy('startDate', 'asc') // Requires a Firestore Index (check console for link)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const trips = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Convert Timestamps to Dates immediately for easier handling
                    startDate: data.startDate instanceof Timestamp ? data.startDate.toDate() : new Date(data.startDate),
                    endDate: data.endDate instanceof Timestamp ? data.endDate.toDate() : (data.endDate ? new Date(data.endDate) : null),
                };
            });
            onUpdate(trips);
        }, (error) => {
            console.error("Error fetching trips:", error);
        });

        return unsubscribe;
    }

};