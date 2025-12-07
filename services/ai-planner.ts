import { AiTripInput, AiTripResponse } from '@/constants/types';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenAI({ apiKey: API_KEY });

// --- 1. Define Zod Schemas (Single Source of Truth) ---

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
    image: z.string().optional().default(""), // Handle optional/missing images gracefully
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
});

export const AiPlannerService = {

    async generateTripPlan(input: AiTripInput): Promise<AiTripResponse> {
        if (!API_KEY) {
            throw new Error("Missing Gemini API Key");
        }

        const { origin, destination, duration, budget, travelers, carName, mpg, gasPrice } = input;

        const nightlyBudget = (budget * 0.4 / duration).toFixed(0);
        const foodBudget = (budget * 0.2 / duration / 2).toFixed(0);

        const prompt = `
            Plan a ${duration}-day road trip from ${origin} to ${destination}.
            Travelers: ${travelers.adults} adults, ${travelers.children} children.
            Vehicle: ${carName} (MPG: ${mpg}, Gas: $${gasPrice}). 
            Total Budget: $${budget}.

            **ITINERARY REQUIREMENTS:**
            - Create a day-by-day itinerary.
            - For **EACH DAY**, provide a 'timeline' array with at least 3 items.
            - Assign a sequential 'order' number (1, 2, 3...) to each timeline item.
            
            **RECOMMENDATIONS:**
            - Find 3 hotels (~$${nightlyBudget}/night) near each day's stop.
            - Find 3 food spots (~$${foodBudget}/person) and 3 activities.
            
            **SEARCH TASK:** - Use Google Search to find real places, prices, and coordinates.
            - Calculate fuel cost based on the vehicle details provided.
        `;

        try {
            const response = await genAI.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseJsonSchema: zodToJsonSchema(TripResponseSchema),
                    tools: [{ googleSearch: {} }],
                }
            });

            const responseText = response.text;
            if (!responseText) throw new Error("No response received from AI");

            // 1. Parse JSON
            const rawData = JSON.parse(responseText);

            // 2. Validate with Zod (This throws a clear error if AI format is wrong)
            const parsedData = TripResponseSchema.parse(rawData);

            // 3. Return typesafe data
            return parsedData as AiTripResponse;

        } catch (error) {
            console.error("AI Generation Error:", error);
            throw error;
        }
    }
};