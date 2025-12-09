// ==========================================
// 1. CORE LOCATION & MAPS
// ==========================================

/**
 * Universal coordinate structure used throughout the app.
 * Decouples the app from specific Google Maps types for easier refactoring.
 */
export type GeoPoint = {
    lat: number;
    lng: number;
};

/**
 * Represents a raw location object fetched from the Google Places API.
 * Used for Hotels, Restaurants, and Activities.
 */
export type GooglePlace = {
    /** The display name of the place */
    name: string;
    /** Google's unique identifier for this place. Crucial for key attributes in lists. */
    place_id: string;
    /** Rating from 1.0 to 5.0 */
    rating?: number;
    /** Total number of reviews */
    user_ratings_total?: number;
    /** A simplified address or description of the area */
    vicinity?: string;
    /** The full human-readable address */
    formatted_address?: string;
    /** Cost level: 0 (Free) to 4 (Very Expensive) */
    price_level?: number;

    geometry: {
        location: GeoPoint;
    };
    /** Array of photo references used to fetch images via the Places Photo API */
    photos?: { photo_reference: string }[];
};

/**
 * Stores navigation data between two distinct points.
 */
export type RouteDetails = {
    /** * [REFACTOR] Distance stored in METERS.
     * Frontend should handle conversion to Miles or Km for display.
     */
    distanceMeters: number;
    /** Human readable duration (e.g., "4 hours 10 mins") returned by API */
    durationText: string;
    startLocation: GeoPoint;
    endLocation: GeoPoint;

    /** Encoded polyline string for drawing the route on a map */
    overview_polyline?: {
        points: string;
    };
};

// ==========================================
// 2. AI SERVICE & INPUTS
// ==========================================

/**
 * Defines the "personality" of the trip generation.
 * This instructs the AI to weight specific categories higher in the algorithm.
 * * - `balanced`: Standard mix of driving, sights, and rest.
 * - `comfort`: Shorter drive times, higher-rated hotels, fewer stops.
 * - `explorer`: More nature stops, "hidden gems," scenic routes.
 * - `foodie`: Prioritizes highly-rated local cuisine and dining experiences.
 */
export type TripVibe = 'balanced' | 'comfort' | 'explorer' | 'foodie';

/**
 * The payload sent to the AI Service (Gemini) to generate a trip.
 */
export type AiTripInput = {
    /** Starting city or address (e.g., "Atlanta, GA") */
    origin: string;

    /** Final destination city or address (e.g., "Boston, MA") */
    destination: string;

    /** Total length of the trip in DAYS */
    duration: number;

    /** Target total spending limit in base currency (e.g., USD) */
    budget: number;

    /** Used to calculate room requirements and estimated food costs */
    travelers: {
        adults: number;
        children: number;
    };

    /** Display name of the vehicle (e.g., "Kia Sorento") */
    carName: string;

    /** * Miles Per Gallon. 
     * Type is `string | number` to handle raw form inputs, 
     * but must be parsed to `number` before math operations.
     */
    mpg: string | number;

    /** * Average price per Gallon. 
     * Type is `string | number` to handle raw form inputs.
     */
    gasPrice: string | number;

    /** The personality setting for the AI prompt */
    vibe: TripVibe;

    /** * If true, the AI should account for the return drive 
     * in the fuel cost and time allocation (or generate a return route).
     */
    isRoundTrip: boolean;
};

// ==========================================
// 3. BUDGET & FINANCIALS
// ==========================================

/**
 * Supported spending categories for expense tracking and visualization.
 * * UI Hint: Use this type to map specific icons (e.g., 'gas-station', 'bed', 'restaurant')
 * and colors (e.g., Red for fuel, Green for food) in your charts.
 */
export type CategoryType = 'fuel' | 'hotel' | 'food' | 'activities' | 'other';

/**
 * Represents a financial summary for a specific bucket.
 * Used for both:
 * 1. **Estimates:** The AI's predicted cost for a category.
 * 2. **Actuals:** The sum of all user-entered expenses in this category.
 */
export type BudgetCategory = {
    category: CategoryType;
    /** The monetary value in the trip's base currency (e.g., USD) */
    amount: number;
};

// ==========================================
// 4. TRIP DATA MODEL
// ==========================================

/**
 * Represents a specific day (or segment) within the trip plan.
 * Contains both the generated options and the user's final selections.
 */
export type ItineraryItem = {
    /** * Unique identifier for this specific itinerary item. 
     * Essential for React list rendering (key prop) and drag-and-drop reordering.
     */
    id: string;

    /** * The sequence index of this item (e.g., 0, 1, 2). 
     * Useful if you have multiple stops per day and need to maintain a specific route order.
     */
    order: number;

    /** The chronological day number (e.g., 1, 2, 3) */
    day: number;
    /** Title of the day's activity (e.g., "Drive to Nashville") */
    title: string;

    description: string;

    /** Estimated fuel cost for this leg of the trip (in base currency, e.g., USD) */
    fuel_cost: number;
    /** Text representation of drive time (e.g., "3h 20m") */
    drive_time: string;

    start_city: string;
    end_city: string;

    /** * AI-generated suggestions. 
     * These arrays populate the selection UI.
     */
    hotel_options: GooglePlace[];
    food_options: GooglePlace[];
    activity_options: GooglePlace[];

    /** * The ID of the option the user actually chose.
     * Maps to `place_id` inside the respective `_options` array.
     */
    selected_hotel_id?: string;
    selected_food_id?: string;
    selected_activity_id?: string;

    /** Coordinates for the destination city of this specific day */
    coordinates: GeoPoint;
};

/**
 * Defines a user with access to the trip.
 * Used for collaboration and permission handling.
 */
export type TripMember = {
    /** The Authentication User ID (e.g., Firebase UID) */
    uid: string;
    name: string;
    avatar?: string;
    /** * Permissions:
     * - owner: Can delete trip, manage members.
     * - editor: Can modify itinerary.
     * - viewer: Read-only.
     */
    role: 'owner' | 'editor' | 'viewer';
};

/**
 * The core document definition stored in the database (e.g., Firestore).
 * Represents one complete trip plan.
 */
export type Trip = {
    /** Database Document ID */
    id?: string;
    /** The UID of the user who created the trip */
    userId: string;

    startCity: string;
    endCity: string;
    /** The main focal point of the trip */
    destination: string;

    /** User-defined preference (e.g., "Chill", "Adventure", "Fast Paced") */
    vibe?: string;

    /** The user's target spending limit */
    budget: number;
    /** Calculated total based on fuel + selected hotels + selected activities */
    estimatedCost: number;

    /** * Breakdown of costs by category (Fuel, Hotel, Food, etc.). 
     * Useful for dashboard charts.
     */
    estimatedBreakdown: BudgetCategory[];

    /** Total duration in days */
    duration: number;
    /** Number of travelers */
    people: number;

    /** ISO Date string (YYYY-MM-DD) or Timestamp */
    startDate: string | null;
    /** ISO Date string (YYYY-MM-DD) or Timestamp */
    endDate: string | null;

    /** Unsplash or Google Photo URL for the trip cover card */
    image: string;

    /** Array of day-by-day plans */
    itinerary: ItineraryItem[];
    /** List of users with access to this trip */
    members: TripMember[];

    /** Database specific timestamp (e.g., Firebase Timestamp or ISO string) */
    createdAt: any;
};