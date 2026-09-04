import { MusicProvider, MusicTrack } from "./types";

export class ITunesMusicProvider implements MusicProvider {
  id = "itunes";
  name = "Apple Music Catalog";

  async searchTracks(query: string): Promise<MusicTrack[]> {
    if (!query || !query.trim()) return [];

    try {
      const response = await fetch(
        `/api/music/search?q=${encodeURIComponent(query.trim())}&provider=itunes`
      );

      if (!response.ok) {
        throw new Error(`iTunes search failed with status ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data.tracks)) {
        return data.tracks;
      }
      return [];
    } catch (err) {
      console.warn("[ITunesMusicProvider] Search error:", err);
      return [];
    }
  }
}
