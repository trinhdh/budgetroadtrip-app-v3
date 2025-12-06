import { AiTripInput, AiTripResponse } from '@/constants/types';
import { GoogleGenAI } from '@google/genai';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenAI({ apiKey: API_KEY });

// 1. Updated Schema (Matches your 'types.ts' exactly)
const TRIP_RESPONSE_SCHEMA = {
    type: "object",
    properties: {
        tripName: { type: "string" },
        estimatedCost: { type: "number" },
        budgetBreakdown: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    category: { type: "string", enum: ['fuel', 'hotel', 'food', 'activities', 'shopping', 'transport', 'other'] },
                    amount: { type: "number" }
                },
                required: ["category", "amount"]
            }
        },
        itinerary: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    day: { type: "number" },
                    title: { type: "string" },
                    distance: { type: "string" },
                    stopLocation: {
                        type: "object",
                        properties: {
                            latitude: { type: "number" },
                            longitude: { type: "number" }
                        },
                        required: ["latitude", "longitude"]
                    },
                    timeline: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                order: { type: "number" }, // Added Order
                                title: { type: "string" },
                                desc: { type: "string" },
                                address: { type: "string" },
                                type: { type: "string", enum: ['fuel', 'hotel', 'food', 'activities', 'shopping', 'transport', 'other'] },
                                price: { type: "number" },
                                coordinates: {
                                    type: "object",
                                    properties: {
                                        latitude: { type: "number" },
                                        longitude: { type: "number" }
                                    },
                                    required: ["latitude", "longitude"]
                                }
                            },
                            required: ["order", "title", "desc", "type", "coordinates"] // Removed 'time'
                        }
                    },
                    // Recommendations (Standardized)
                    hotelRecommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                price: { type: "number" },
                                rating: { type: "number" },
                                address: { type: "string" },
                                description: { type: "string" },
                                image: { type: "string" }
                            },
                            required: ["name", "price", "rating", "address", "description"]
                        }
                    },
                    foodRecommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                price: { type: "number" },
                                rating: { type: "number" },
                                address: { type: "string" },
                                description: { type: "string" }
                            },
                            required: ["name", "price", "rating", "address", "description"]
                        }
                    },
                    activityRecommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                price: { type: "number" },
                                rating: { type: "number" },
                                address: { type: "string" },
                                description: { type: "string" }
                            },
                            required: ["name", "price", "rating", "address", "description"]
                        }
                    }
                },
                required: ["day", "title", "distance", "stopLocation", "timeline", "hotelRecommendations"]
            }
        }
    },
    required: ["tripName", "estimatedCost", "budgetBreakdown", "itinerary"]
};

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
            - **CRITICAL:** Assign a sequential 'order' number (1, 2, 3...) to each timeline item to indicate the sequence of events.
            
            **TIMELINE ITEMS (use types: 'activity', 'food', 'hotel'):**
            1. Morning Activity (order: 1)
            2. Lunch Stop (order: 2)
            3. Afternoon Activity (order: 3)
            4. Evening Hotel Check-in (order: 4)

            **RECOMMENDATIONS:**
            - Find 3 hotels (~$${nightlyBudget}/night) near each day's stop.
            - Find 3 food spots (~$${foodBudget}/person) and 3 activities.
            
            **SEARCH TASK:** - Use Google Search to find real places, prices, and coordinates.
            - Calculate fuel cost based on the vehicle details provided.

            Output strictly valid JSON matching the schema.
        `;

        try {
            const response = await genAI.models.generateContent({
                model: "gemini-2.0-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: TRIP_RESPONSE_SCHEMA,
                    tools: [{ googleSearch: {} }],
                }
            });

            const responseText = response.text;
            if (!responseText) throw new Error("No response received from AI");

            return JSON.parse(responseText) as AiTripResponse;

        } catch (error) {
            console.error("AI Generation Error:", error);
            throw error;
        }
    }
};