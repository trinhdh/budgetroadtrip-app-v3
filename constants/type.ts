// --- Type Definitions ---

export type GeoPoint = {
    latitude: number;
    longitude: number;
};

export type BudgetCategory = {
    category: string;
    amount: number;
    icon: string;
    color: string;
};

export type TimelineItem = {
    time: string;
    title: string;
    desc: string;
    address: string;
    type: 'activity' | 'food' | 'hotel' | 'other';
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