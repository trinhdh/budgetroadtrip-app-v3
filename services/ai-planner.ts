// services/ai-planner.ts

import {
    AiTripInput,
    GooglePlace,
    ItineraryItem,
    Trip
} from '@/constants/types';
import { GoogleGenAI } from '@google/genai';
import * as Crypto from 'expo-crypto'; // For generating unique IDs
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenAI({ apiKey: API_KEY });

// --- 1. ZOD SCHEMAS (Optimized & Relaxed) ---

/**
 * We map this to the 'GooglePlace' type.
 * KEY CHANGE: place_id and vicinity are optional/defaulted.
 * This allows the AI to return a "best guess" location even if it can't find the specific ID.
 */
const AiPlaceSchema = z.object({
    name: z.string(),
    place_id: z.string().optional().default(""),
    vicinity: z.string().optional().default(""),
    rating: z.number().optional().default(0),
    user_ratings_total: z.number().optional().default(0),
    price_level: z.number().optional(),
    geometry: z.object({
        location: z.object({
            lat: z.number(),
            lng: z.number()
        })
    })
});

const AiDailyPlanSchema = z.object({
    day: z.number(),
    title: z.string().describe("Short title, e.g. 'Drive to Nashville'"),
    description: z.string().describe("A 2-3 sentence summary of the day's agenda."),

    fuel_cost: z.number().describe("Estimated gas cost for this leg"),
    drive_time: z.string().describe("e.g. '3h 15m'"),

    start_city: z.string(),
    end_city: z.string(),
    coordinates: z.object({ lat: z.number(), lng: z.number() }).describe("Coordinates of the destination city"),

    hotel_options: z.array(AiPlaceSchema).max(3),
    food_options: z.array(AiPlaceSchema).max(3),
    activity_options: z.array(AiPlaceSchema).max(3),
});

const AiResponseSchema = z.object({
    estimatedCost: z.number(),
    budgetBreakdown: z.array(z.object({
        category: z.enum(['fuel', 'hotel', 'food', 'activities', 'other']),
        amount: z.number(),
    })),
    itinerary: z.array(AiDailyPlanSchema),
    warning: z.string().optional(),
});

// --- 2. SERVICE ---

export const AiPlannerService = {

    async generateTripPlan(input: AiTripInput): Promise<Partial<Trip> & { warning?: string }> {
        if (!API_KEY) throw new Error("Missing Gemini API Key");

        const { origin, destination, duration, budget, travelers, carName, mpg, gasPrice, vibe, isRoundTrip } = input;

        // Dynamic Vibe Logic: Adjust budget ratios based on user personality
        let hotelRatio = 0.4;
        let foodRatio = 0.2;

        switch (vibe) {
            case 'comfort': // Expensive Hotels, decent food
                hotelRatio = 0.60;
                foodRatio = 0.15;
                break;
            case 'foodie': // Expensive Food, average hotels
                hotelRatio = 0.25;
                foodRatio = 0.45;
                break;
            case 'explorer': // Cheap Hotel, expensive activities/gas
                hotelRatio = 0.20;
                foodRatio = 0.20;
                break;
            default: // Balanced
                hotelRatio = 0.40;
                foodRatio = 0.20;
                break;
        }

        const nightlyBudget = (budget * hotelRatio / duration).toFixed(0);
        const mealBudget = (budget * foodRatio / duration / 2).toFixed(0); // Per meal approx

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

        try {
            const response = await genAI.models.generateContent({
                model: "gemini-2.0-flash",
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: {
                    responseMimeType: "application/json",
                    responseJsonSchema: zodToJsonSchema(AiResponseSchema),
                    tools: [{ googleSearch: {} }],
                }
            });

            const responseText = response.text;
            if (!responseText) throw new Error("No response from AI");

            const rawData = JSON.parse(responseText);

            // Validate with Zod
            const parsedData = AiResponseSchema.parse(rawData);

            // --- 3. POST-PROCESSING (Hydrate types) ---
            const enrichedItinerary: ItineraryItem[] = parsedData.itinerary.map((dayPlan, index) => {
                return {
                    ...dayPlan,
                    id: Crypto.randomUUID(), // Generate ID client-side
                    order: index,            // Generate Order client-side

                    // Cast to GooglePlace[] - schema matches compatible fields
                    hotel_options: dayPlan.hotel_options as GooglePlace[],
                    food_options: dayPlan.food_options as GooglePlace[],
                    activity_options: dayPlan.activity_options as GooglePlace[],

                    // Initialize selections
                    selected_hotel_id: undefined,
                    selected_food_id: undefined,
                    selected_activity_id: undefined,
                };
            });

            return {
                estimatedCost: parsedData.estimatedCost,
                estimatedBreakdown: parsedData.budgetBreakdown,
                itinerary: enrichedItinerary,
                warning: parsedData.warning
            };

        } catch (error) {
            console.error("AI Generation Error:", error);
            throw error;
        }
    }
};