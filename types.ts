
export interface Dot {
  lat: number;
  lng: number;
  id: string;
  phaseX: number;
  phaseY: number;
  amplitude: number;
  speed: number;
  // Physics state
  offX: number;
  offY: number;
  vx: number;
  vy: number;
}

export interface GlobeState {
  rotation: [number, number, number];
  scale: number;
}

export interface LocationInsight {
  name: string;
  description: string;
  funFact: string;
  coordinates: { lat: number; lng: number };
}
