import { MusicProvider, MusicTrack } from "./types";

export class SpotifyMusicProvider implements MusicProvider {
  id = "spotify";
  name = "Spotify";

  async searchTracks(query: string): Promise<MusicTrack[]> {
    if (!query || !query.trim()) return [];

    try {
      const response = await fetch(
        `/api/music/search?q=${encodeURIComponent(query.trim())}&provider=spotify`
      );

      if (!response.ok) {
        throw new Error(`Spotify search failed with status ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data.tracks)) {
        return data.tracks;
      }
      return [];
    } catch (err) {
      console.warn("[SpotifyMusicProvider] Search error:", err);
      return [];
    }
  }
}
