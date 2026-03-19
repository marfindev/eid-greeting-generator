"use client";

import Image from "next/image";
import {
  type ChangeEvent,
  type PointerEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  ACCENT_SWATCHES,
  CARD_SIZE_OPTIONS,
  CARD_SIZES,
  DEFAULT_SETTINGS,
  DEFAULT_TEMPLATE_IMAGE_PATH,
  type EditorState,
  EID_TEMPLATES,
  type EidTemplate,
  MESSAGE_PRESETS,
  TEXT_SWATCHES,
  type TextAlignment,
} from "@/data/eid-templates";
import { bodyFont, displayFont } from "@/lib/fonts";
import { type CardTextBounds, renderGreetingCard } from "@/lib/greeting-card";

type StudioTab = "gallery" | "simple" | "studio";

interface DragState {
  readonly originTextX: number;
  readonly originTextY: number;
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
}

interface CanvasPoint {
  readonly x: number;
  readonly y: number;
}

interface GreetingCanvasProps {
  readonly backgroundImage: HTMLImageElement | null;
  readonly canvasRef: React.RefObject<HTMLCanvasElement | null>;
  readonly className?: string;
  readonly interactive?: boolean;
  readonly onBoundsChange?: (bounds: CardTextBounds) => void;
  readonly onPointerCancel?: (event: PointerEvent<HTMLCanvasElement>) => void;
  readonly onPointerDown?: (event: PointerEvent<HTMLCanvasElement>) => void;
  readonly onPointerMove?: (event: PointerEvent<HTMLCanvasElement>) => void;
  readonly onPointerUp?: (event: PointerEvent<HTMLCanvasElement>) => void;
  readonly settings: EditorState;
  readonly template: EidTemplate;
  readonly templateImage: HTMLImageElement | null;
}

interface GalleryDirection {
  readonly alignment: TextAlignment;
  readonly bodySize: number;
  readonly message: string;
  readonly overlayStrength: number;
  readonly sender: string;
  readonly sizeId: EditorState["sizeId"];
  readonly textX: number;
  readonly textY: number;
  readonly titleSize: number;
}

interface GalleryCardProps {
  readonly index: number;
  readonly onUseTemplate: (templateId: string) => void;
  readonly template: EidTemplate;
}

interface PanelProps {
  readonly children: React.ReactNode;
  readonly description?: string;
  readonly title?: string;
}

interface RangeFieldProps {
  readonly label: string;
  readonly maximum: number;
  readonly minimum: number;
  readonly onChange: (value: number) => void;
  readonly step?: number;
  readonly value: number;
  readonly valueLabel?: string;
}

interface SwatchButtonProps {
  readonly active: boolean;
  readonly color: string;
  readonly label: string;
  readonly onClick: () => void;
}

const ALIGNMENT_OPTIONS = [
  {
    id: "left",
    label: "Rata kiri",
  },
  {
    id: "center",
    label: "Rata tengah",
  },
  {
    id: "right",
    label: "Rata kanan",
  },
] as const satisfies readonly {
  readonly id: TextAlignment;
  readonly label: string;
}[];

const EMPTY_BOUNDS: CardTextBounds = {
  height: 0,
  width: 0,
  x: 0,
  y: 0,
};

const DEFAULT_GALLERY_DIRECTION: GalleryDirection = {
  alignment: "center",
  bodySize: 30,
  message:
    "Semoga Idulfitri menghadirkan rumah yang damai, hati yang lapang, dan langkah yang tetap lembut setelah Ramadan.",
  overlayStrength: 56,
  sender: "Nama Anda",
  sizeId: "square",
  textX: 50,
  textY: 62,
  titleSize: 88,
};

const GALLERY_DIRECTIONS: Record<string, GalleryDirection> = {
  "template-01": {
    alignment: "center",
    bodySize: 30,
    message:
      "Semoga Idulfitri ini membawa hati yang lapang, rumah yang damai, dan langkah yang penuh keberkahan.",
    overlayStrength: 64,
    sender: "Nama Anda",
    sizeId: "square",
    textX: 50,
    textY: 67,
    titleSize: 90,
  },
  "template-02": {
    alignment: "center",
    bodySize: 29,
    message:
      "Taqabbalallahu minna wa minkum. Semoga syukur, damai, dan kebersamaan tumbuh selepas Ramadan.",
    overlayStrength: 34,
    sender: "Nama Anda",
    sizeId: "portrait",
    textX: 50,
    textY: 66,
    titleSize: 84,
  },
  "template-03": {
    alignment: "center",
    bodySize: 28,
    message:
      "Semoga hari raya ini menguatkan silaturahmi, melapangkan rezeki, dan menghadirkan banyak kebaikan.",
    overlayStrength: 48,
    sender: "Nama Anda",
    sizeId: "portrait",
    textX: 50,
    textY: 67,
    titleSize: 82,
  },
  "template-04": {
    alignment: "center",
    bodySize: 30,
    message:
      "Semoga setiap langkah selepas Ramadan tetap dijaga dalam ketenangan, keikhlasan, dan cinta pada sesama.",
    overlayStrength: 36,
    sender: "Nama Anda",
    sizeId: "story",
    textX: 50,
    textY: 66,
    titleSize: 88,
  },
};

const GALLERY_MOCKUP_WIDTHS = {
  portrait: "w-[74%] max-w-[255px]",
  square: "w-[86%] max-w-[312px]",
  story: "w-[66%] max-w-[224px]",
} as const satisfies Record<EditorState["sizeId"], string>;

const GALLERY_MOCKUP_ROTATIONS = [
  "-rotate-[1.4deg]",
  "rotate-[1deg]",
  "-rotate-[0.9deg]",
  "rotate-[1.2deg]",
] as const;

const clamp = (value: number, minimum: number, maximum: number): number => {
  return Math.min(Math.max(value, minimum), maximum);
};

const hexToRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace("#", "");
  const shortHex = normalized.length === 3;
  const segments = shortHex
    ? normalized.split("").map((segment) => `${segment}${segment}`)
    : (normalized.match(/.{1,2}/gu) ?? ["00", "00", "00"]);
  const [red, green, blue] = segments.map((segment) =>
    Number.parseInt(segment, 16)
  );

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/gu, "")
    .trim()
    .replace(/[-\s]+/gu, "-");
};

const getTemplateById = (templateId: string): EidTemplate => {
  return (
    EID_TEMPLATES.find((template) => template.id === templateId) ??
    EID_TEMPLATES[0]
  );
};

const getGalleryDirection = (templateId: string): GalleryDirection => {
  return GALLERY_DIRECTIONS[templateId] ?? DEFAULT_GALLERY_DIRECTION;
};

const getGalleryStageStyle = (template: EidTemplate) => {
  return {
    background: `radial-gradient(circle at 84% 12%, ${hexToRgba(
      template.palette.accent,
      0.22
    )} 0%, ${hexToRgba(template.palette.accent, 0)} 28%), linear-gradient(180deg, ${hexToRgba(
      "#ffffff",
      0.98
    )} 0%, ${hexToRgba(template.palette.accentSoft, 0.88)} 62%, #ffffff 100%)`,
  };
};

const getGalleryCardStyle = (template: EidTemplate) => {
  return {
    boxShadow: `0 26px 72px ${hexToRgba(template.palette.accent, 0.14)}`,
  };
};

const getGalleryFrameStyle = (template: EidTemplate) => {
  return {
    background: `linear-gradient(180deg, ${hexToRgba(
      "#ffffff",
      0.84
    )} 0%, ${hexToRgba(template.palette.text, 0.08)} 100%)`,
    borderColor: hexToRgba(template.palette.border, 0.58),
    boxShadow: `0 26px 44px ${hexToRgba("#111111", 0.16)}`,
  };
};

const getGalleryAccentGlowStyle = (template: EidTemplate) => {
  return {
    backgroundColor: hexToRgba(template.palette.accent, 0.26),
  };
};

const getGalleryMetaToneStyle = (template: EidTemplate) => {
  return {
    color: hexToRgba(template.palette.backdropEnd, 0.62),
  };
};

const getGalleryBadgeStyle = (template: EidTemplate) => {
  return {
    backgroundColor: hexToRgba(template.palette.accentSoft, 0.9),
    borderColor: hexToRgba(template.palette.border, 0.42),
    color: template.palette.backdropEnd,
  };
};

const buildFilename = (template: EidTemplate, senderName: string): string => {
  const nameSegment = senderName.trim() ? slugify(senderName.trim()) : "ucapan";
  return `eid-${slugify(template.name)}-${nameSegment}.png`;
};

const downloadCanvas = (
  canvas: HTMLCanvasElement,
  template: EidTemplate,
  senderName: string
): void => {
  const link = document.createElement("a");
  link.download = buildFilename(template, senderName);
  link.href = canvas.toDataURL("image/png");
  link.click();
};

const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Gagal membuat berkas gambar."));
    }, "image/png");
  });
};

const buildGreetingCopy = (
  template: EidTemplate,
  settings: EditorState
): string => {
  const senderLine = settings.sender.trim()
    ? `Dari, ${settings.sender.trim()}`
    : "";

  return [
    template.headline,
    settings.message.trim() || template.defaultMessage,
    senderLine,
  ]
    .filter(Boolean)
    .join("\n");
};

const getCanvasPoint = (
  canvas: HTMLCanvasElement,
  event: PointerEvent<HTMLCanvasElement>
): CanvasPoint => {
  const bounds = canvas.getBoundingClientRect();
  const scaleX = canvas.width / bounds.width;
  const scaleY = canvas.height / bounds.height;

  return {
    x: (event.clientX - bounds.left) * scaleX,
    y: (event.clientY - bounds.top) * scaleY,
  };
};

const isPointInsideBounds = (
  point: CanvasPoint,
  bounds: CardTextBounds
): boolean => {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
};

const applyTemplateSettings = (
  current: EditorState,
  nextTemplate: EidTemplate
): EditorState => {
  const currentTemplate = getTemplateById(current.templateId);
  const shouldReplaceMessage =
    current.message.trim() === "" ||
    current.message === currentTemplate.defaultMessage;

  return {
    ...current,
    accentColor: nextTemplate.palette.accent,
    message: shouldReplaceMessage
      ? nextTemplate.defaultMessage
      : current.message,
    templateId: nextTemplate.id,
    textColor: nextTemplate.palette.text,
  };
};

const createGallerySettings = (template: EidTemplate): EditorState => {
  const direction = getGalleryDirection(template.id);

  return {
    ...DEFAULT_SETTINGS,
    alignment: direction.alignment,
    accentColor: template.palette.accent,
    bodySize: direction.bodySize,
    message: direction.message,
    overlayStrength: direction.overlayStrength,
    sender: direction.sender,
    sizeId: direction.sizeId,
    templateId: template.id,
    textColor: template.palette.text,
    textX: direction.textX,
    textY: direction.textY,
    titleSize: direction.titleSize,
  };
};

const useAssetImage = (source: string | null): HTMLImageElement | null => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!source) {
      setImage(null);
      return;
    }

    let active = true;
    const nextImage = new window.Image();
    nextImage.decoding = "async";
    nextImage.src = source;

    nextImage.onload = () => {
      if (active) {
        setImage(nextImage);
      }
    };

    nextImage.onerror = () => {
      if (active) {
        setImage(null);
      }
    };

    return () => {
      active = false;
    };
  }, [source]);

  return image;
};

const useTemplateImageWithFallback = (
  source: string
): HTMLImageElement | null => {
  const image = useAssetImage(source);
  const fallbackImage = useAssetImage(DEFAULT_TEMPLATE_IMAGE_PATH);

  return image ?? fallbackImage;
};

function ControlPanel({ children, description, title }: PanelProps) {
  return (
    <section className="rounded-[30px] border border-[#dff1b7] bg-white p-5 shadow-[0_24px_60px_rgba(69,154,0,0.08)]">
      {title || description ? (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title ? (
              <h2
                className={`${displayFont.className} text-2xl text-[#2f1d19]`}
              >
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 max-w-xl text-[#6b5a46] text-sm leading-6">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      {children}
    </section>
  );
}

function RangeField({
  label,
  maximum,
  minimum,
  onChange,
  step = 1,
  value,
  valueLabel,
}: RangeFieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-center justify-between gap-4 font-medium text-[#5e4b3a] text-sm">
        <span>{label}</span>
        <span className="rounded-full bg-[#fff8cf] px-3 py-1 text-[#5e4b3a] text-xs">
          {valueLabel ?? value}
        </span>
      </span>
      <input
        className="range-accent h-2 w-full cursor-pointer appearance-none rounded-full bg-[#e7f5c8]"
        max={maximum}
        min={minimum}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </label>
  );
}

function SwatchButton({ active, color, label, onClick }: SwatchButtonProps) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
        active
          ? "scale-105 border-[#459a00] shadow-[0_10px_22px_rgba(69,154,0,0.22)]"
          : "border-[#edf7d4] shadow-[0_6px_14px_rgba(69,154,0,0.08)]"
      }`}
      onClick={onClick}
      style={{ backgroundColor: color }}
      type="button"
    >
      <span className="sr-only">{label}</span>
      {active ? (
        <span className="h-3 w-3 rounded-full border border-black/20 bg-white/80" />
      ) : null}
    </button>
  );
}

function GreetingCanvas({
  backgroundImage,
  canvasRef,
  className,
  interactive = false,
  onBoundsChange,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  settings,
  templateImage,
  template,
}: GreetingCanvasProps) {
  const size = CARD_SIZES[settings.sizeId];

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const draw = (): void => {
      const bounds = renderGreetingCard({
        backgroundImage,
        canvas,
        fonts: {
          body: bodyFont.style.fontFamily,
          display: displayFont.style.fontFamily,
        },
        settings,
        templateImage,
        template,
      });

      onBoundsChange?.(bounds);
    };

    draw();

    if (typeof document === "undefined" || !("fonts" in document)) {
      return;
    }

    let cancelled = false;

    document.fonts.ready.then(() => {
      if (!cancelled) {
        draw();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    backgroundImage,
    canvasRef,
    onBoundsChange,
    settings,
    template,
    templateImage,
  ]);

  return (
    <canvas
      aria-label="Preview kartu ucapan"
      className={`${className ?? ""} w-full rounded-[30px] ${
        interactive ? "cursor-grab touch-none active:cursor-grabbing" : ""
      }`}
      onPointerCancel={onPointerCancel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      ref={canvasRef}
      style={{ aspectRatio: `${size.width} / ${size.height}` }}
    />
  );
}

function GalleryCard({ index, onUseTemplate, template }: GalleryCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settings = createGallerySettings(template);
  const editorImage = useTemplateImageWithFallback(template.editorImagePath);
  const galleryImage = useAssetImage(template.galleryImagePath);
  const previewTemplateImage = galleryImage ?? editorImage;
  const rotationClass =
    GALLERY_MOCKUP_ROTATIONS[index % GALLERY_MOCKUP_ROTATIONS.length] ??
    GALLERY_MOCKUP_ROTATIONS[0];
  const mockupWidthClass = GALLERY_MOCKUP_WIDTHS[settings.sizeId];

  return (
    <article
      className="relative overflow-hidden rounded-[32px] border border-[#dff1b7] bg-white p-5"
      style={getGalleryCardStyle(template)}
    >
      <div
        className="pointer-events-none absolute inset-x-5 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${hexToRgba(
            template.palette.border,
            0.72
          )}, transparent)`,
        }}
      />

      <div
        className="relative overflow-hidden rounded-[30px] border border-[#dceab3] p-5"
        style={getGalleryStageStyle(template)}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(140deg, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0) 38%)",
          }}
        />
        <div className="relative flex items-center justify-between gap-3">
          <span
            className="rounded-full border px-3 py-1 font-semibold text-[11px] uppercase tracking-[0.22em]"
            style={getGalleryBadgeStyle(template)}
          >
            {template.badge}
          </span>
          <span
            className="font-semibold text-[11px] uppercase tracking-[0.24em]"
            style={getGalleryMetaToneStyle(template)}
          >
            Curated Layout
          </span>
        </div>

        <div
          className={`relative mx-auto mt-7 mb-9 transform-gpu ${mockupWidthClass} ${rotationClass}`}
        >
          <div
            className="absolute inset-x-[12%] -bottom-7 h-12 rounded-full blur-2xl"
            style={getGalleryAccentGlowStyle(template)}
          />
          <div
            className="absolute inset-0 translate-x-4 translate-y-5 rounded-[32px]"
            style={{
              background: `linear-gradient(180deg, ${hexToRgba(
                template.palette.text,
                0.16
              )} 0%, ${hexToRgba(template.palette.text, 0.04)} 100%)`,
            }}
          />
          <div
            className="relative overflow-hidden rounded-[34px] border p-3 backdrop-blur-[2px]"
            style={getGalleryFrameStyle(template)}
          >
            <GreetingCanvas
              backgroundImage={null}
              canvasRef={canvasRef}
              className="border border-white/60 bg-white shadow-[0_18px_36px_rgba(15,23,42,0.16)]"
              settings={settings}
              template={template}
              templateImage={previewTemplateImage}
            />
          </div>
        </div>

        <div className="relative flex items-end justify-between gap-4">
          <div>
            <p
              className="font-semibold text-[11px] uppercase tracking-[0.26em]"
              style={getGalleryMetaToneStyle(template)}
            >
              Signature Composition
            </p>
            <p className="mt-2 max-w-[15rem] text-[#6b5a46] text-sm leading-6">
              Siap dipakai langsung atau dibuka ke Studio untuk penyesuaian
              detail.
            </p>
          </div>
          <span className="rounded-full bg-[#fff8cf] px-3 py-1 font-medium text-[#5e4b3a] text-xs">
            {CARD_SIZES[settings.sizeId].label}
          </span>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <div>
          <p className="font-semibold text-[#7a6a57] text-xs uppercase tracking-[0.3em]">
            {template.badge}
          </p>
          <h3
            className={`${displayFont.className} mt-2 text-2xl text-[#2f1d19]`}
          >
            {template.name}
          </h3>
        </div>
        <p className="text-[#6b5a46] text-sm leading-6">
          {template.description}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-full bg-[#459a00] px-4 py-2 font-semibold text-sm text-white transition hover:bg-[#3d8700]"
            onClick={() => {
              const canvas = canvasRef.current;

              if (!canvas) {
                return;
              }

              downloadCanvas(canvas, template, settings.sender);
            }}
            type="button"
          >
            Download
          </button>
          <button
            className="rounded-full border border-[#bfd684] bg-white px-4 py-2 font-semibold text-[#5e4b3a] text-sm transition hover:border-[#59cd00]"
            onClick={() => onUseTemplate(template.id)}
            type="button"
          >
            Pakai template
          </button>
        </div>
      </div>
    </article>
  );
}

export function EidGreetingApp() {
  const [activeTab, setActiveTab] = useState<StudioTab>("simple");
  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [settings, setSettings] = useState<EditorState>({
    ...DEFAULT_SETTINGS,
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const fileInputId = useId();
  const objectUrlRef = useRef<string | null>(null);
  const textBoundsRef = useRef<CardTextBounds>(EMPTY_BOUNDS);
  const selectedTemplate = getTemplateById(settings.templateId);
  const selectedTemplateImage = useTemplateImageWithFallback(
    selectedTemplate.editorImagePath
  );

  useEffect(() => {
    const message = statusMessage;

    if (!message) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setStatusMessage(null);
    }, 3200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [statusMessage]);

  useEffect(() => {
    const source = settings.backgroundSource;

    if (!source) {
      setBackgroundImage(null);
      return;
    }

    let active = true;
    const image = new window.Image();
    image.decoding = "async";
    image.src = source;

    image.onload = () => {
      if (active) {
        setBackgroundImage(image);
      }
    };

    image.onerror = () => {
      if (active) {
        setBackgroundImage(null);
        setStatusMessage("Background tidak bisa dimuat. Coba file lain.");
      }
    };

    return () => {
      active = false;
    };
  }, [settings.backgroundSource]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const updateSettings = (patch: Partial<EditorState>): void => {
    setSettings((current) => ({
      ...current,
      ...patch,
    }));
  };

  const selectTemplate = (templateId: string): void => {
    const template = getTemplateById(templateId);

    setSettings((current) => applyTemplateSettings(current, template));
  };

  const syncRender = (): HTMLCanvasElement | null => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    textBoundsRef.current = renderGreetingCard({
      backgroundImage,
      canvas,
      fonts: {
        body: bodyFont.style.fontFamily,
        display: displayFont.style.fontFamily,
      },
      settings,
      templateImage: selectedTemplateImage,
      template: selectedTemplate,
    });

    return canvas;
  };

  const clearUploadedBackground = (): void => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setBackgroundImage(null);
    updateSettings({ backgroundSource: null });
  };

  const resetStudio = (): void => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setBackgroundImage(null);
    setSettings({ ...DEFAULT_SETTINGS });
    setStatusMessage("Preset dikembalikan ke setelan awal.");
  };

  const handleBackgroundUpload = (
    event: ChangeEvent<HTMLInputElement>
  ): void => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const nextUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextUrl;

    updateSettings({ backgroundSource: nextUrl });
    setActiveTab("studio");
    setStatusMessage(
      "Background baru dipasang. Atur overlay bila teks kurang kontras."
    );
    event.target.value = "";
  };

  const handleDownload = (): void => {
    const canvas = syncRender();

    if (!canvas) {
      return;
    }

    downloadCanvas(canvas, selectedTemplate, settings.sender);
    setStatusMessage("PNG berhasil dibuat dan diunduh.");
  };

  const handleCopyText = async (): Promise<void> => {
    if (!navigator.clipboard) {
      setStatusMessage("Clipboard tidak tersedia di browser ini.");
      return;
    }

    try {
      await navigator.clipboard.writeText(
        buildGreetingCopy(selectedTemplate, settings)
      );
      setStatusMessage("Teks ucapan disalin ke clipboard.");
    } catch {
      setStatusMessage("Teks ucapan tidak bisa disalin.");
    }
  };

  const handleShare = async (): Promise<void> => {
    if (!navigator.share) {
      handleDownload();
      setStatusMessage(
        "Share native tidak tersedia. File diunduh sebagai gantinya."
      );
      return;
    }

    const canvas = syncRender();

    if (!canvas) {
      return;
    }

    try {
      const blob = await canvasToBlob(canvas);
      const file = new File(
        [blob],
        buildFilename(selectedTemplate, settings.sender),
        {
          type: "image/png",
        }
      );

      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        handleDownload();
        setStatusMessage(
          "Perangkat ini belum mendukung share file. PNG diunduh."
        );
        return;
      }

      await navigator.share({
        files: [file],
        text: buildGreetingCopy(selectedTemplate, settings),
        title: selectedTemplate.headline,
      });
      setStatusMessage("Preview siap dibagikan.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      setStatusMessage("File tidak bisa dibagikan. Coba unduh manual.");
    }
  };

  const handleCanvasPointerDown = (
    event: PointerEvent<HTMLCanvasElement>
  ): void => {
    if (activeTab !== "studio") {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const point = getCanvasPoint(canvas, event);
    const bounds = textBoundsRef.current;

    if (!isPointInsideBounds(point, bounds)) {
      return;
    }

    canvas.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      originTextX: settings.textX,
      originTextY: settings.textY,
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
    };
    setIsDraggingText(true);
  };

  const handleCanvasPointerMove = (
    event: PointerEvent<HTMLCanvasElement>
  ): void => {
    const canvas = canvasRef.current;
    const dragState = dragStateRef.current;

    if (!(canvas && dragState) || dragState.pointerId !== event.pointerId) {
      return;
    }

    const point = getCanvasPoint(canvas, event);
    const deltaX = ((point.x - dragState.startX) / canvas.width) * 100;
    const deltaY = ((point.y - dragState.startY) / canvas.height) * 100;

    setSettings((current) => ({
      ...current,
      textX: clamp(dragState.originTextX + deltaX, 18, 82),
      textY: clamp(dragState.originTextY + deltaY, 20, 82),
    }));
  };

  const handleCanvasPointerEnd = (
    event: PointerEvent<HTMLCanvasElement>
  ): void => {
    const canvas = canvasRef.current;
    const dragState = dragStateRef.current;

    if (!(canvas && dragState) || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    dragStateRef.current = null;
    setIsDraggingText(false);
  };

  const jumpFromGallery = (templateId: string): void => {
    selectTemplate(templateId);
    setActiveTab("studio");
    window.scrollTo({
      behavior: "smooth",
      top: 0,
    });
  };

  return (
    <div className="relative isolate min-h-screen bg-white px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[32px] border border-[#dff1b7] bg-white px-5 py-5 shadow-[0_24px_60px_rgba(69,154,0,0.08)] sm:px-7">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-[96px_minmax(0,1fr)_96px] sm:items-center md:grid-cols-[112px_minmax(0,1fr)_112px]">
            <div className="order-1 flex justify-end sm:order-none sm:col-start-1 sm:row-start-1 sm:justify-start">
              <div className="relative flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24 md:h-28 md:w-28">
                <Image
                  alt="Logo Yayasan AN-NAHL"
                  className="object-contain"
                  fill
                  priority
                  sizes="(min-width: 768px) 112px, (min-width: 640px) 96px, 80px"
                  src="/image/logo/logo-yayasan.png"
                />
              </div>
            </div>
            <div className="order-3 col-span-2 text-center sm:order-none sm:col-span-1 sm:col-start-2 sm:row-start-1">
              <p className="relative left-1/2 w-max -translate-x-1/2 whitespace-nowrap font-semibold text-[#4d9300] text-[0.72rem] uppercase tracking-[0.16em] sm:text-sm sm:tracking-[0.18em] lg:text-base lg:tracking-[0.22em] xl:text-lg xl:tracking-[0.3em]">
                Yayasan Pendidikan Yatim & Dhu&apos;afa An-Nahl
              </p>
              <p className="relative left-1/2 mt-1 w-max -translate-x-1/2 whitespace-nowrap font-semibold text-[#4d9300] text-[0.72rem] uppercase tracking-[0.16em] sm:text-sm sm:tracking-[0.18em] lg:text-base lg:tracking-[0.22em] xl:text-lg xl:tracking-[0.3em]">
                Pondok Pesantren Tahfizh Al-Uswah
              </p>
              <h1
                className={`${displayFont.className} mt-3 whitespace-nowrap text-[#2f1d19] text-[2rem] leading-none sm:text-3xl`}
              >
                Kartu Ucapan Idul Fitri
              </h1>
              <p className="mx-auto mt-3 max-w-3xl whitespace-nowrap text-[#6b5a46] text-[0.72rem] leading-5 sm:text-base sm:leading-6">
                Isi nama, pilih template, lalu unduh kartu ucapan Idul Fitri.
              </p>
            </div>
            <div className="order-2 flex justify-start sm:order-none sm:col-start-3 sm:row-start-1 sm:justify-end">
              <div className="relative flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24 md:h-28 md:w-28">
                <Image
                  alt="Logo Pondok Pesantren Tahfizh Al-Uswah"
                  className="scale-[1.25] object-contain"
                  fill
                  priority
                  sizes="(min-width: 768px) 112px, (min-width: 640px) 96px, 80px"
                  src="/image/logo/logo-aluswah.png"
                />
              </div>
            </div>
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <div className="flex flex-col gap-5">
            {activeTab === "simple" ? (
              <ControlPanel>
                <div className="grid gap-4">
                  <label className="flex flex-col gap-2">
                    <span className="font-medium text-[#5e4b3a] text-sm">
                      Nama Anda & Keluarga
                    </span>
                    <input
                      className="rounded-[18px] border border-[#dfe8bf] bg-white px-4 py-3 text-[#2f1d19] text-base outline-none transition focus:border-[#59cd00]"
                      onChange={(event) =>
                        updateSettings({ sender: event.target.value })
                      }
                      placeholder="Abdullah & Keluarga"
                      type="text"
                      value={settings.sender}
                    />
                    <span className="text-[#7a6a57] text-xs leading-5">
                      Isi nama untuk melihat hasilnya di LIVE PREVIEW, lalu
                      pilih template yang Anda inginkan,
                    </span>
                  </label>
                  <div className="grid gap-3">
                    <span className="font-medium text-[#5e4b3a] text-sm">
                      Ukuran
                    </span>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {CARD_SIZE_OPTIONS.map((size) => {
                        const isActive = size.id === settings.sizeId;

                        return (
                          <button
                            className={`rounded-[20px] border px-4 py-3 text-left transition ${
                              isActive
                                ? "border-[#459a00] bg-[#459a00] text-white"
                                : "border-[#dceab3] bg-white text-[#5e4b3a] hover:border-[#59cd00]"
                            }`}
                            key={size.id}
                            onClick={() => updateSettings({ sizeId: size.id })}
                            type="button"
                          >
                            <span className="block font-semibold text-base">
                              {size.label}
                            </span>
                            <span
                              className={`mt-1 block text-xs ${
                                isActive ? "text-white/72" : "text-[#7a6a57]"
                              }`}
                            >
                              {size.width} x {size.height}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-[#edf7d4] bg-[#fbfff3] px-4 py-4 text-[#5e4b3a] text-sm leading-6">
                    Nama akan muncul di panel ornamen tengah dari template yang
                    dipilih.
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {EID_TEMPLATES.map((template) => {
                      const isActive = template.id === settings.templateId;

                      return (
                        <button
                          className={`rounded-[26px] border p-3 text-left transition ${
                            isActive
                              ? "border-[#459a00] bg-[#f7ffe9] shadow-[0_18px_45px_rgba(69,154,0,0.12)]"
                              : "border-[#dceab3] bg-white hover:border-[#59cd00]"
                          }`}
                          key={template.id}
                          onClick={() => selectTemplate(template.id)}
                          type="button"
                        >
                          <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] border border-[#edf7d4] bg-[#fbfff3]">
                            <Image
                              alt={`Preview ${template.name}`}
                              className="object-cover object-top"
                              fill
                              sizes="(min-width: 1280px) 260px, (min-width: 640px) 50vw, 100vw"
                              src={template.editorImagePath}
                            />
                          </div>
                          <div className="mt-3 flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-[#7a6a57] text-xs uppercase tracking-[0.26em]">
                                {template.badge}
                              </p>
                              <h2
                                className={`${displayFont.className} mt-2 text-[#2f1d19] text-xl`}
                              >
                                {template.name}
                              </h2>
                            </div>
                            {isActive ? (
                              <span className="rounded-full bg-[#459a00] px-3 py-1 font-semibold text-white text-xs">
                                Aktif
                              </span>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </ControlPanel>
            ) : null}

            {activeTab === "studio" ? (
              <>
                <ControlPanel
                  description="Atur seluruh karakter kartu: template, pesan, warna, rasio, dan background sendiri."
                  title="Creative Studio"
                >
                  <div className="grid gap-5">
                    <div className="grid gap-3 md:grid-cols-2">
                      {EID_TEMPLATES.map((template) => {
                        const isActive = template.id === settings.templateId;

                        return (
                          <button
                            className={`rounded-[24px] border p-4 text-left transition ${
                              isActive
                                ? "border-[#459a00] bg-[#459a00] text-white"
                                : "border-[#dceab3] bg-white text-[#5e4b3a] hover:border-[#59cd00]"
                            }`}
                            key={template.id}
                            onClick={() => selectTemplate(template.id)}
                            type="button"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p
                                  className={`font-semibold text-xs uppercase tracking-[0.28em] ${
                                    isActive
                                      ? "text-white/70"
                                      : "text-[#7a6a57]"
                                  }`}
                                >
                                  {template.badge}
                                </p>
                                <h2
                                  className={`${displayFont.className} mt-2 text-2xl ${
                                    isActive ? "text-white" : "text-[#2f1d19]"
                                  }`}
                                >
                                  {template.name}
                                </h2>
                              </div>
                              <span
                                className="h-12 w-12 rounded-full border border-white/40"
                                style={{
                                  background: `linear-gradient(135deg, ${template.palette.backdropStart}, ${template.palette.backdropEnd})`,
                                }}
                              />
                            </div>
                            <p
                              className={`mt-3 text-sm leading-6 ${
                                isActive ? "text-white/74" : "text-[#6b5a46]"
                              }`}
                            >
                              {template.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="grid gap-3">
                        <span className="font-medium text-[#5e4b3a] text-sm">
                          Rasio output
                        </span>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {CARD_SIZE_OPTIONS.map((size) => {
                            const isActive = size.id === settings.sizeId;

                            return (
                              <button
                                className={`rounded-[20px] border px-4 py-3 text-left text-sm transition ${
                                  isActive
                                    ? "border-[#459a00] bg-[#459a00] text-white"
                                    : "border-[#dceab3] bg-white text-[#5e4b3a] hover:border-[#59cd00]"
                                }`}
                                key={size.id}
                                onClick={() =>
                                  updateSettings({ sizeId: size.id })
                                }
                                type="button"
                              >
                                <span className="block font-semibold">
                                  {size.label}
                                </span>
                                <span
                                  className={`mt-1 block text-xs ${
                                    isActive
                                      ? "text-white/72"
                                      : "text-[#7a6a57]"
                                  }`}
                                >
                                  {size.width} x {size.height}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid gap-3">
                        <span className="font-medium text-[#5e4b3a] text-sm">
                          Posisi teks
                        </span>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {ALIGNMENT_OPTIONS.map((option) => {
                            const isActive = option.id === settings.alignment;

                            return (
                              <button
                                className={`rounded-[20px] border px-4 py-3 font-semibold text-sm transition ${
                                  isActive
                                    ? "border-[#459a00] bg-[#459a00] text-white"
                                    : "border-[#dceab3] bg-white text-[#5e4b3a] hover:border-[#59cd00]"
                                }`}
                                key={option.id}
                                onClick={() =>
                                  updateSettings({ alignment: option.id })
                                }
                                type="button"
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <RangeField
                        label="Ukuran judul"
                        maximum={136}
                        minimum={68}
                        onChange={(value) =>
                          updateSettings({ titleSize: value })
                        }
                        value={settings.titleSize}
                        valueLabel={`${settings.titleSize}px`}
                      />
                      <RangeField
                        label="Ukuran isi"
                        maximum={48}
                        minimum={28}
                        onChange={(value) =>
                          updateSettings({ bodySize: value })
                        }
                        value={settings.bodySize}
                        valueLabel={`${settings.bodySize}px`}
                      />
                      <RangeField
                        label="Posisi horizontal"
                        maximum={82}
                        minimum={18}
                        onChange={(value) => updateSettings({ textX: value })}
                        value={settings.textX}
                        valueLabel={`${settings.textX}%`}
                      />
                      <RangeField
                        label="Posisi vertikal"
                        maximum={82}
                        minimum={20}
                        onChange={(value) => updateSettings({ textY: value })}
                        value={settings.textY}
                        valueLabel={`${settings.textY}%`}
                      />
                      <RangeField
                        label="Kekuatan overlay"
                        maximum={90}
                        minimum={30}
                        onChange={(value) =>
                          updateSettings({ overlayStrength: value })
                        }
                        value={settings.overlayStrength}
                        valueLabel={`${settings.overlayStrength}%`}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-3">
                        <span className="font-medium text-[#5e4b3a] text-sm">
                          Warna aksen
                        </span>
                        <div className="flex flex-wrap gap-3">
                          {ACCENT_SWATCHES.map((color) => (
                            <SwatchButton
                              active={settings.accentColor === color}
                              color={color}
                              key={color}
                              label={`Warna aksen ${color}`}
                              onClick={() =>
                                updateSettings({ accentColor: color })
                              }
                            />
                          ))}
                        </div>
                      </div>
                      <div className="grid gap-3">
                        <span className="font-medium text-[#5e4b3a] text-sm">
                          Warna teks
                        </span>
                        <div className="flex flex-wrap gap-3">
                          {TEXT_SWATCHES.map((color) => (
                            <SwatchButton
                              active={settings.textColor === color}
                              color={color}
                              key={color}
                              label={`Warna teks ${color}`}
                              onClick={() =>
                                updateSettings({ textColor: color })
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 rounded-[24px] border border-[#dceab3] border-dashed bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-[#3f2a1d] text-sm">
                            Background kustom
                          </h3>
                          <p className="mt-1 text-[#6b5a46] text-sm leading-6">
                            Unggah foto sendiri lalu atur overlay agar teks
                            tetap terbaca.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <label
                            className="cursor-pointer rounded-full bg-[#459a00] px-4 py-2 font-semibold text-sm text-white transition hover:bg-[#3d8700]"
                            htmlFor={fileInputId}
                          >
                            Unggah gambar
                          </label>
                          <input
                            accept="image/*"
                            className="sr-only"
                            id={fileInputId}
                            onChange={handleBackgroundUpload}
                            type="file"
                          />
                          {settings.backgroundSource ? (
                            <button
                              className="rounded-full border border-[#bfd684] bg-white px-4 py-2 font-semibold text-[#5e4b3a] text-sm transition hover:border-[#59cd00]"
                              onClick={clearUploadedBackground}
                              type="button"
                            >
                              Hapus background
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </ControlPanel>

                <ControlPanel
                  description="Gunakan preset ini jika ingin mulai dari kombinasi yang aman."
                  title="Preset Cepat"
                >
                  <div className="grid gap-3">
                    {MESSAGE_PRESETS.map((message) => (
                      <button
                        className={`rounded-[22px] border px-4 py-4 text-left text-sm leading-6 transition ${
                          settings.message === message
                            ? "border-[#459a00] bg-[#459a00] text-white"
                            : "border-[#dceab3] bg-white text-[#5e4b3a] hover:border-[#59cd00]"
                        }`}
                        key={message}
                        onClick={() => updateSettings({ message })}
                        type="button"
                      >
                        {message}
                      </button>
                    ))}
                  </div>
                </ControlPanel>
              </>
            ) : null}

            {activeTab === "gallery" ? (
              <ControlPanel
                description="Pilih desain yang sudah jadi, unduh langsung, atau buka ke Studio untuk diedit lebih lanjut."
                title="Template Gallery"
              >
                <div className="grid gap-4 xl:grid-cols-2">
                  {EID_TEMPLATES.map((template, index) => (
                    <GalleryCard
                      index={index}
                      key={template.id}
                      onUseTemplate={jumpFromGallery}
                      template={template}
                    />
                  ))}
                </div>
              </ControlPanel>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden rounded-[34px] border border-[#dff1b7] bg-white p-4 shadow-[0_28px_70px_rgba(69,154,0,0.1)] sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#7a6a57] text-xs uppercase tracking-[0.3em]">
                    Live Preview
                  </p>
                  <h2
                    className={`${displayFont.className} mt-2 text-3xl text-[#2f1d19]`}
                  >
                    {selectedTemplate.name}
                  </h2>
                </div>
                <span className="rounded-full bg-[#fff8cf] px-3 py-1 font-medium text-[#5e4b3a] text-xs">
                  {CARD_SIZES[settings.sizeId].label}
                </span>
              </div>

              <div className="mt-5 rounded-[30px] border border-[#dceab3] bg-white p-3 shadow-inner">
                <GreetingCanvas
                  backgroundImage={backgroundImage}
                  canvasRef={canvasRef}
                  className="border border-[#eef8d8] bg-white shadow-[0_18px_45px_rgba(69,154,0,0.12)]"
                  interactive={activeTab === "studio"}
                  onBoundsChange={(bounds) => {
                    textBoundsRef.current = bounds;
                  }}
                  onPointerCancel={handleCanvasPointerEnd}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerEnd}
                  settings={settings}
                  template={selectedTemplate}
                  templateImage={selectedTemplateImage}
                />
              </div>

              <div className="mt-4 grid gap-3 text-[#6b5a46] text-sm leading-6">
                <div className="rounded-[24px] border border-[#edf7d4] bg-white px-4 py-3">
                  <p>
                    Cukup isi nama Anda. Preview akan menempatkan nama itu ke
                    panel ornamen tengah dan siap diunduh.
                  </p>
                </div>
                {isDraggingText ? (
                  <div className="rounded-[24px] border border-[#459a00] bg-[#459a00] px-4 py-3 text-white">
                    Sedang memindahkan blok teks.
                  </div>
                ) : null}
                {statusMessage ? (
                  <div className="rounded-[24px] border border-[#efe099] bg-white px-4 py-3 text-[#5e4b3a]">
                    {statusMessage}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  className="rounded-full bg-[#459a00] px-5 py-3 font-semibold text-sm text-white transition hover:bg-[#3d8700]"
                  onClick={handleDownload}
                  type="button"
                >
                  Download
                </button>
                <button
                  className="rounded-full border border-[#bfd684] bg-white px-5 py-3 font-semibold text-[#5e4b3a] text-sm transition hover:border-[#59cd00]"
                  onClick={handleShare}
                  type="button"
                >
                  Share
                </button>
                <button
                  className="rounded-full border border-[#bfd684] bg-white px-5 py-3 font-semibold text-[#5e4b3a] text-sm transition hover:border-[#59cd00]"
                  onClick={handleCopyText}
                  type="button"
                >
                  Copy Text
                </button>
                <button
                  className="rounded-full border border-[#bfd684] bg-white px-5 py-3 font-semibold text-[#5e4b3a] text-sm transition hover:border-[#59cd00]"
                  onClick={resetStudio}
                  type="button"
                >
                  Reset
                </button>
              </div>

              <div className="mt-6 grid gap-3 rounded-[28px] border border-[#edf7d4] bg-white p-4 text-[#5e4b3a] text-sm leading-6">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-[#2f1d19]">Headline</span>
                  <span>{selectedTemplate.headline}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-[#2f1d19]">
                    Nama Anda
                  </span>
                  <span>{settings.sender || "Nama Anda"}</span>
                </div>
              </div>
            </div>
          </aside>
        </main>

        <footer className="border-[#edf7d4] border-t pt-4 text-[#7a6a57] text-sm">
          <p className="text-center">
            Copyright {new Date().getFullYear()} Yayasan Pendidikan Yatim &
            Dhu'afa An-Nahl. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
