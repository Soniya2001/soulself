import { JournalMusicTrack } from "../../types";

export type MusicTrack = JournalMusicTrack;

export interface MusicProvider {
  id: string;
  name: string;
  searchTracks(query: string): Promise<MusicTrack[]>;
}
