export type CardSizeId = "square" | "portrait" | "story";
export type TextAlignment = "left" | "center" | "right";
export type DecorationStyle = "arch" | "crescent" | "lantern" | "mosaic";

export interface CardSizeDefinition {
  readonly height: number;
  readonly id: CardSizeId;
  readonly label: string;
  readonly width: number;
}

export interface TemplatePalette {
  readonly accent: string;
  readonly accentSoft: string;
  readonly backdropEnd: string;
  readonly backdropStart: string;
  readonly border: string;
  readonly glow: string;
  readonly text: string;
}

export interface EidTemplate {
  readonly badge: string;
  readonly decoration: DecorationStyle;
  readonly defaultMessage: string;
  readonly description: string;
  readonly editorImagePath: string;
  readonly galleryImagePath: string;
  readonly headline: string;
  readonly id: string;
  readonly kicker: string;
  readonly name: string;
  readonly palette: TemplatePalette;
}

export interface EditorState {
  readonly accentColor: string;
  readonly alignment: TextAlignment;
  readonly backgroundSource: string | null;
  readonly bodySize: number;
  readonly message: string;
  readonly overlayStrength: number;
  readonly recipient: string;
  readonly sender: string;
  readonly sizeId: CardSizeId;
  readonly templateId: string;
  readonly textColor: string;
  readonly textX: number;
  readonly textY: number;
  readonly titleSize: number;
}

export const CARD_SIZES = {
  square: {
    height: 1080,
    id: "square",
    label: "Square 1:1",
    width: 1080,
  },
  portrait: {
    height: 1350,
    id: "portrait",
    label: "Portrait 4:5",
    width: 1080,
  },
  story: {
    height: 1920,
    id: "story",
    label: "Story 9:16",
    width: 1080,
  },
} satisfies Record<CardSizeId, CardSizeDefinition>;

export const CARD_SIZE_OPTIONS = Object.values(CARD_SIZES);

export const EID_TEMPLATES = [
  {
    badge: "Minimal",
    decoration: "arch",
    defaultMessage:
      "Semoga Idulfitri ini membawa hati yang lapang, rumah yang damai, dan langkah yang penuh keberkahan.",
    description:
      "Adaptasi template Canva bernuansa hijau-cokelat yang sederhana, hangat, dan dekat dengan warna brand.",
    editorImagePath: "/image/templates/template-01.png",
    galleryImagePath: "/image/gallery/template-01.png",
    headline: "Eid Mubarak",
    id: "template-01",
    kicker: "Green Brown Simple",
    name: "Green Brown Simple",
    palette: {
      accent: "#59cd00",
      accentSoft: "#f4ffd2",
      backdropEnd: "#3b281f",
      backdropStart: "#7abf1e",
      border: "#ffd21f",
      glow: "#e2f8a4",
      text: "#fffef7",
    },
  },
  {
    badge: "Mosque",
    decoration: "arch",
    defaultMessage:
      "Taqabbalallahu minna wa minkum. Semoga setiap doa baik yang dipanjatkan di hari ini dibalas dengan kebaikan yang berlipat.",
    description:
      "Adaptasi template Canva dengan siluet masjid yang elegan, lalu direcolor ke hijau lembut dan aksen emas.",
    editorImagePath: "/image/templates/template-02.png",
    galleryImagePath: "/image/gallery/template-02.png",
    headline: "Selamat Idulfitri",
    id: "template-02",
    kicker: "Blue Yellow Mosque",
    name: "Blue Yellow Mosque",
    palette: {
      accent: "#ffd21f",
      accentSoft: "#fff4b7",
      backdropEnd: "#7eaf20",
      backdropStart: "#f7ffe0",
      border: "#d7ee9f",
      glow: "#ffe792",
      text: "#2f1d19",
    },
  },
  {
    badge: "Floral",
    decoration: "mosaic",
    defaultMessage:
      "Mari menutup Ramadan dengan syukur dan membuka hari raya dengan pelukan hangat, silaturahmi, dan banyak kebaikan.",
    description:
      "Versi floral premium dari template Canva dengan permainan emas lembut dan hijau daun yang lebih editorial.",
    editorImagePath: "/image/templates/template-03.png",
    galleryImagePath: "/image/gallery/template-03.png",
    headline: "Eid Blessings",
    id: "template-03",
    kicker: "Blue Gold Floral",
    name: "Blue Gold Floral",
    palette: {
      accent: "#ffd21f",
      accentSoft: "#fff6c7",
      backdropEnd: "#537d17",
      backdropStart: "#d7ef93",
      border: "#f8e07a",
      glow: "#ecffbf",
      text: "#fffef8",
    },
  },
  {
    badge: "Moonlight",
    decoration: "crescent",
    defaultMessage:
      "Semoga setiap langkah selepas Ramadan tetap dijaga dalam ketenangan, keikhlasan, dan cinta pada sesama.",
    description:
      "Adaptasi template Canva bertema bulan dan bintang untuk ucapan yang lebih atmosferik dan tenang.",
    editorImagePath: "/image/templates/template-04.png",
    galleryImagePath: "/image/gallery/template-04.png",
    headline: "Blessed Eid",
    id: "template-04",
    kicker: "Moon and Stars",
    name: "Moon and Stars",
    palette: {
      accent: "#ffd21f",
      accentSoft: "#fff7cf",
      backdropEnd: "#2f1d19",
      backdropStart: "#6d8b18",
      border: "#ffd21f",
      glow: "#fff0a7",
      text: "#fffdf3",
    },
  },
] satisfies readonly EidTemplate[];

export const DEFAULT_TEMPLATE_ID = EID_TEMPLATES[0].id;

export const MESSAGE_PRESETS = [
  "Semoga amal ibadah kita diterima dan hati kita dijaga tetap lembut setelah Ramadan.",
  "Selamat Idulfitri, mohon maaf lahir dan batin. Semoga kebahagiaan memenuhi rumah kita semua.",
  "Taqabbalallahu minna wa minkum. Semoga hari raya ini menguatkan cinta, doa, dan silaturahmi.",
  "Hari kemenangan ini semoga menjadi awal yang lebih jernih, lebih ikhlas, dan lebih bermakna.",
] as const;

export const ACCENT_SWATCHES = [
  "#59cd00",
  "#84d61c",
  "#ffd21f",
  "#f8b700",
  "#2f1d19",
  "#a6df53",
] as const;

export const TEXT_SWATCHES = [
  "#fffef7",
  "#fff8d9",
  "#f4ffe6",
  "#2f1d19",
  "#5a473e",
] as const;

export const DEFAULT_SETTINGS: EditorState = {
  accentColor: EID_TEMPLATES[0].palette.accent,
  alignment: "center",
  backgroundSource: null,
  bodySize: 38,
  message: EID_TEMPLATES[0].defaultMessage,
  overlayStrength: 58,
  recipient: "Sahabat terbaik",
  sender: "Keluarga Anda",
  sizeId: "square",
  templateId: DEFAULT_TEMPLATE_ID,
  textColor: EID_TEMPLATES[0].palette.text,
  textX: 50,
  textY: 57,
  titleSize: 100,
};
