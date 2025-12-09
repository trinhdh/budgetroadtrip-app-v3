// trinhdh/budgetroadtrip-app-v3/budgetroadtrip-app-v3-develop/services/route-service.ts

import { GeoPoint } from '@/constants/types';
import { decode } from "@googlemaps/polyline-codec"; // <--- Official Google Library

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY || '';
const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

export const RouteService = {
    /**
     * Fetches a route using the new Google Routes API (v2)
     */
    async getRoute(origin: GeoPoint, destination: GeoPoint, waypoints: GeoPoint[] = []) {
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
                    'X-Goog-FieldMask': 'routes.polyline.encodedPolyline',
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const encoded = data.routes[0].polyline.encodedPolyline;

                // --- GOOGLE LIBRARY USAGE ---
                // 1. Decode returns array of arrays: [[lat, lng], [lat, lng]]
                const points = decode(encoded, 5);

                // 2. Map to your App's GeoPoint structure { lat, lng }
                return points.map(([lat, lng]) => ({
                    lat,
                    lng
                }));
            }

            console.warn("No routes found", data);
            return null;

        } catch (error) {
            console.error("Routes API Error:", error);
            return null;
        }
    }
};