const PEXELS_API_KEY = process.env.EXPO_PUBLIC_PEXELS_API_KEY;
const BASE_URL = 'https://api.pexels.com/v1/search';

export const ImageService = {
    /**
     * Searches Pexels for a photo matching the query (e.g. "Paris", "Road Trip")
     */
    async getPlaceImage(query: string): Promise<string | null> {
        if (!PEXELS_API_KEY) {
            console.warn("Pexels API Key is missing.");
            return null;
        }

        try {
            const response = await fetch(`${BASE_URL}?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`, {
                headers: {
                    Authorization: PEXELS_API_KEY
                }
            });

            const data = await response.json();

            if (data.photos && data.photos.length > 0) {
                // Return the 'large2x' or 'medium' url
                return data.photos[0].src.large2x;
            }

            return null;
        } catch (error) {
            console.error("Failed to fetch image from Pexels:", error);
            return null;
        }
    }
};