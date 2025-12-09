import { db } from '@/firebaseConfig';
import {
    addDoc,
    arrayUnion,
    collection,
    deleteDoc,
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
                originCoordinates: tripData.originCoordinates ? {
                    latitude: tripData.originCoordinates.latitude,
                    longitude: tripData.originCoordinates.longitude
                } : null,
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
     * Adds a user to the trip's members list automatically.
     */
    async joinTrip(tripId: string, userId: string): Promise<void> {
        try {
            const tripRef = doc(db, 'trips', tripId);

            // Atomically add the user to the "members" array
            await updateDoc(tripRef, {
                members: arrayUnion(userId)
            });

            console.log(`User ${userId} joined trip ${tripId}`);
        } catch (error) {
            console.error("Error joining trip:", error);
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
    },

    /**
     * Real-time listener for a single trip
     */
    subscribeToTrip(tripId: string, onUpdate: (trip: Trip | null) => void): Unsubscribe {
        const ref = doc(db, 'trips', tripId);

        return onSnapshot(ref, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Safe Date Conversion
                const tripData = {
                    id: docSnap.id,
                    ...data,
                    startDate: data.startDate instanceof Timestamp ? data.startDate.toDate() : (data.startDate ? new Date(data.startDate) : null),
                    endDate: data.endDate instanceof Timestamp ? data.endDate.toDate() : (data.endDate ? new Date(data.endDate) : null),
                } as Trip;
                onUpdate(tripData);
            } else {
                onUpdate(null); // Trip deleted or not found
            }
        }, (error) => {
            console.error("Error fetching trip details:", error);
        });
    },

    /**
     * Deletes a trip and its associated expenses.
     * @param tripId The ID of the trip to delete.
     */
    async deleteTrip(tripId: string): Promise<void> {
        try {
            // 1. Create a Batch (to ensure all deletes happen together or fail together)
            const batch = writeBatch(db);

            // 2. Reference the Trip Document
            const tripRef = doc(db, 'trips', tripId);
            batch.delete(tripRef);

            // 3. Find and Delete Associated Expenses (Cleanup)
            // Assuming you store expenses in a top-level 'expenses' collection
            const expensesRef = collection(db, 'expenses');
            const q = query(expensesRef, where('tripId', '==', tripId));
            const expenseSnapshot = await getDocs(q);

            expenseSnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // 4. Commit the changes
            await batch.commit();
            console.log(`Trip ${tripId} and ${expenseSnapshot.size} expenses deleted successfully.`);

        } catch (error) {
            console.error("Error deleting trip:", error);
            throw error;
        }
    },

    /**
     * Updates the timeline for a specific day (used for reordering or deleting)
     */
    async updateDayTimeline(tripId: string, dayIndex: number, newTimeline: any[]) {
        try {
            const tripRef = doc(db, 'trips', tripId);
            const tripSnap = await getDoc(tripRef);

            if (tripSnap.exists()) {
                const tripData = tripSnap.data();
                const itinerary = tripData.itinerary || [];

                if (itinerary[dayIndex]) {
                    // Update the timeline
                    itinerary[dayIndex].timeline = newTimeline;

                    // Update stopLocation to the last activity if available (optional but good for continuity)
                    if (newTimeline.length > 0) {
                        const lastItem = newTimeline[newTimeline.length - 1];
                        itinerary[dayIndex].stopLocation = lastItem.coordinates;
                    }

                    await updateDoc(tripRef, { itinerary });
                }
            }
        } catch (error) {
            console.error("Error updating timeline:", error);
            throw error;
        }
    },

    /**
     * Real-time listener for EXPENSES of a trip
     */
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

    /**
     * Add a new expense and update the trip total
     */
    async addExpense(tripId: string, expense: any) {
        try {
            // 1. Add to Subcollection
            await addDoc(collection(db, 'trips', tripId, 'expenses'), expense);

            // 2. Update Trip Total
            await updateDoc(doc(db, 'trips', tripId), {
                spent: increment(expense.amount)
            });
        } catch (error) {
            console.error("Error adding expense:", error);
            throw error;
        }
    },

    /**
     * Delete an expense and update the trip total
     */
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
    /**
     * Adds a new activity to a specific day's timeline
     */
    async addActivityToDay(tripId: string, dayIndex: number, activityItem: any) {
        try {
            const tripRef = doc(db, 'trips', tripId);
            const tripSnap = await getDoc(tripRef);

            if (tripSnap.exists()) {
                const tripData = tripSnap.data();
                const itinerary = tripData.itinerary || [];

                if (itinerary[dayIndex]) {
                    // Initialize timeline if it doesn't exist
                    if (!itinerary[dayIndex].timeline) {
                        itinerary[dayIndex].timeline = [];
                    }

                    // Add the new item
                    itinerary[dayIndex].timeline.push(activityItem);

                    // Update the stopLocation for the day to be the last activity (optional, but good for routing)
                    // itinerary[dayIndex].stopLocation = activityItem.coordinates;

                    // Save back to Firestore
                    await updateDoc(tripRef, { itinerary });
                }
            }
        } catch (error) {
            console.error("Error adding activity:", error);
            throw error;
        }
    }
};