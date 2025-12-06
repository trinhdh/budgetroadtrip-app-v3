import { BudgetCategory, ItineraryDay } from '@/constants/type';
import { db } from '@/firebaseConfig';
import { addDoc, collection } from 'firebase/firestore';

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

    vehicle: { name: string; mpg: string | number; gasPrice: string | number };

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
                // Add default status
                status: 'active',
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
    }
};