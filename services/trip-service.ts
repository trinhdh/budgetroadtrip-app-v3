// services/trip-service.ts

import { db } from '@/firebaseConfig';
import {
    addDoc,
    arrayUnion,
    collection,
    deleteDoc,
    deleteField,
    doc,
    getDoc,
    getDocs,
    increment,
    onSnapshot,
    orderBy,
    query,
    Timestamp,
    Unsubscribe,
    updateDoc,
    where,
    writeBatch
} from 'firebase/firestore';

// Import Types
import { GeoPoint, ItineraryItem, Trip, TripMember, TripPayload } from '@/constants/types';
/**
 * HELPER: Removes 'undefined' values from an object or array to make it Firestore-safe.
 * Firestore throws an error if a field is undefined. We replace them with null or remove keys.
 * Using JSON stringify/parse is a robust, fast way to strip undefineds for complex nested objects.
 */
const firestoreSanitize = <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj, (k, v) => v === undefined ? null : v));
};
export const TripService = {
    /**
     * Saves a newly generated trip to Firestore
     */
    async saveTrip(userId: string, tripData: TripPayload) {
        try {
            // 1. Data Sanitization
            const rawData = {
                ...tripData,
                // Nested object safety
                vehicle: {
                    name: tripData.vehicle?.name || '',
                    mpg: Number(tripData.vehicle?.mpg) || 0,
                    gasPrice: Number(tripData.vehicle?.gasPrice) || 0,
                },
                travelers: {
                    adults: Number(tripData.travelers?.adults) || 1,
                    children: Number(tripData.travelers?.children) || 0,
                },
                originCoordinates: tripData.originCoordinates ? {
                    lat: tripData.originCoordinates.lat,
                    lng: tripData.originCoordinates.lng
                } : null,

                // Explicitly handle aiNote to ensure it's null if undefined
                aiNote: tripData.aiNote || null,

                // Ensure dates are Date objects
                startDate: tripData.startDate ? new Date(tripData.startDate) : null,
                endDate: tripData.endDate ? new Date(tripData.endDate) : null,
                createdAt: new Date(),
                userId: userId,
            };

            // 2. DEEP SANITIZE: This fixes the "Itinerary" containing undefined optional fields
            // (like rating, user_ratings_total in GooglePlace objects)
            const cleanData = firestoreSanitize(rawData);

            // 3. Create the document
            const docRef = await addDoc(collection(db, 'trips'), cleanData);

            console.log("Trip saved with ID: ", docRef.id);
            return docRef.id;
        } catch (error) {
            console.error("Error adding trip: ", error);
            throw error;
        }
    },

    /**
     * Updates the custom notes for a trip.
     */
    async updateTripNotes(tripId: string, notes: string): Promise<void> {
        try {
            const tripRef = doc(db, 'trips', tripId);
            await updateDoc(tripRef, {
                notes: notes,
            });
        } catch (error) {
            console.error("Error updating trip notes:", error);
            throw error;
        }
    },

    /**
     * Updates the title and description of a single day in the itinerary array.
     */
    async updateDayDetails(tripId: string, dayIndex: number, updatedDetails: { title: string, description: string }): Promise<void> {
        try {
            const tripRef = doc(db, 'trips', tripId);
            const tripSnap = await getDoc(tripRef);

            if (tripSnap.exists()) {
                const tripData = tripSnap.data();
                const itinerary = tripData.itinerary || [];

                if (itinerary[dayIndex]) {
                    // Update only the necessary fields
                    const updatedDay = {
                        ...itinerary[dayIndex],
                        title: updatedDetails.title,
                        description: updatedDetails.description,
                    };

                    // Create a new itinerary array with the updated day item
                    const newItinerary = [
                        ...itinerary.slice(0, dayIndex),
                        updatedDay,
                        ...itinerary.slice(dayIndex + 1),
                    ];

                    await updateDoc(tripRef, { itinerary: newItinerary });
                }
            }
        } catch (error) {
            console.error("Error updating day details:", error);
            throw error;
        }
    },


    /**
 * Adds a full member object to the trip's members array.
 */
    async addMemberToTrip(tripId: string, member: TripMember): Promise<void> {
        try {
            const tripRef = doc(db, 'trips', tripId);

            // Use arrayUnion to append the object only if it doesn't already exist
            await updateDoc(tripRef, {
                members: arrayUnion(member)
            });
        } catch (error) {
            console.error("Error adding member to trip:", error);
            throw error;
        }
    },

    subscribeToUserTrips(userId: string, onUpdate: (trips: Trip[]) => void): Unsubscribe {
        const q = query(
            collection(db, 'trips'),
            where('userId', '==', userId)
        );

        return onSnapshot(q, (snapshot) => {
            const trips = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    startDate: data.startDate instanceof Timestamp ? data.startDate.toDate() : (data.startDate ? new Date(data.startDate) : null),
                    endDate: data.endDate instanceof Timestamp ? data.endDate.toDate() : (data.endDate ? new Date(data.endDate) : null),
                } as Trip;
            });
            onUpdate(trips);
        }, (error) => {
            console.error("Error fetching trips:", error);
        });
    },

    subscribeToTrip(tripId: string, onUpdate: (trip: Trip | null) => void): Unsubscribe {
        const ref = doc(db, 'trips', tripId);

        return onSnapshot(ref, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const tripData = {
                    id: docSnap.id,
                    ...data,
                    startDate: data.startDate instanceof Timestamp ? data.startDate.toDate() : (data.startDate ? new Date(data.startDate) : null),
                    endDate: data.endDate instanceof Timestamp ? data.endDate.toDate() : (data.endDate ? new Date(data.endDate) : null),
                } as Trip;
                onUpdate(tripData);
            } else {
                onUpdate(null);
            }
        }, (error) => {
            console.error("Error fetching trip details:", error);
        });
    },

    async deleteTrip(tripId: string): Promise<void> {
        try {
            const batch = writeBatch(db);
            const tripRef = doc(db, 'trips', tripId);
            batch.delete(tripRef);

            const expensesRef = collection(db, 'trips', tripId, 'expenses');
            const expenseSnapshot = await getDocs(expensesRef);

            expenseSnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();
        } catch (error) {
            console.error("Error deleting trip:", error);
            throw error;
        }
    },


    async saveDayRoute(tripId: string, dayIndex: number, encodedPolyline: string, stats: { distance: string, duration: string }) {
        try {
            const tripRef = doc(db, 'trips', tripId);
            const tripSnap = await getDoc(tripRef);

            if (tripSnap.exists()) {
                const tripData = tripSnap.data();
                const itinerary = tripData.itinerary || [];

                if (itinerary[dayIndex]) {
                    itinerary[dayIndex].routePolyline = encodedPolyline;
                    itinerary[dayIndex].routeStats = stats; // <--- Save Stats
                    await updateDoc(tripRef, { itinerary });
                }
            }
        } catch (error) {
            console.error("Error saving route cache:", error);
            // Re-throw the error to indicate failure
            throw error;
        }
    },

    // [UPDATE THIS METHOD] to clear cache when items change
    async updateDayTimeline(tripId: string, dayIndex: number, newTimeline: any[]) {
        try {
            const tripRef = doc(db, 'trips', tripId);
            const tripSnap = await getDoc(tripRef);

            if (tripSnap.exists()) {
                const tripData = tripSnap.data();
                const itinerary = tripData.itinerary || [];

                if (itinerary[dayIndex]) {
                    itinerary[dayIndex].timeline = newTimeline;

                    // Clear BOTH caches so they regenerate together
                    delete itinerary[dayIndex].routePolyline;
                    delete itinerary[dayIndex].routeStats; // <--- Clear Stats

                    await updateDoc(tripRef, { itinerary });
                }
            }
        } catch (error) {
            console.error("Error updating timeline:", error);
            throw error;
        }
    },

    async saveOverviewData(tripId: string, encodedPolyline: string, stats: Record<number, { distance: string, duration: string }>) {
        try {
            await updateDoc(doc(db, 'trips', tripId), {
                overviewPolyline: encodedPolyline,
                overviewStats: stats
            });
        } catch (error) {
            console.error("Error saving overview cache:", error);
            // Re-throw the error to indicate failure
            throw error;
        }
    },

    async addDayToTrip(
        tripId: string,
        currentDuration: number,
        startCity: string,
        destination: string,
        destinationCoordinates: GeoPoint | null
    ) {
        try {
            const tripRef = doc(db, 'trips', tripId);
            const newDayNumber = currentDuration + 1;

            // Use the trip's ultimate destination/coords as the default stop location
            const defaultCoords = destinationCoordinates || { lat: 0, lng: 0 };

            // Create the new empty itinerary item
            const newDay: Partial<ItineraryItem> = {
                // Using timestamp + day number as a unique ID fallback
                id: Date.now().toString() + newDayNumber,
                order: newDayNumber - 1,
                day: newDayNumber,
                title: `Day ${newDayNumber}: ${destination}`,
                description: "New day, plan activities!",
                fuel_cost: 0,
                drive_time: "0h",
                start_city: startCity,
                end_city: destination,
                coordinates: defaultCoords,
                stopLocation: defaultCoords,
                timeline: [],
                hotel_options: [],
                food_options: [],
                activity_options: [],
            };

            // Update the document: append day, increment duration, and clear cache
            await updateDoc(tripRef, {
                // Append new day to the itinerary array
                itinerary: arrayUnion(newDay),

                // Increment the trip duration
                duration: increment(1),

                // Invalidate/Delete the cache fields to force redraw/re-route on next load
                overviewPolyline: deleteField(),
                overviewStats: deleteField(),
            });

            return newDayNumber;
        } catch (error) {
            console.error("Error adding new day to trip: ", error);
            throw error;
        }
    },

    async deleteDayFromTrip(tripId: string, dayIndex: number): Promise<void> {
        const tripRef = doc(db, 'trips', tripId);
        const tripSnap = await getDoc(tripRef);

        if (tripSnap.exists()) {
            const currentItinerary = tripSnap.data().itinerary || [];

            // 1. Remove the day
            const newItinerary = currentItinerary.filter((_: any, index: number) => index !== dayIndex);

            // 2. Re-index the remaining days (update 'day' and 'order')
            const reindexedItinerary = newItinerary.map((dayItem: any, index: number) => ({
                ...dayItem,
                order: index,
                day: index + 1,
            }));

            // 3. Update Firestore (Atomic update)
            await updateDoc(tripRef, {
                itinerary: reindexedItinerary,
                duration: increment(-1),
                overviewPolyline: deleteField(),
                overviewStats: deleteField(),
            });
        }
    },

    subscribeToExpenses(tripId: string, onUpdate: (expenses: any[]) => void): Unsubscribe {
        const expensesRef = collection(db, 'trips', tripId, 'expenses');
        const q = query(expensesRef, orderBy('createdAt', 'desc'));

        return onSnapshot(q, (snapshot) => {
            const fetchedExpenses = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            onUpdate(fetchedExpenses);
        }, (error) => {
            console.error("Error fetching expenses:", error);
        });
    },

    async addExpense(tripId: string, expense: any) {
        try {
            await addDoc(collection(db, 'trips', tripId, 'expenses'), expense);
            await updateDoc(doc(db, 'trips', tripId), {
                spent: increment(expense.amount)
            });
        } catch (error) {
            console.error("Error adding expense:", error);
            throw error;
        }
    },

    // --- NEW METHOD: Update Expense ---
    async updateExpense(tripId: string, expenseId: string, updatedData: any) {
        try {
            const expenseRef = doc(db, 'trips', tripId, 'expenses', expenseId);

            // 1. Get old amount to calculate difference
            const expenseSnap = await getDoc(expenseRef);
            if (!expenseSnap.exists()) throw new Error("Expense not found");

            const oldAmount = expenseSnap.data().amount || 0;
            const newAmount = updatedData.amount || 0;
            const difference = newAmount - oldAmount;

            // 2. Update the expense document
            await updateDoc(expenseRef, updatedData);

            // 3. Update the total spent on the trip
            if (difference !== 0) {
                await updateDoc(doc(db, 'trips', tripId), {
                    spent: increment(difference)
                });
            }
        } catch (error) {
            console.error("Error updating expense:", error);
            throw error;
        }
    },

    async deleteExpense(tripId: string, expenseId: string, amount: number) {
        try {
            await deleteDoc(doc(db, 'trips', tripId, 'expenses', expenseId));
            await updateDoc(doc(db, 'trips', tripId), {
                spent: increment(-amount)
            });
        } catch (error) {
            console.error("Error deleting expense:", error);
            throw error;
        }
    },

    async addActivityToDay(tripId: string, dayIndex: number, activityItem: any) {
        try {
            const tripRef = doc(db, 'trips', tripId);
            const tripSnap = await getDoc(tripRef);

            if (tripSnap.exists()) {
                const tripData = tripSnap.data();
                const itinerary = tripData.itinerary || [];

                if (itinerary[dayIndex]) {
                    if (!itinerary[dayIndex].timeline) {
                        itinerary[dayIndex].timeline = [];
                    }
                    itinerary[dayIndex].timeline.push(activityItem);
                    await updateDoc(tripRef, { itinerary });
                }
            }
        } catch (error) {
            console.error("Error adding activity:", error);
            throw error;
        }
    }
};