// If a score is below this value, we don't generate a model preodiction.
export const MIN_SCORE = 0.2

// If a score is below this value, we don't display it in the UI.
// this _might_ need to be tuned per-processor
export const MIN_DISPLAY_SCORE = 0.5

export type GeneratorInfo = {
  displayName: string
  // two or three letter abbreviation
  abbreviation: string
  iconPath?: string
}

export const generators: Record<string, GeneratorInfo> = {
  dalle: {
    displayName: "DALL-E",
    abbreviation: "DE",
    iconPath: "/generators/openai.svg",
  },
  midjourney: {
    displayName: "MidJourney",
    abbreviation: "MJ",
    iconPath: "/generators/midjourney.svg",
  },
  stablediffusion: {
    displayName: "Stable Diffusion",
    abbreviation: "SD",
  },
  hive: {
    displayName: "Hive",
    abbreviation: "H",
    iconPath: "/generators/hive.jpg",
  },
  bingimagecreator: {
    displayName: "Bing Image Creator",
    abbreviation: "BI",
    iconPath: "/generators/microsoft.svg",
  },
  gan: {
    displayName: "Generative Adversarial Network",
    abbreviation: "G",
  },
  adobefirefly: {
    displayName: "Adobe Firefly",
    abbreviation: "AF",
    iconPath: "/generators/adobefirefly.svg",
  },
  kandinsky: {
    displayName: "Kandinsky",
    abbreviation: "K",
  },
  lcm: {
    displayName: "Latent Consistent Model",
    abbreviation: "L",
  },
  pixart: {
    displayName: "Pixart",
    abbreviation: "PA",
  },
  glide: {
    displayName: "Glide",
    abbreviation: "G",
  },
  imagen: {
    displayName: "Imagen",
    abbreviation: "I",
  },
  amused: {
    displayName: "Amused",
    abbreviation: "A",
  },
  stablecascade: {
    displayName: "Stable Cascade",
    abbreviation: "SC",
  },
  deepfloyd: {
    displayName: "DeepFloyd",
    abbreviation: "DF",
  },
  vqdiffusion: {
    displayName: "VQ Diffusion",
    abbreviation: "VQ",
  },
  wuerstchen: {
    displayName: "Wuerstchen",
    abbreviation: "W",
  },
  titan: {
    displayName: "Titan",
    abbreviation: "T",
  },
  sora: {
    displayName: "Sora",
    abbreviation: "S",
  },
  pika: {
    displayName: "Pika",
    abbreviation: "P",
  },
  harper: {
    displayName: "Harper",
    abbreviation: "H",
  },
}

export type Generator = keyof typeof generators

export type GeneratorPrediction = {
  generator: Generator
  score: number
}
