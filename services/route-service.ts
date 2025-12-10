// services/route-service.ts

import { GeoPoint } from '@/constants/types';
import { decode } from "@googlemaps/polyline-codec";

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY || '';
const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

// Define the return type structure
export interface RouteResult {
    points: GeoPoint[];
    encodedPolyline: string;
    legs: {
        distanceMeters: number;
        duration: string; // Format like "3600s"
    }[];
    totalDistanceMeters: number;
    totalDurationSeconds: number;
}

export const RouteService = {
    /**
     * Fetches a route using the new Google Routes API (v2)
     */
    async getRoute(origin: GeoPoint, destination: GeoPoint, waypoints: GeoPoint[] = []): Promise<RouteResult | null> {
        if (!GOOGLE_API_KEY) {
            console.error("Missing Google API Key");
            return null;
        }

        const body = {
            origin: {
                location: { latLng: { latitude: origin.lat, longitude: origin.lng } }
            },
            destination: {
                location: { latLng: { latitude: destination.lat, longitude: destination.lng } }
            },
            intermediates: waypoints.map(pt => ({
                location: { latLng: { latitude: pt.lat, longitude: pt.lng } }
            })),
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_UNAWARE',
        };

        try {
            const response = await fetch(ROUTES_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': GOOGLE_API_KEY,
                    // UPDATED: Request legs, total distance, and duration
                    'X-Goog-FieldMask': 'routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration,routes.legs',
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const encoded = route.polyline.encodedPolyline;

                // 1. Decode polyline
                const points = decode(encoded, 5).map(([lat, lng]) => ({
                    lat,
                    lng
                }));

                // 2. Parse Totals
                const totalDistance = route.distanceMeters || 0;
                // Duration comes as "3600s", remove 's' and parse
                const totalDuration = parseInt((route.duration || "0s").replace('s', ''), 10);

                return {
                    points,
                    legs: route.legs || [],
                    encodedPolyline: encoded,
                    totalDistanceMeters: totalDistance,
                    totalDurationSeconds: totalDuration
                };
            }

            console.warn("No routes found", data);
            return null;

        } catch (error) {
            console.error("Routes API Error:", error);
            return null;
        }
    }
};