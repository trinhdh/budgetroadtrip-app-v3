import { GoogleGenAI } from '@google/genai';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenAI({ apiKey: API_KEY });

// 1. Define the Schema using plain objects (No SchemaType)
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
                    category: { type: "string" },
                    amount: { type: "number" },
                    icon: { type: "string" },
                    color: { type: "string" }
                },
                required: ["category", "amount", "icon", "color"]
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
                                time: { type: "string" },
                                title: { type: "string" },
                                desc: { type: "string" },
                                address: { type: "string" },
                                type: { type: "string", enum: ["activity", "food", "hotel", "other"] },
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
                            required: ["time", "title", "desc", "type", "coordinates"]
                        }
                    },
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
                required: ["day", "title", "distance", "stopLocation", "timeline", "hotelRecommendations", "foodRecommendations", "activityRecommendations"]
            }
        }
    },
    required: ["tripName", "estimatedCost", "budgetBreakdown", "itinerary"]
};

export const AiPlannerService = {

    async generateTripPlan(formData: any) {
        if (!API_KEY) {
            throw new Error("Missing Gemini API Key");
        }

        const { origin, destination, duration, budget, travelers, carName, mpg, gasPrice } = formData;
        const nightlyBudget = (budget * 0.4 / duration).toFixed(0);
        const foodBudget = (budget * 0.2 / duration / 2).toFixed(0);

        const prompt = `
            Plan a ${duration}-day road trip from ${origin} to ${destination}.
            Travelers: ${travelers.adults} adults, ${travelers.children} children.
            
            **VEHICLE DETAILS:**
            - Vehicle: ${carName}
            - MPG: ${mpg || 'Estimate based on vehicle type'} 
            - Gas Price: $${gasPrice || 'Use national average'}/gallon
            
            Total Budget: $${budget}.

            **ITINERARY REQUIREMENTS:**
            - Create a day-by-day itinerary.
            - For **EACH DAY**, provide a 'timeline' with at least 3 items (Morning Activity, Lunch, Evening Hotel).
            
            **RECOMMENDATIONS (For each day's stop location):**
            1. **Hotels:** Find 3 hotels (~$${nightlyBudget}/night).
            2. **Food:** Find 3 restaurants/cafes (~$${foodBudget}/person). Look for local favorites.
            3. **Activities:** Find 3 activities or sightseeing spots.

            **SEARCH TASK:** - Use Google Search to find real, currently operating places with ratings.
            - Get real coordinates (lat/lng) for everything.
            - **CRITICAL:** Calculate the "Fuel" budget breakdown using the provided MPG (${mpg}) and Gas Price ($${gasPrice}) over the estimated total distance.
            
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

            if (!responseText) {
                throw new Error("No response received from AI");
            }

            return JSON.parse(responseText);

        } catch (error) {
            console.error("AI Generation Error:", error);
            throw new Error("Failed to generate trip plan. Please try again.");
        }
    }
};