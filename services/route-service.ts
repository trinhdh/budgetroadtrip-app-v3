// trinhdh/budgetroadtrip-app-v3/budgetroadtrip-app-v3-develop/services/route-service.ts

import { GeoPoint } from '@/constants/types';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';
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
                location: { latLng: { latitude: origin.latitude, longitude: origin.longitude } }
            },
            destination: {
                location: { latLng: { latitude: destination.latitude, longitude: destination.longitude } }
            },
            intermediates: waypoints.map(pt => ({
                location: { latLng: { latitude: pt.latitude, longitude: pt.longitude } }
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
                    // FieldMask reduces response size/cost. We only need the polyline.
                    'X-Goog-FieldMask': 'routes.polyline.encodedPolyline',
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const encodedPolyline = data.routes[0].polyline.encodedPolyline;
                return this.decodePolyline(encodedPolyline);
            }

            console.warn("No routes found", data);
            return null;

        } catch (error) {
            console.error("Routes API Error:", error);
            return null;
        }
    },

    /**
     * Decodes Google's Encoded Polyline Algorithm Format
     */
    decodePolyline(encoded: string): GeoPoint[] {
        const poly: GeoPoint[] = [];
        let index = 0, len = encoded.length;
        let lat = 0, lng = 0;

        while (index < len) {
            let b, shift = 0, result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            poly.push({
                latitude: lat / 1e5,
                longitude: lng / 1e5
            });
        }
        return poly;
    }
};