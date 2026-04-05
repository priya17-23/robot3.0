/**
 * Selectable interviewer personas: distinct look (3D palette) + voice (browser TTS hints).
 * Visuals stay stylized “humanoid” rigs—tunable toward warmer skin tones and softer materials.
 */

export type VoiceHint = "female" | "male" | "neutral";

export type AvatarPalette = {
  bodyTorso: string;
  bodyChest: string;
  coreGlow: string;
  bodyShoulder: string;
  neck: string;
  earModule: string;
  helmet: string;
  plateDark: string;
  accentEmissive: string;
  sidePlate: string;
  chin: string;
  facePlate: string;
  cheekPlate: string;
  lip: string;
  lipLower: string;
  iris: string;
  eyeInnerGlow: string;
  outerEyeHalo: string;
  frontEyeSphere: string;
  lightCool: string;
  lightWarm: string;
  /** Slightly lower metalness reads more “organic” on the face shell */
  faceMetalness: number;
  faceRoughness: number;
};

export type InterviewerAvatar = {
  id: string;
  name: string;
  role: string;
  tagline: string;
  introduction: string;
  headYawLimitDeg: number;
  pitch: number;
  rate: number;
  voiceHint: VoiceHint;
  palette: AvatarPalette;
};

const techMetal: Pick<AvatarPalette, "faceMetalness" | "faceRoughness"> = {
  faceMetalness: 0.95,
  faceRoughness: 0.1,
};

const humanSoft: Pick<AvatarPalette, "faceMetalness" | "faceRoughness"> = {
  faceMetalness: 0.42,
  faceRoughness: 0.48,
};

export const DEFAULT_AVATAR_PALETTE: AvatarPalette = {
  bodyTorso: "#0b1220",
  bodyChest: "#020617",
  coreGlow: "#38bdf8",
  bodyShoulder: "#0f172a",
  neck: "#0b1220",
  earModule: "#0b1220",
  helmet: "#11324d",
  plateDark: "#0b2136",
  accentEmissive: "#ef4444",
  sidePlate: "#0f2a44",
  chin: "#0b1220",
  facePlate: "#020617",
  cheekPlate: "#0f172a",
  lip: "#f8fafc",
  lipLower: "#f1f5f9",
  iris: "#1e40af",
  eyeInnerGlow: "#ef4444",
  outerEyeHalo: "#ef4444",
  frontEyeSphere: "#38bdf8",
  lightCool: "#38bdf8",
  lightWarm: "#ef4444",
  ...techMetal,
};

export const INTERVIEWER_AVATARS: InterviewerAvatar[] = [
  {
    id: "maya",
    name: "Maya Chen",
    role: "Technical lead",
    tagline: "Systems, tradeoffs, and depth",
    introduction:
      "Hi, I am Maya. I will steer our technical discussion—take your time, and think out loud when it helps.",
    headYawLimitDeg: 88,
    pitch: 1.08,
    rate: 0.92,
    voiceHint: "female",
    palette: {
      ...DEFAULT_AVATAR_PALETTE,
      helmet: "#4c2f3a",
      plateDark: "#3d2430",
      facePlate: "#271a1f",
      chin: "#2a1b22",
      cheekPlate: "#3f2a32",
      coreGlow: "#f472b6",
      lip: "#fecdd3",
      lipLower: "#fbcfe8",
      iris: "#15803d",
      eyeInnerGlow: "#f472b6",
      outerEyeHalo: "#fda4af",
      frontEyeSphere: "#7dd3fc",
      lightCool: "#f9a8d4",
      lightWarm: "#fb7185",
      ...humanSoft,
    },
  },
  {
    id: "james",
    name: "James Okonkwo",
    role: "Hiring manager",
    tagline: "Behavioral & communication",
    introduction:
      "Hello, I am James. I care about how you collaborate and communicate—clear examples go a long way.",
    headYawLimitDeg: 95,
    pitch: 0.94,
    rate: 0.88,
    voiceHint: "male",
    palette: {
      ...DEFAULT_AVATAR_PALETTE,
      helmet: "#2c3f4f",
      plateDark: "#1e2f3d",
      facePlate: "#152028",
      chin: "#18242e",
      cheekPlate: "#243848",
      coreGlow: "#34d399",
      lip: "#e2e8f0",
      lipLower: "#cbd5e1",
      iris: "#2563eb",
      eyeInnerGlow: "#22d3ee",
      outerEyeHalo: "#38bdf8",
      frontEyeSphere: "#5eead4",
      lightCool: "#5eead4",
      lightWarm: "#fbbf24",
      ...humanSoft,
    },
  },
  {
    id: "elena",
    name: "Elena Vasquez",
    role: "Senior engineer",
    tagline: "Coding & problem solving",
    introduction:
      "Hey, I am Elena. We will focus on how you approach problems—clarity and correctness both matter.",
    headYawLimitDeg: 82,
    pitch: 1.02,
    rate: 0.95,
    voiceHint: "female",
    palette: {
      ...DEFAULT_AVATAR_PALETTE,
      helmet: "#3d3a36",
      plateDark: "#2d2926",
      facePlate: "#1c1917",
      chin: "#292524",
      cheekPlate: "#44403c",
      coreGlow: "#fcd34d",
      lip: "#fde68a",
      lipLower: "#fcd34d",
      iris: "#b45309",
      eyeInnerGlow: "#f59e0b",
      outerEyeHalo: "#fbbf24",
      frontEyeSphere: "#fde047",
      lightCool: "#fcd34d",
      lightWarm: "#ea580c",
      ...humanSoft,
    },
  },
  {
    id: "arjun",
    name: "Arjun Mehta",
    role: "Panel host",
    tagline: "Balanced full loop",
    introduction:
      "Good to meet you, I am Arjun. I will mix technical and people-focused prompts like a typical panel round.",
    headYawLimitDeg: 90,
    pitch: 0.98,
    rate: 0.9,
    voiceHint: "male",
    palette: {
      ...DEFAULT_AVATAR_PALETTE,
      helmet: "#1e3a4f",
      plateDark: "#152a3d",
      facePlate: "#0f1729",
      chin: "#111c2e",
      cheekPlate: "#1e293b",
      coreGlow: "#60a5fa",
      lip: "#f1f5f9",
      lipLower: "#e2e8f0",
      iris: "#6366f1",
      eyeInnerGlow: "#a78bfa",
      outerEyeHalo: "#818cf8",
      frontEyeSphere: "#38bdf8",
      lightCool: "#60a5fa",
      lightWarm: "#c084fc",
      ...techMetal,
    },
  },
];

export function getInterviewerAvatar(id: string): InterviewerAvatar {
  return INTERVIEWER_AVATARS.find((a) => a.id === id) ?? INTERVIEWER_AVATARS[0];
}
