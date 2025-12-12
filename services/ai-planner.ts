import {
    AiTripInput,
    BudgetCategory,
    GooglePlace,
    ItineraryItem,
    Trip
} from '@/constants/types';

import { GoogleGenAI } from '@google/genai';
import * as Crypto from 'expo-crypto';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { GoogleMapsService } from './google-map-service';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenAI({ apiKey: API_KEY });

// ... (Schema remains the same) ...
const AiDailyPlanSchema = z.object({
    day: z.number(),
    title: z.string(),
    description: z.string(),
    fuel_cost: z.number(),
    drive_time: z.string(),
    start_city: z.string(),
    end_city: z.string(),
    dest_lat: z.number(),
    dest_lng: z.number(),
    hotel_queries: z.array(z.string()),
    food_queries: z.array(z.string()),
    activity_queries: z.array(z.string()),
});

const AiResponseSchema = z.object({
    estimatedCost: z.number(),
    budgetBreakdown: z.array(z.object({
        category: z.enum(['fuel', 'hotel', 'food', 'activities', 'other']),
        amount: z.number(),
    })),
    note: z.string().describe("A helpful summary including weather, packing tips, or budget advice."),
    itinerary: z.array(AiDailyPlanSchema),
    warning: z.string().optional().describe("If budget is tight but possible, explain here."),
    error: z.string().optional().describe("If the trip is IMPOSSIBLE with the given constraints, explain why here."),
});

// Helper to remove duplicate places based on Google's 'place_id'
const deduplicatePlaces = (places: GooglePlace[]): GooglePlace[] => {
    const seen = new Set();
    return places.filter(place => {
        const duplicate = seen.has(place.place_id);
        seen.add(place.place_id);
        return !duplicate;
    });
};

const fetchRealPlaces = async (queries: string[], type: "lodging" | "restaurant" | "tourist_attraction"): Promise<GooglePlace[]> => {
    const searchPromises = queries.map(query =>
        GoogleMapsService.searchPlaces(query, type)
    );

    const responses = await Promise.all(searchPromises);
    const rawResults: GooglePlace[] = [];

    // Flatten results
    responses.forEach(places => {
        if (places && places.length > 0) {
            rawResults.push(places[0]); // Take the top result for each query
        }
    });

    // FIX: Remove duplicates if Google returns the same place for different queries
    return deduplicatePlaces(rawResults);
};

export const AiPlannerService = {

    async generateTripPlan(input: AiTripInput): Promise<Partial<Trip> & { warning?: string, error?: string }> {
        if (!API_KEY) throw new Error("Missing Gemini API Key");

        const { origin, destination, duration, budget, travelers, carName, mpg, gasPrice, vibe, isRoundTrip } = input;

        const prompt = `
            Plan a ${duration}-day road trip from ${origin} to ${destination}.
            **CONSTRAINTS:**
            - Budget: $${budget} Total.
            - Travelers: ${travelers.adults} adults, ${travelers.children} children.
            - Vibe: ${vibe.toUpperCase()}.
            - Car: ${carName} (${mpg} mpg).
            - Type: ${isRoundTrip ? 'ROUND TRIP' : 'ONE WAY'}.

            **CRITICAL INSTRUCTIONS:**
            1. **FEASIBILITY CHECK:** If $${budget} is clearly too low or if route is geographically impossible, fill 'error' and stop.
            2. If $${budget} is slightly lower than needed, fill 'warning' with a suggestion to raise the budget.
            2. **SEARCH QUERIES:** Generate specific Google Maps queries.
            3. **NOTE:** Provide a single helpful 'note' paragraph. Include expected weather, a few essential packing items, and a tip to match the '${vibe}' vibe. Keep it friendly and concise.
            
            Return purely JSON data matching the schema.
        `;

        const res = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseJsonSchema: zodToJsonSchema(AiResponseSchema),
            }
        });

        const rawText = res.text;
        if (!rawText) throw new Error("AI returned empty response");

        const parsed = AiResponseSchema.parse(JSON.parse(rawText));

        if (parsed.error) {
            return {
                estimatedCost: 0,
                estimatedBreakdown: [],
                itinerary: [],
                error: parsed.error
            };
        }

        const itineraryPromises = parsed.itinerary.map(async (dayItem, index) => {
            const [hotels, food, activities] = await Promise.all([
                fetchRealPlaces(dayItem.hotel_queries, 'lodging'),
                fetchRealPlaces(dayItem.food_queries, 'restaurant'),
                fetchRealPlaces(dayItem.activity_queries, 'tourist_attraction'),
            ]);

            // FIX: If AI coordinates are weird (0,0), fallback to the first activity's location or keep AI's
            let finalCoords = { lat: dayItem.dest_lat, lng: dayItem.dest_lng };

            // If we found activities, use the first one as the "anchor" for the map to ensure it's real
            if (activities.length > 0 && activities[0].geometry?.location) {
                finalCoords = activities[0].geometry.location;
            } else if (hotels.length > 0 && hotels[0].geometry?.location) {
                finalCoords = hotels[0].geometry.location;
            }

            const item: ItineraryItem = {
                id: Crypto.randomUUID(),
                order: index,
                day: dayItem.day,
                title: dayItem.title,
                description: dayItem.description,
                fuel_cost: dayItem.fuel_cost,
                drive_time: dayItem.drive_time,
                start_city: dayItem.start_city,
                end_city: dayItem.end_city,
                coordinates: finalCoords, // <--- Using smarter coordinates
                hotel_options: hotels,
                food_options: food,
                activity_options: activities,
                selected_hotel_id: undefined,
                selected_food_id: undefined,
                selected_activity_id: undefined
            };

            return item;
        });

        const finalItinerary = await Promise.all(itineraryPromises);

        return {
            estimatedCost: parsed.estimatedCost,
            estimatedBreakdown: parsed.budgetBreakdown as BudgetCategory[],
            itinerary: finalItinerary,
            aiNote: parsed.note,
            warning: parsed.warning,
            error: parsed.error
        };
    }
};