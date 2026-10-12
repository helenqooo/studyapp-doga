import type { Accessory, BrowKind, Effect, EyeKind, MouthKind } from './parts';

/** What Lumi is doing or feeling; each mood has its own pose and motion. */
export type MascotMood =
  | 'idle'
  | 'wave'
  | 'happy'
  | 'celebrate'
  | 'sad'
  | 'thinking'
  | 'talking'
  | 'listening'
  | 'sleepy'
  | 'surprised'
  | 'love'
  | 'focus'
  | 'break'
  | 'confused'
  | 'cheer'
  | 'proud'
  | 'reading'
  | 'study'
  | 'wink'
  | 'graduate';

/** How the whole body moves in a loop. */
export type BodyMotion = 'breathe' | 'hop' | 'jump' | 'droop' | 'sway' | 'nod' | 'wobble' | 'bob';
/** How an arm moves in a loop around its pose angle. */
export type ArmMotion = 'none' | 'wave' | 'wiggle' | 'shake' | 'gesture' | 'tap' | 'scribble' | 'sip' | 'pop';

export interface Pose {
  eyes: EyeKind;
  brows?: BrowKind;
  mouth: MouthKind;
  /** Arm angles in degrees (0 = hanging down, + = clockwise). */
  armL: number;
  armR: number;
  armMotionL?: ArmMotion;
  armMotionR?: ArmMotion;
  body: BodyMotion;
  /** Lean in degrees around the feet. */
  tilt?: number;
  /** Raised (negative) or sunk (positive) at rest, in grid units. */
  lift?: number;
  worn?: Accessory[];
  /** Held in the hands (pom-poms in both, a pencil in the right, a cup in the right). */
  held?: 'pompoms' | 'pencil' | 'cup';
  effects?: Effect[];
  /** Antenna light: 1 = normal, 0.4 = dim (sleepy); `pulse` throbs while thinking. */
  glow?: number;
  pulse?: boolean;
  /** Mouth flaps (talking). */
  talk?: boolean;
  blush?: boolean;
}

const REST_L = 28;
const REST_R = -28;

export const POSES: Record<MascotMood, Pose> = {
  idle: { eyes: 'open', mouth: 'smile', armL: REST_L, armR: REST_R, body: 'breathe' },
  wave: { eyes: 'open', mouth: 'grin', armL: REST_L, armR: -150, armMotionR: 'wave', body: 'breathe' },
  happy: { eyes: 'happy', mouth: 'grin', armL: 40, armR: -40, body: 'hop', lift: -4, effects: ['sparkles'] },
  celebrate: {
    eyes: 'happy',
    mouth: 'grin',
    armL: 145,
    armR: -145,
    armMotionL: 'wiggle',
    armMotionR: 'wiggle',
    body: 'jump',
    worn: ['party'],
    effects: ['confetti'],
  },
  sad: { eyes: 'sad', brows: 'sad', mouth: 'sad', armL: 12, armR: -12, body: 'droop', lift: 4, effects: ['tear'], glow: 0.6 },
  thinking: { eyes: 'up', mouth: 'small', armL: REST_L, armR: 78, armMotionR: 'tap', body: 'breathe', effects: ['question'], pulse: true },
  talking: { eyes: 'open', mouth: 'talk', armL: REST_L, armR: -105, armMotionR: 'gesture', body: 'sway', talk: true },
  listening: { eyes: 'open', mouth: 'small', armL: REST_L, armR: REST_R, body: 'nod', tilt: -7 },
  sleepy: { eyes: 'closed', mouth: 'small', armL: 18, armR: -18, body: 'breathe', effects: ['zzz'], glow: 0.4 },
  surprised: {
    eyes: 'wide',
    brows: 'raised',
    mouth: 'o',
    armL: 70,
    armR: -70,
    armMotionL: 'pop',
    armMotionR: 'pop',
    body: 'bob',
    effects: ['exclaim'],
  },
  love: { eyes: 'heart', mouth: 'grin', armL: 40, armR: -40, body: 'sway', effects: ['hearts'], blush: true },
  focus: { eyes: 'open', brows: 'focus', mouth: 'flat', armL: REST_L, armR: REST_R, body: 'nod', worn: ['headphones'] },
  break: { eyes: 'happy', mouth: 'small', armL: REST_L, armR: 40, armMotionR: 'sip', body: 'breathe', held: 'cup', effects: ['steam'] },
  confused: { eyes: 'spiral', mouth: 'wavy', armL: 20, armR: -20, body: 'wobble', tilt: 5, effects: ['sweat', 'question'] },
  cheer: {
    eyes: 'happy',
    mouth: 'grin',
    armL: 140,
    armR: -140,
    armMotionL: 'shake',
    armMotionR: 'shake',
    body: 'hop',
    lift: -6,
    held: 'pompoms',
    effects: ['flame'],
  },
  proud: { eyes: 'happy', mouth: 'cat', armL: REST_L, armR: REST_R, body: 'bob', worn: ['crown'], effects: ['sparkles'] },
  reading: { eyes: 'down', mouth: 'small', armL: -40, armR: 40, body: 'breathe', worn: ['glasses', 'book'] },
  study: { eyes: 'open', brows: 'focus', mouth: 'small', armL: REST_L, armR: -120, armMotionR: 'scribble', body: 'breathe', held: 'pencil' },
  wink: { eyes: 'wink', mouth: 'grin', armL: REST_L, armR: -60, body: 'bob' },
  graduate: { eyes: 'happy', mouth: 'grin', armL: REST_L, armR: -150, armMotionR: 'wave', body: 'hop', worn: ['cap'], effects: ['sparkles'] },
};

/** Moods that hide the antenna light under a hat or a headband. */
export const HIDES_ANTENNA: Accessory[] = ['cap'];
