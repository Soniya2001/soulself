import { AmbientSoundOption, AmbientPreference } from "../types";

export const AMBIENT_SOUND_OPTIONS: AmbientSoundOption[] = [
  {
    id: "piano-waterfall",
    name: "Piano & Waterfall",
    emoji: "🎹",
    description: "Relaxing acoustic piano chords with peaceful flowing water",
    audioPath: "/audio/piano-waterfall.mp3",
    isRecommended: true,
  },
  {
    id: "flowing-waterfall",
    name: "Flowing Waterfall",
    emoji: "🌊",
    description: "Continuous peaceful waterfall & water flowing over rocks",
    audioPath: "/audio/flowing-waterfall.mp3",
  },
  {
    id: "running-stream",
    name: "Running Stream",
    emoji: "🏞️",
    description: "Soft stream water trickling peacefully over smooth stones",
    audioPath: "/audio/running-stream.mp3",
  },
  {
    id: "gentle-rain",
    name: "Gentle Rain",
    emoji: "🌧️",
    description: "Soft rainfall on leaves for quiet reflection",
    audioPath: "/audio/gentle-rain.mp3",
  },
  {
    id: "forest-breeze",
    name: "Forest Breeze",
    emoji: "🌲",
    description: "Subtle breeze through trees and tranquil forest canopy",
    audioPath: "/audio/forest-breeze.mp3",
  },
  {
    id: "ocean-shore",
    name: "Ocean Shore",
    emoji: "🌊",
    description: "Gentle calm ocean waves rolling onto the sand",
    audioPath: "/audio/ocean-shore.mp3",
  },
];

export const DEFAULT_AMBIENT_PREFERENCE: AmbientPreference = {
  soundId: "piano-waterfall",
  volume: 0.35, // 35% default (within 30-40% requirement)
  isMuted: false,
  rememberChoice: true,
};

export const AMBIENT_PREFERENCE_STORAGE_KEY = "soulself_ambient_preference";
