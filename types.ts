
export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Dent {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  shadowColor: string;
  highlightColor: string;
  createdAt: number;
}

export interface Spider {
  id: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  speed: number;
  targetX: number;
  targetY: number;
  createdAt: number;
}

export interface Needle {
  x: number;
  y: number;
  length: number;
  rotation: number;
  color: string;
}

export interface Bruise {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  intensity: number; // 0 to 1
  aspectRatio: number;
}

export interface Swelling {
  x: number;
  y: number;
  radius: number;
  intensity: number;
  aspectRatio: number;
  rotation: number;
  createdAt: number;
}

export interface SlapAnimation {
  id: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  createdAt: number;
}

export interface Burn {
  id: number;
  x: number;
  y: number;
  radius: number;
  intensity: number;
  createdAt: number;
  baseColor: { r: number; g: number; b: number };
  shapePoints: { angle: number; radius: number; }[];
}

export interface Smoke {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  createdAt: number;
  vx: number;
  vy: number;
}

export interface Phlegm {
  x: number;
  y: number;
  size: number;
  rotation: number;
  createdAt: number;
  baseColor: { r: number, g: number, b: number };
}

export interface ShoeAnimation {
  id: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  createdAt: number;
  effectType: 'star' | 'dizzy' | 'pow';
}

export interface FlameParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
}
