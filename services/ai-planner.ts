// trinhdh/budgetroadtrip-app-v3/budgetroadtrip-app-v3-develop/services/ai-planner.ts

import { AiTripInput, AiTripResponse } from '@/constants/types';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenAI({ apiKey: API_KEY });

const CategoryEnum = z.enum(['fuel', 'hotel', 'food', 'activities', 'other']);

const GeoPointSchema = z.object({
    latitude: z.number(),
    longitude: z.number(),
});

const RecommendationSchema = z.object({
    name: z.string(),
    price: z.number(),
    rating: z.number(),
    address: z.string(),
    description: z.string(),
    image: z.string().optional().default(""),
});

const TimelineItemSchema = z.object({
    order: z.number().describe("Sequential order of the activity in the day"),
    title: z.string(),
    desc: z.string(),
    address: z.string(),
    type: CategoryEnum,
    price: z.number(),
    coordinates: GeoPointSchema,
});

const ItineraryDaySchema = z.object({
    day: z.number(),
    title: z.string(),
    distance: z.string(),
    stopLocation: GeoPointSchema,
    timeline: z.array(TimelineItemSchema),
    hotelRecommendations: z.array(RecommendationSchema).optional().default([]),
    foodRecommendations: z.array(RecommendationSchema).optional().default([]),
    activityRecommendations: z.array(RecommendationSchema).optional().default([]),
});

// The Main Response Schema
const TripResponseSchema = z.object({
    tripName: z.string(),
    estimatedCost: z.number(),
    budgetBreakdown: z.array(z.object({
        category: CategoryEnum,
        amount: z.number(),
    })),
    itinerary: z.array(ItineraryDaySchema),
    warning: z.string().optional(),
});

export const AiPlannerService = {

    async generateTripPlan(input: AiTripInput): Promise<AiTripResponse> {
        if (!API_KEY) {
            throw new Error("Missing Gemini API Key");
        }

        // Destructure isRoundTrip
        const { origin, destination, duration, budget, travelers, carName, mpg, gasPrice, vibe, isRoundTrip } = input;

        // --- 1. DYNAMIC BUDGET ALLOCATION BASED ON VIBE ---
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
            case 'explorer': // Cheap Hotel, expensive activities
                hotelRatio = 0.20;
                foodRatio = 0.20;
                break;
            case 'balanced':
            default:
                hotelRatio = 0.40;
                foodRatio = 0.20;
                break;
        }

        const nightlyBudget = (budget * hotelRatio / duration).toFixed(0);
        const foodBudget = (budget * foodRatio / duration / 2).toFixed(0);

        const prompt = `
            Plan a ${duration}-day road trip from ${origin} to ${destination}.
            Travelers: ${travelers.adults} adults, ${travelers.children} children.
            Vehicle: ${carName} (MPG: ${mpg}, Gas: $${gasPrice}). 
            Total Budget: $${budget}.
            Trip Type: ${isRoundTrip ? 'ROUND TRIP (Must return to ' + origin + ' on the last day)' : 'ONE WAY'}.

            **TRIP VIBE: ${vibe ? vibe.toUpperCase() : 'BALANCED'}**
            - Prioritize spending based on this vibe.
            - Target Hotel Price: ~$${nightlyBudget} per night.
            - Target Food Price: ~$${foodBudget} per person/meal.

            **FEASIBILITY CHECK:**
            - Check if a road trip between these locations is possible (e.g. crossing oceans without ferries).
            - Check if the budget is realistically sufficient for ${duration} days (Gas + Hotels + Food).
            
            **IF IMPOSSIBLE OR UNREALISTIC:**
            - Return a JSON with a 'warning' field explaining EXACTLY why (e.g. "Budget of $200 is too low for 5 days" or "Cannot drive from New York to London").
            - You can leave 'itinerary' as an empty array in this case.

            **IF FEASIBLE, ITINERARY REQUIREMENTS:**
            - Create a day-by-day itinerary.
            - For **EACH DAY**, provide a 'timeline' array with at least 3 items.
            - Assign a sequential 'order' number (1, 2, 3...) to each timeline item.
            - If ROUND TRIP, ensure the route loops back towards ${origin} by the final day.
            
            **RECOMMENDATIONS:**
            - Find 3 hotels (~$${nightlyBudget}/night) near each day's stop.
            - Find 3 food spots (~$${foodBudget}/person) and 3 activities.
            
            **SEARCH TASK:** - Use Google Search to find real places, prices, and coordinates.
            - Calculate fuel cost based on the vehicle details provided.
        `;

        try {
            const response = await genAI.models.generateContent({
                model: "gemini-2.0-flash",
                contents: [
                    { role: 'user', parts: [{ text: prompt }] }
                ],
                config: {
                    responseMimeType: "application/json",
                    responseJsonSchema: zodToJsonSchema(TripResponseSchema),
                    tools: [{ googleSearch: {} }],
                }
            });

            const responseText = response.text;
            if (!responseText) throw new Error("No response received from AI");

            const rawData = JSON.parse(responseText);
            const parsedData = TripResponseSchema.parse(rawData);
            console.log("Parsed Data:", parsedData);
            return parsedData as AiTripResponse;

        } catch (error) {
            console.error("AI Generation Error:", error);
            throw error;
        }
    }
};