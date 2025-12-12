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

// ... (AiDailyPlanSchema and AiResponseSchema remain the same) ...
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
    hotel_queries: z.array(z.string()).describe("3 specific search queries for accommodation"),
    food_queries: z.array(z.string()).describe("3 specific search queries for food"),
    activity_queries: z.array(z.string()).describe("3 specific search queries for activities"),
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
    error: z.string().optional().describe("If the trip is IMPOSSIBLE, explain here."),
});

// ... (deduplicatePlaces helper remains the same) ...
const deduplicatePlaces = (places: GooglePlace[]): GooglePlace[] => {
    const seen = new Set();
    return places.filter(place => {
        const duplicate = seen.has(place.place_id);
        seen.add(place.place_id);
        return !duplicate;
    });
};

// ... (fetchRealPlaces helper remains the same) ...
const fetchRealPlaces = async (queries: string[], type: "lodging" | "restaurant" | "tourist_attraction"): Promise<GooglePlace[]> => {
    const searchPromises = queries.map(query =>
        GoogleMapsService.searchPlaces(query, type)
    );
    const responses = await Promise.all(searchPromises);
    const rawResults: GooglePlace[] = [];
    responses.forEach(places => {
        if (places && places.length > 0) rawResults.push(places[0]);
    });
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
            1. **FEASIBILITY CHECK:** If budget is too low, fill 'warning'. If impossible, fill 'error'.
            2. **SEARCH QUERIES:** Generate specific Google Maps queries.
            3. **NOTE:** Provide a single helpful 'note' paragraph.
            
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

            // Coordinate logic
            let finalCoords = { lat: dayItem.dest_lat, lng: dayItem.dest_lng };
            if (activities.length > 0 && activities[0].geometry?.location) {
                finalCoords = activities[0].geometry.location;
            } else if (hotels.length > 0 && hotels[0].geometry?.location) {
                finalCoords = hotels[0].geometry.location;
            }

            // --- NEW: AUTO-POPULATE TIMELINE ---
            const timeline = [];
            let order = 1;

            // 1. Add Best Activity (if any)
            if (activities.length > 0) {
                const act = activities[0];
                timeline.push({
                    id: Crypto.randomUUID(),
                    title: act.name,
                    type: 'activities',
                    coordinates: act.geometry.location,
                    address: act.formatted_address || act.vicinity,
                    price: 0, // AI doesn't give price, user can edit
                    order: order++
                });
            }

            // 2. Add Best Food (if any)
            if (food.length > 0) {
                const f = food[0];
                timeline.push({
                    id: Crypto.randomUUID(),
                    title: f.name,
                    type: 'food',
                    coordinates: f.geometry.location,
                    address: f.formatted_address || f.vicinity,
                    price: 0,
                    order: order++
                });
            }

            // 3. Add Hotel (if any)
            if (hotels.length > 0) {
                const h = hotels[0];
                timeline.push({
                    id: Crypto.randomUUID(),
                    title: h.name,
                    type: 'hotel',
                    coordinates: h.geometry.location,
                    address: h.formatted_address || h.vicinity,
                    price: 0,
                    order: order++
                });
            }
            // -----------------------------------

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
                coordinates: finalCoords,
                hotel_options: hotels,
                food_options: food,
                activity_options: activities,
                selected_hotel_id: hotels.length > 0 ? hotels[0].place_id : undefined,
                selected_food_id: food.length > 0 ? food[0].place_id : undefined,
                selected_activity_id: activities.length > 0 ? activities[0].place_id : undefined,

                // Assign the populated timeline
                timeline: timeline
            };

            return item;
        });

        const finalItinerary = await Promise.all(itineraryPromises);

        return {
            estimatedCost: parsed.estimatedCost,
            estimatedBreakdown: parsed.budgetBreakdown as BudgetCategory[],
            aiNote: parsed.note,
            itinerary: finalItinerary,
            warning: parsed.warning,
            error: parsed.error
        };
    }
};