// --- Shared Geography & Timeline Types ---

export type GeoPoint = {
    latitude: number;
    longitude: number;
};

export type CategoryType = 'fuel' | 'hotel' | 'food' | 'activities' | 'other';

export type BudgetCategory = {
    category: CategoryType;
    amount: number;
};

export type TimelineItem = {
    order: number;
    title: string;
    desc: string;
    address: string;
    type: CategoryType;
    price: number;
    coordinates: GeoPoint;
};

export type Recommendation = {
    name: string;
    price: number;
    rating: number;
    address: string;
    description: string;
    image?: string;
};

export type ItineraryDay = {
    day: number;
    title: string;
    distance: string;
    stopLocation: GeoPoint;
    timeline: TimelineItem[];
    hotelRecommendations?: Recommendation[];
    foodRecommendations?: Recommendation[];
    activityRecommendations?: Recommendation[];
};

// --- AI Service Types ---
export type TripVibe = 'balanced' | 'comfort' | 'explorer' | 'foodie';

export type AiTripInput = {
    origin: string;
    destination: string;
    duration: number;
    budget: number;
    travelers: {
        adults: number;
        children: number;
    };
    carName: string;
    mpg: string | number;
    gasPrice: string | number;
    vibe: TripVibe;
    isRoundTrip: boolean;
};

export type AiTripResponse = {
    tripName: string;
    estimatedCost: number;
    budgetBreakdown: BudgetCategory[];
    itinerary: ItineraryDay[];
    warning?: string;
};

// --- Firestore Data Types ---

export type TripPayload = {
    userId: string;
    origin: string;
    originCoordinates?: GeoPoint | null;
    destination: string;
    startDate: Date | string | null;
    endDate?: Date | string | null;
    duration: number;
    image?: string;
    travelers: { adults: number; children: number };
    budget: number;

    vehicle: { name: string; mpg: number; gasPrice: number };

    title: string;
    estimatedCost: number;
    budgetBreakdown: BudgetCategory[];
    itinerary: ItineraryDay[];

    spent: number;
    createdAt: any;
};

export type Trip = TripPayload & {
    id: string;
};