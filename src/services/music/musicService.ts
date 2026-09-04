import { MusicProvider, MusicTrack } from "./types";
import { SpotifyMusicProvider } from "./spotifyProvider";
import { ITunesMusicProvider } from "./itunesProvider";

class MusicService {
  private providers: Map<string, MusicProvider> = new Map();
  private activeProviderId = "spotify";

  constructor() {
    this.registerProvider(new SpotifyMusicProvider());
    this.registerProvider(new ITunesMusicProvider());
  }

  public registerProvider(provider: MusicProvider): void {
    this.providers.set(provider.id, provider);
  }

  public setActiveProvider(providerId: string): void {
    if (this.providers.has(providerId)) {
      this.activeProviderId = providerId;
    }
  }

  public getActiveProvider(): MusicProvider {
    return this.providers.get(this.activeProviderId) || this.providers.get("spotify")!;
  }

  public getAvailableProviders(): { id: string; name: string }[] {
    return Array.from(this.providers.values()).map((p) => ({
      id: p.id,
      name: p.name,
    }));
  }

  public async searchTracks(query: string, providerId?: string): Promise<MusicTrack[]> {
    const targetProviderId = providerId || this.activeProviderId;
    const provider = this.providers.get(targetProviderId) || this.getActiveProvider();
    
    try {
      return await provider.searchTracks(query);
    } catch (err) {
      console.error(`Error searching tracks with provider ${provider.name}:`, err);
      return [];
    }
  }
}

export const musicService = new MusicService();
