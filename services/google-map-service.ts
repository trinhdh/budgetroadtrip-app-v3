const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
const BASE_URL = "https://maps.googleapis.com/maps/api";

import { GooglePlace, RouteDetails } from "@/constants/types";

export const GoogleMapsService = {
    /**
     * 1. GET ROUTE DETAILS
     * Calculates real driving distance and time.
     */
    async getRouteDetails(origin: string, destination: string): Promise<RouteDetails | null> {
        try {
            const url = `${BASE_URL}/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${API_KEY}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const leg = data.routes[0].legs[0];
                return {
                    distanceMeters: leg.distance.value,
                    durationText: leg.duration.text,
                    startLocation: leg.start_location,
                    endLocation: leg.end_location,
                };
            }
            return null;
        } catch (error) {
            console.error("Google Route Error:", error);
            return null;
        }
    },

    /**
     * 2. SEARCH PLACES (Text Search)
     * Finds real places based on AI keywords (e.g. "Best BBQ in Memphis").
     */
    async searchPlaces(
        query: string,
        type: "lodging" | "restaurant" | "tourist_attraction" | "point_of_interest",
        maxPriceLevel?: number
    ): Promise<GooglePlace[]> {
        try {
            let url = `${BASE_URL}/place/textsearch/json?query=${encodeURIComponent(query)}&type=${type}&key=${API_KEY}`;

            if (maxPriceLevel) {
                url += `&maxprice=${maxPriceLevel}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.results) {
                // Return top 3 results
                return data.results.slice(0, 3) as GooglePlace[];
            }
            return [];
        } catch (error) {
            console.error("Google Place Search Error:", error);
            return [];
        }
    },

    /**
     * 3. GET PHOTO URL
     * Helper to convert photo reference to actual image URL
     */
    getPhotoUrl(photoReference?: string, maxWidth = 800): string {
        if (!photoReference) return "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1000&auto=format&fit=crop";
        return `${BASE_URL}/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${API_KEY}`;
    }
};