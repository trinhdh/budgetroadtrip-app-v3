const PEXELS_API_KEY = process.env.EXPO_PUBLIC_PEXELS_API_KEY;
const BASE_URL = 'https://api.pexels.com/v1/search';

export const ImageService = {
    /**
     * Searches Pexels for a photo matching the query.
     * Appends "skyline" to find scenic city/landscape shots.
     */
    async getPlaceImage(query: string): Promise<string | null> {
        if (!PEXELS_API_KEY) {
            console.warn("Pexels API Key is missing.");
            return null;
        }

        try {
            // 1. IMPROVEMENT: Append "skyline" or "scenic" to get better results
            // e.g. "Paris" -> "Paris skyline"
            const searchQuery = `${query} skyline`;

            const response = await fetch(`${BASE_URL}?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=landscape`, {
                headers: {
                    Authorization: PEXELS_API_KEY
                }
            });

            const data = await response.json();

            if (data.photos && data.photos.length > 0) {
                // Return the 'large2x' for high quality or 'large' for speed
                return data.photos[0].src.large2x;
            }

            return null;
        } catch (error) {
            console.error("Failed to fetch image from Pexels:", error);
            return null;
        }
    }
};