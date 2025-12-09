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

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenAI({ apiKey: API_KEY });

// ==========================================
// 1. FLATTENED ZOD SCHEMAS
// ==========================================

/**
 * We flatten the Place object for the AI. 
 * Instead of asking for `{ geometry: { location: { lat, lng } } }`, 
 * we just ask for `lat` and `lng` at the root. 
 * This reduces token usage and parsing errors.
 */
const AiPlaceFlatSchema = z.object({
    name: z.string(),
    place_id: z.string().default(""), // AI sometimes omits IDs, default to empty to prevent crash
    vicinity: z.string().optional().default(""),
    rating: z.number().optional().default(0),
    user_ratings_total: z.number().optional().default(0),
    price_level: z.number().optional(),

    // FLATTENED: Ask for coordinates directly at the root
    lat: z.number(),
    lng: z.number(),

    photo_ref: z.string().optional().describe("A google photo reference string if available")
});

const AiDailyPlanFlatSchema = z.object({
    day: z.number(),
    title: z.string(),
    description: z.string(),

    fuel_cost: z.number(),
    drive_time: z.string(),

    start_city: z.string(),
    end_city: z.string(),

    // FLATTENED: Coordinates for the destination city
    dest_lat: z.number(),
    dest_lng: z.number(),

    // Arrays of the flat place objects
    hotel_options: z.array(AiPlaceFlatSchema).max(3),
    food_options: z.array(AiPlaceFlatSchema).max(3),
    activity_options: z.array(AiPlaceFlatSchema).max(3),
});

const AiResponseSchema = z.object({
    estimatedCost: z.number(),
    budgetBreakdown: z.array(z.object({
        category: z.enum(['fuel', 'hotel', 'food', 'activities', 'other']),
        amount: z.number(),
    })),
    itinerary: z.array(AiDailyPlanFlatSchema),
    warning: z.string().optional(),
});

// Types inferred from Zod for internal mapping
type AiPlaceFlat = z.infer<typeof AiPlaceFlatSchema>;
type AiDailyPlanFlat = z.infer<typeof AiDailyPlanFlatSchema>;


// ==========================================
// 2. MAPPING HELPERS (The "Hydration" Step)
// ==========================================

/**
 * Converts the Flat AI representation to your App's GooglePlace type.
 * Re-nests `lat`/`lng` into `geometry.location`.
 */
const mapToGooglePlace = (flatPlace: AiPlaceFlat): GooglePlace => {
    return {
        name: flatPlace.name,
        place_id: flatPlace.place_id,
        vicinity: flatPlace.vicinity,
        rating: flatPlace.rating,
        user_ratings_total: flatPlace.user_ratings_total,
        price_level: flatPlace.price_level,
        formatted_address: flatPlace.vicinity, // Fallback if address isn't separate
        geometry: {
            location: {
                lat: flatPlace.lat,
                lng: flatPlace.lng
            }
        },
        photos: flatPlace.photo_ref ? [{ photo_reference: flatPlace.photo_ref }] : []
    };
};

/**
 * Converts the Flat AI Itinerary Item to your App's ItineraryItem type.
 */
const mapToItineraryItem = (flatItem: AiDailyPlanFlat, index: number): ItineraryItem => {
    return {
        id: Crypto.randomUUID(),
        order: index,
        day: flatItem.day,
        title: flatItem.title,
        description: flatItem.description,
        fuel_cost: flatItem.fuel_cost,
        drive_time: flatItem.drive_time,
        start_city: flatItem.start_city,
        end_city: flatItem.end_city,

        // Map the flat city coordinates to GeoPoint
        coordinates: {
            lat: flatItem.dest_lat,
            lng: flatItem.dest_lng
        },

        // Map the arrays using the helper above
        hotel_options: flatItem.hotel_options.map(mapToGooglePlace),
        food_options: flatItem.food_options.map(mapToGooglePlace),
        activity_options: flatItem.activity_options.map(mapToGooglePlace),

        // Initialize user selections as undefined
        selected_hotel_id: undefined,
        selected_food_id: undefined,
        selected_activity_id: undefined
    };
};


// ==========================================
// 3. SERVICE
// ==========================================

export const AiPlannerService = {

    async generateTripPlan(input: AiTripInput): Promise<Partial<Trip> & { warning?: string }> {
        if (!API_KEY) throw new Error("Missing Gemini API Key");

        const { origin, destination, duration, budget, travelers, carName, mpg, gasPrice, vibe, isRoundTrip } = input;

        const prompt = `
            Plan a ${duration}-day road trip from ${origin} to ${destination}.
            Travelers: ${travelers.adults} adults, ${travelers.children} children.
            Vehicle: ${carName} (MPG: ${mpg}, Gas: $${gasPrice}/gal). 
            Total Budget: $${budget}.
            Trip Type: ${isRoundTrip ? 'ROUND TRIP' : 'ONE WAY'}.
            Vibe: ${vibe.toUpperCase()}.

            **SELECTION CRITERIA:**
            1. **Search Tool:** You have access to 'googleSearch'. USE IT to find real places.
            2. **Vibe Check:** - If vibe is 'Explorer', prioritize cabins, glamping, or nature lodges.
               - If vibe is 'Comfort', prioritize 4-star+ hotels with easy parking.
               - If vibe is 'Foodie', prioritize highly-rated local non-chain restaurants.
            3. **Feasibility:** If the budget is impossible for ${duration} days, return a 'warning' string explaining why.

            **DATA OUTPUT:**
            - Return a day-by-day plan.
            - Provide 3 real choices for Hotel, Food, and Activities per day.
            - For each place, provide the exact 'name' and 'vicinity'. 
            - Try to find the 'place_id' if available in search results, otherwise leave it empty.
            - Ensure coordinates are accurate.
            - Calculate 'fuel_cost' based on the daily distance.
        `;

        const res = await genAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseJsonSchema: zodToJsonSchema(AiResponseSchema),
                // Ensure googleSearch is enabled so it can find real Place IDs and Lat/Lngs
                tools: [{ googleSearch: {} }],
            }
        });

        const rawText = res.text;
        if (!rawText) throw new Error("AI returned empty response");

        // 1. Validate with Zod (Flat Schema)
        const parsed = AiResponseSchema.parse(JSON.parse(rawText));

        // 2. Map Flat Schema -> Complex Types
        const itinerary: ItineraryItem[] = parsed.itinerary.map((item, index) =>
            mapToItineraryItem(item, index)
        );

        return {
            estimatedCost: parsed.estimatedCost,
            estimatedBreakdown: parsed.budgetBreakdown as BudgetCategory[], // Cast assumes Enums match
            itinerary,
            warning: parsed.warning
        };
    }
};