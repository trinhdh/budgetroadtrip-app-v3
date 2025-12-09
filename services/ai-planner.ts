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
import { GoogleMapsService } from './google-map-service'; // <--- IMPORT YOUR MAP SERVICE

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenAI({ apiKey: API_KEY });

// ==========================================
// 1. HYBRID SCHEMA: Ask for SEARCH TERMS, not Places
// ==========================================

// Instead of asking for a full "Hotel Object", we ask for specific search queries.
const AiDailyPlanSchema = z.object({
    day: z.number(),
    title: z.string(),
    description: z.string(),
    fuel_cost: z.number(),
    drive_time: z.string(),
    start_city: z.string(),
    end_city: z.string(),

    // AI estimates the city center coordinates (good enough for map centering)
    dest_lat: z.number(),
    dest_lng: z.number(),

    // THE HYBRID PART: 
    // Ask for specific search strings that we will feed into Google Places API later.
    hotel_queries: z.array(z.string()).describe("3 specific search queries for accommodation, e.g. 'Boutique hotel with parking in downtown Savannah'"),
    food_queries: z.array(z.string()).describe("3 specific search queries for food, e.g. 'Best BBQ near Forsyth Park'"),
    activity_queries: z.array(z.string()).describe("3 specific search queries for activities, e.g. 'Ghost tour tickets Savannah'"),
});

const AiResponseSchema = z.object({
    estimatedCost: z.number(),
    budgetBreakdown: z.array(z.object({
        category: z.enum(['fuel', 'hotel', 'food', 'activities', 'other']),
        amount: z.number(),
    })),
    itinerary: z.array(AiDailyPlanSchema),
    // THE WARNING FIELD:
    warning: z.string().optional().describe("If the budget is too low for the duration/travelers, provide a warning explanation here."),
});

// ==========================================
// 2. HELPER: HYDRATION (Text -> Real Data)
// ==========================================

/**
 * Takes search queries from AI and gets REAL data from Google.
 */
const fetchRealPlaces = async (queries: string[], type: "lodging" | "restaurant" | "tourist_attraction"): Promise<GooglePlace[]> => {
    const results: GooglePlace[] = [];

    // Run all searches in parallel
    const searchPromises = queries.map(query =>
        GoogleMapsService.searchPlaces(query, type)
    );

    const responses = await Promise.all(searchPromises);

    // Flatten: take the best result (index 0) from each query
    responses.forEach(places => {
        if (places && places.length > 0) {
            results.push(places[0]);
        }
    });

    return results;
};

// ==========================================
// 3. SERVICE
// ==========================================

export const AiPlannerService = {

    async generateTripPlan(input: AiTripInput): Promise<Partial<Trip> & { warning?: string }> {
        if (!API_KEY) throw new Error("Missing Gemini API Key");

        const { origin, destination, duration, budget, travelers, carName, mpg, gasPrice, vibe, isRoundTrip } = input;

        // --- NEW PROMPT STRATEGY ---
        const prompt = `
            Plan a ${duration}-day road trip from ${origin} to ${destination}.
            **CONSTRAINTS:**
            - Budget: $${budget} Total.
            - Travelers: ${travelers.adults} adults, ${travelers.children} children.
            - Vibe: ${vibe.toUpperCase()}.
            - Car: ${carName} (${mpg} mpg).
            - Type: ${isRoundTrip ? 'ROUND TRIP' : 'ONE WAY'}.

            **CRITICAL INSTRUCTIONS:**
            1. **FEASIBILITY CHECK:** If $${budget} is clearly too low for ${duration} days for this many people, you MUST fill the 'warning' field with a specific explanation.
            2. **SEARCH QUERIES:** Do NOT invent hotel names or prices. Instead, generate highly specific Google Maps search queries for 'hotel_queries', 'food_queries', and 'activity_queries'.
               - Example: "Budget motel near I-95 Savannah safe area"
               - Example: "Family friendly diner with parking in Charleston"
            3. **VIBE TUNING:**
               - 'Explorer': Search for nature, scenic stops, cabins.
               - 'Comfort': Search for 4-star+ hotels, minimal walking.
               - 'Foodie': Search for "best rated local food", "famous dishes".

            Return purely JSON data matching the schema.
        `;

        const res = await genAI.models.generateContent({
            model: "gemini-2.0-flash", // Or 1.5-flash
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseJsonSchema: zodToJsonSchema(AiResponseSchema),
            }
        });

        const rawText = res.text;
        console.log("Raw Text:", rawText);
        if (!rawText) throw new Error("AI returned empty response");

        const parsed = AiResponseSchema.parse(JSON.parse(rawText));

        // --- HYDRATION STEP: FETCH REAL DATA ---
        // We now iterate over the AI's plan and fill in the blanks with Google Maps data
        const itineraryPromises = parsed.itinerary.map(async (dayItem, index) => {

            // Fetch real places in parallel based on the AI's "Search Queries"
            const [hotels, food, activities] = await Promise.all([
                fetchRealPlaces(dayItem.hotel_queries, 'lodging'),
                fetchRealPlaces(dayItem.food_queries, 'restaurant'),
                fetchRealPlaces(dayItem.activity_queries, 'tourist_attraction'),
            ]);

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
                coordinates: {
                    lat: dayItem.dest_lat,
                    lng: dayItem.dest_lng
                },
                // Inject the REAL Google Data here
                hotel_options: hotels,
                food_options: food,
                activity_options: activities,

                selected_hotel_id: undefined,
                selected_food_id: undefined,
                selected_activity_id: undefined
            };

            return item;
        });

        // Wait for all Google API calls to finish
        const finalItinerary = await Promise.all(itineraryPromises);

        return {
            estimatedCost: parsed.estimatedCost,
            estimatedBreakdown: parsed.budgetBreakdown as BudgetCategory[],
            itinerary: finalItinerary,
            warning: parsed.warning // Pass the warning back to the UI
        };
    }
};