"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  CARD_SIZES,
  DEFAULT_SETTINGS,
  DEFAULT_TEMPLATE_IMAGE_PATH,
  type EditorState,
  EID_TEMPLATES,
  type EidTemplate,
} from "@/data/eid-templates";
import { bodyFont, displayFont } from "@/lib/fonts";
import { renderGreetingCard } from "@/lib/greeting-card";

interface GreetingCanvasProps {
  readonly canvasRef: React.RefObject<HTMLCanvasElement | null>;
  readonly className?: string;
  readonly settings: EditorState;
  readonly template: EidTemplate;
  readonly templateImage: HTMLImageElement | null;
}

interface PanelProps {
  readonly children: React.ReactNode;
}

interface ShareModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onShareToFacebook: () => Promise<void>;
  readonly onShareToInstagram: () => Promise<void>;
  readonly onShareToLinkedIn: () => Promise<void>;
  readonly onShareToTwitter: () => Promise<void>;
  readonly onShareToWhatsApp: () => Promise<void>;
}

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

const createShareFileFromCanvas = (
  canvas: HTMLCanvasElement,
  template: EidTemplate,
  senderName: string
): File | null => {
  const dataUrl = canvas.toDataURL("image/png");
  const [header, body] = dataUrl.split(",");

  if (!(header && body)) {
    return null;
  }

  const mimeType = header.match(DATA_URL_MIME_PATTERN)?.[1] ?? "image/png";
  const binaryString = window.atob(body);
  const bytes = new Uint8Array(binaryString.length);

  for (const [index, character] of Array.from(binaryString).entries()) {
    bytes[index] = character.charCodeAt(0);
  }

  return new File([bytes], buildFilename(template, senderName), {
    type: mimeType,
  });
};

const copyTextToClipboard = async (value: string): Promise<boolean> => {
  if (!navigator.clipboard) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
};

type SharePlatform =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "twitter"
  | "whatsapp";
const FIXED_SIZE_ID = "portrait" satisfies EditorState["sizeId"];
const DATA_URL_MIME_PATTERN = /data:(.*?);base64/u;
const SHARE_PLATFORM_LABELS = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  twitter: "Twitter",
  whatsapp: "WhatsApp",
} as const satisfies Record<SharePlatform, string>;

type NativeShareResult = "cancelled" | "failed" | "shared" | "unsupported";

const isValidSharedTemplateId = (value: string): value is EidTemplate["id"] => {
  return EID_TEMPLATES.some((template) => template.id === value);
};

const buildShareLink = (
  settings: Pick<EditorState, "sender" | "templateId">
): string => {
  if (typeof window === "undefined") {
    return "";
  }

  const shareUrl = new URL(window.location.href);
  shareUrl.searchParams.set("template", settings.templateId);

  const senderName = settings.sender.trim();

  if (senderName) {
    shareUrl.searchParams.set("sender", senderName);
  } else {
    shareUrl.searchParams.delete("sender");
  }

  return shareUrl.toString();
};

const buildSocialShareUrl = (
  platform: Exclude<SharePlatform, "instagram">,
  shareLink: string,
  message: string
): string => {
  const encodedLink = encodeURIComponent(shareLink);
  const encodedMessage = encodeURIComponent(message);

  switch (platform) {
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedLink}`;
    case "twitter":
      return `https://twitter.com/intent/tweet?url=${encodedLink}&text=${encodedMessage}`;
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(`${message}\n\n${shareLink}`)}`;
    default:
      return shareLink;
  }
};

const openExternalShareLink = (url: string): boolean => {
  const popup = window.open(url, "_blank", "noopener,noreferrer");
  return popup !== null;
};

const shareFilesWithCaption = async (
  file: File,
  text: string
): Promise<NativeShareResult> => {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.share !== "function"
  ) {
    return "unsupported";
  }

  if (
    typeof navigator.canShare === "function" &&
    !navigator.canShare({ files: [file] })
  ) {
    return "unsupported";
  }

  try {
    await navigator.share({
      files: [file],
      text,
    });
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "cancelled";
    }

    return "failed";
  }
};

const buildGreetingCopy = (
  template: EidTemplate,
  settings: EditorState
): string => {
  const senderLine = settings.sender.trim()
    ? `${settings.sender.trim()}`
    : "Nama Anda & Keluarga";

  return [settings.message.trim() || template.defaultMessage, senderLine]
    .filter(Boolean)
    .join("\n\n");
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

function ControlPanel({ children }: PanelProps) {
  return (
    <section className="rounded-[30px] border border-[#dff1b7] bg-white p-5 shadow-[0_24px_60px_rgba(69,154,0,0.08)]">
      {children}
    </section>
  );
}

function GreetingCanvas({
  canvasRef,
  className,
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
      renderGreetingCard({
        backgroundImage: null,
        canvas,
        fonts: {
          body: bodyFont.style.fontFamily,
          display: displayFont.style.fontFamily,
        },
        settings,
        templateImage,
        template,
      });
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
  }, [canvasRef, settings, template, templateImage]);

  return (
    <canvas
      aria-label="Preview kartu ucapan"
      className={`${className ?? ""} w-full rounded-[30px]`}
      ref={canvasRef}
      style={{ aspectRatio: `${size.width} / ${size.height}` }}
    />
  );
}

function ShareFacebookIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="34"
      viewBox="0 0 34 34"
      width="34"
    >
      <circle cx="17" cy="17" fill="#5a9708" r="17" />
      <path
        d="M18.76 28v-9.16h3.08l.46-3.57h-3.54v-2.28c0-1.03.29-1.73 1.76-1.73h1.88V8.07c-.33-.04-1.44-.14-2.74-.14-2.72 0-4.58 1.66-4.58 4.71v2.63H12v3.57h3.08V28h3.68Z"
        fill="#fff"
      />
    </svg>
  );
}

function ShareTwitterIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="34"
      viewBox="0 0 34 34"
      width="34"
    >
      <path
        d="M29.18 10.33c-.88.39-1.82.65-2.8.77a4.88 4.88 0 0 0 2.14-2.7 9.81 9.81 0 0 1-3.1 1.19 4.9 4.9 0 0 0-8.34 4.46 13.9 13.9 0 0 1-10.1-5.12 4.9 4.9 0 0 0 1.52 6.54 4.86 4.86 0 0 1-2.22-.61v.06a4.9 4.9 0 0 0 3.93 4.8 4.94 4.94 0 0 1-2.2.08 4.9 4.9 0 0 0 4.57 3.4A9.84 9.84 0 0 1 6.5 25.2 13.88 13.88 0 0 0 14 27.4c9 0 13.92-7.45 13.92-13.92 0-.21 0-.42-.01-.63a9.94 9.94 0 0 0 2.27-2.52Z"
        fill="#5a9708"
      />
    </svg>
  );
}

function ShareInstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="34"
      viewBox="0 0 34 34"
      width="34"
    >
      <defs>
        <linearGradient id="instagramGradient" x1="6" x2="28" y1="28" y2="6">
          <stop offset="0" stopColor="#79b61f" />
          <stop offset="1" stopColor="#4f8309" />
        </linearGradient>
      </defs>
      <rect
        height="22"
        rx="6"
        stroke="url(#instagramGradient)"
        strokeWidth="3"
        width="22"
        x="6"
        y="6"
      />
      <circle
        cx="17"
        cy="17"
        r="5"
        stroke="url(#instagramGradient)"
        strokeWidth="3"
      />
      <circle cx="24" cy="10" fill="#5a9708" r="1.8" />
    </svg>
  );
}

function ShareWhatsAppIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="34"
      viewBox="0 0 34 34"
      width="34"
    >
      <path
        d="M17 3.6c-7.31 0-13.24 5.77-13.24 12.9 0 2.28.62 4.5 1.8 6.48L4 30.5l7.8-1.55A13.43 13.43 0 0 0 17 29.4c7.31 0 13.24-5.77 13.24-12.9S24.31 3.6 17 3.6Z"
        fill="#5a9708"
      />
      <path
        d="M13.42 11.02c.26-.57.53-.59.82-.6h.71c.24 0 .58.1.9.77.32.68 1.11 2.62 1.2 2.8.1.19.14.4.03.64-.11.24-.2.4-.39.62-.2.22-.4.47-.57.68-.2.18-.4.4-.17.76.22.37 1.02 1.58 2.2 2.56 1.5 1.24 2.76 1.64 3.16 1.8.39.16.62.13.84-.1.23-.24 1-1.12 1.27-1.5.27-.39.54-.33.92-.2.38.13 2.28 1.06 2.68 1.25.39.19.65.29.74.45.1.16.1.94-.23 1.88-.31.93-1.86 1.77-2.58 1.89-.66.11-1.47.13-2.4-.14-.55-.17-1.25-.38-2.12-.77-3.72-1.6-6.15-5.48-6.34-5.74-.19-.26-1.52-2.02-1.52-3.89s.98-2.8 1.34-3.18Z"
        fill="#fff"
      />
    </svg>
  );
}

function ShareLinkedInIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="34"
      viewBox="0 0 34 34"
      width="34"
    >
      <rect fill="#5a9708" height="34" rx="5" width="34" />
      <path
        d="M10.18 13.2H6.95v13.42h3.23V13.2ZM8.57 11.37a1.87 1.87 0 1 0 0-3.74 1.87 1.87 0 0 0 0 3.74ZM27.08 18.38c0-4.05-2.16-5.94-5.04-5.94-2.32 0-3.36 1.28-3.94 2.18V13.2h-3.22c.04.94 0 13.42 0 13.42h3.22v-7.5c0-.4.03-.8.15-1.09.32-.8 1.05-1.62 2.28-1.62 1.61 0 2.26 1.22 2.26 3.01v7.2H26v-7.57Z"
        fill="#fff"
      />
    </svg>
  );
}

function ShareCloseIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <path
        d="M18 6 6 18M6 6l12 12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function SharePlatformButton({
  children,
  label,
  onClick,
}: {
  readonly children: React.ReactNode;
  readonly label: string;
  readonly onClick: () => void | Promise<void>;
}) {
  return (
    <button
      aria-label={label}
      className="flex h-[4rem] w-[4rem] items-center justify-center rounded-[16px] border border-[#d8e8b4] bg-white shadow-[0_10px_22px_rgba(87,135,18,0.12)] transition hover:-translate-y-0.5 hover:border-[#8ab74b] hover:shadow-[0_14px_28px_rgba(87,135,18,0.18)] sm:h-[4.4rem] sm:w-[4.4rem]"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ShareModal({
  isOpen,
  onClose,
  onShareToFacebook,
  onShareToInstagram,
  onShareToLinkedIn,
  onShareToTwitter,
  onShareToWhatsApp,
}: ShareModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-labelledby="share-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
    >
      <button
        aria-label="Tutup modal share"
        className="absolute inset-0 bg-[linear-gradient(135deg,rgba(96,150,8,0.2)_0%,rgba(37,64,5,0.28)_100%)] backdrop-blur-[5px]"
        onClick={onClose}
        type="button"
      />
      <div className="relative w-full max-w-[27rem] rounded-[28px] border border-[#dceabf] bg-white px-5 py-6 shadow-[0_24px_60px_rgba(87,135,18,0.18)] sm:max-w-[32rem] sm:px-7 sm:py-7">
        <button
          aria-label="Tutup"
          className="absolute top-4 right-4 rounded-full border border-[#dceabf] p-2 text-[#5a9708] transition hover:bg-[#f7fce9]"
          onClick={onClose}
          type="button"
        >
          <ShareCloseIcon />
        </button>

        <div className="max-w-[15rem]">
          <h3
            className="font-semibold text-[#5a9708] text-[1.7rem] leading-none sm:text-[2.2rem]"
            id="share-modal-title"
          >
            Social Share
          </h3>
        </div>

        <div className="mt-7">
          <p className="font-semibold text-[#35531d] text-[1.6rem] leading-none sm:text-[1.9rem]">
            Bagikan melalui
          </p>
          <p className="mt-3 text-[#5d6f49] text-[0.98rem] leading-7 sm:text-[1.05rem]">
            Pilih platform yang ingin Anda gunakan untuk membagikan kartu.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5 sm:gap-4">
            <SharePlatformButton label="Facebook" onClick={onShareToFacebook}>
              <ShareFacebookIcon />
            </SharePlatformButton>
            <SharePlatformButton label="Twitter" onClick={onShareToTwitter}>
              <ShareTwitterIcon />
            </SharePlatformButton>
            <SharePlatformButton label="Instagram" onClick={onShareToInstagram}>
              <ShareInstagramIcon />
            </SharePlatformButton>
            <SharePlatformButton label="WhatsApp" onClick={onShareToWhatsApp}>
              <ShareWhatsAppIcon />
            </SharePlatformButton>
            <SharePlatformButton label="LinkedIn" onClick={onShareToLinkedIn}>
              <ShareLinkedInIcon />
            </SharePlatformButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EidGreetingApp() {
  const [isShareOptionsOpen, setIsShareOptionsOpen] = useState(false);
  const [settings, setSettings] = useState<EditorState>({
    ...DEFAULT_SETTINGS,
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedTemplate = getTemplateById(settings.templateId);
  const selectedTemplateImage = useTemplateImageWithFallback(
    selectedTemplate.editorImagePath
  );
  const shareText = buildGreetingCopy(selectedTemplate, settings);
  const shareLink = buildShareLink(settings);

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
    if (!isShareOptionsOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsShareOptionsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isShareOptionsOpen]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedTemplateId = urlParams.get("template");
    const sharedSender = urlParams.get("sender");

    if (!(sharedTemplateId || sharedSender)) {
      return;
    }

    setSettings((current) => {
      let nextSettings: EditorState = {
        ...current,
        sizeId: FIXED_SIZE_ID,
      };

      if (
        sharedTemplateId &&
        isValidSharedTemplateId(sharedTemplateId) &&
        current.templateId !== sharedTemplateId
      ) {
        nextSettings = applyTemplateSettings(
          nextSettings,
          getTemplateById(sharedTemplateId)
        );
      }

      if (sharedSender) {
        nextSettings = {
          ...nextSettings,
          sender: sharedSender,
        };
      }

      return nextSettings;
    });
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

    renderGreetingCard({
      backgroundImage: null,
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

  const resetSettings = (): void => {
    setSettings({
      ...DEFAULT_SETTINGS,
      sizeId: FIXED_SIZE_ID,
    });
    setStatusMessage("Pengaturan dikembalikan ke setelan awal.");
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
    const didCopyText = await copyTextToClipboard(shareText);

    if (!didCopyText) {
      setStatusMessage("Teks ucapan tidak bisa disalin.");
      return;
    }

    setStatusMessage("Teks ucapan disalin ke clipboard.");
  };

  const handleShare = (): void => {
    setIsShareOptionsOpen((current) => !current);
  };

  const handleCloseShareModal = (): void => {
    setIsShareOptionsOpen(false);
  };

  const openPlatformFallback = async (
    platform: SharePlatform
  ): Promise<void> => {
    const platformLabel = SHARE_PLATFORM_LABELS[platform];
    const didCopyText = await copyTextToClipboard(shareText);

    if (platform === "instagram") {
      const didOpenInstagram = openExternalShareLink(
        "https://www.instagram.com/"
      );

      if (didOpenInstagram && didCopyText) {
        setStatusMessage(
          "Browser belum bisa melampirkan gambar langsung ke Instagram. Instagram dibuka dan ucapan disalin ke clipboard."
        );
        return;
      }

      if (didOpenInstagram) {
        setStatusMessage(
          "Browser belum bisa melampirkan gambar langsung ke Instagram."
        );
        return;
      }

      setStatusMessage(
        "Browser belum mendukung lampiran gambar langsung ke Instagram. Gunakan Download lalu kirim manual."
      );
      return;
    }

    if (!shareLink) {
      setStatusMessage(
        `Browser belum mendukung lampiran gambar langsung ke ${platformLabel}.`
      );
      return;
    }

    const shareUrl = buildSocialShareUrl(platform, shareLink, shareText);
    const didOpenShare = openExternalShareLink(shareUrl);

    if (didOpenShare && didCopyText) {
      setStatusMessage(
        `${platformLabel} dibuka. Browser belum bisa melampirkan gambar langsung, tetapi ucapan sudah disalin ke clipboard.`
      );
      return;
    }

    if (didOpenShare) {
      setStatusMessage(
        `${platformLabel} dibuka tanpa lampiran gambar langsung dari browser.`
      );
      return;
    }

    setStatusMessage(
      `Browser belum mendukung lampiran gambar langsung ke ${platformLabel}. Gunakan Download lalu kirim manual.`
    );
  };

  const shareCardToPlatform = async (
    platform: SharePlatform
  ): Promise<void> => {
    handleCloseShareModal();

    const canvas = syncRender();

    if (!canvas) {
      setStatusMessage("Kartu belum siap dibagikan.");
      return;
    }

    const shareFile = createShareFileFromCanvas(
      canvas,
      selectedTemplate,
      settings.sender
    );

    if (!shareFile) {
      setStatusMessage("Gambar kartu tidak bisa disiapkan.");
      return;
    }

    const nativeShareResult = await shareFilesWithCaption(shareFile, shareText);

    if (nativeShareResult === "shared") {
      setStatusMessage("Gambar dan ucapan berhasil dibagikan.");
      return;
    }

    if (nativeShareResult === "cancelled") {
      return;
    }

    await openPlatformFallback(platform);
  };

  const handleShareToFacebook = async (): Promise<void> => {
    await shareCardToPlatform("facebook");
  };

  const handleShareToTwitter = async (): Promise<void> => {
    await shareCardToPlatform("twitter");
  };

  const handleShareToWhatsApp = async (): Promise<void> => {
    await shareCardToPlatform("whatsapp");
  };

  const handleShareToInstagram = async (): Promise<void> => {
    await shareCardToPlatform("instagram");
  };

  const handleShareToLinkedIn = async (): Promise<void> => {
    await shareCardToPlatform("linkedin");
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
                    Isi nama untuk melihat hasilnya di live preview, lalu pilih
                    template yang Anda inginkan.
                  </span>
                </label>

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
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden rounded-[34px] border border-[#dff1b7] bg-white p-4 shadow-[0_28px_70px_rgba(69,154,0,0.1)] sm:p-5">
              <div>
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
              </div>

              <div className="mt-5 rounded-[30px] border border-[#dceab3] bg-white p-3 shadow-inner">
                <GreetingCanvas
                  canvasRef={canvasRef}
                  className="border border-[#eef8d8] bg-white shadow-[0_18px_45px_rgba(69,154,0,0.12)]"
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
                  onClick={resetSettings}
                  type="button"
                >
                  Reset
                </button>
              </div>

              <div className="mt-6 grid gap-6 rounded-[28px] border border-[#edf7d4] bg-white p-4 text-[#5e4b3a] text-sm leading-6">
                <div className="grid gap-1">
                  <span className="font-semibold text-[#2f1d19]">Ucapan</span>
                  <span className="font-semibold text-[#2f1d19]">
                    {settings.message.trim() || selectedTemplate.defaultMessage}
                  </span>
                </div>
                <div className="grid gap-1">
                  <span className="font-semibold text-[#2f1d19]">
                    Nama Anda & Keluarga
                  </span>
                  <span>{settings.sender || "Nama Anda & Keluarga"}</span>
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
      <ShareModal
        isOpen={isShareOptionsOpen}
        onClose={() => {
          setIsShareOptionsOpen(false);
        }}
        onShareToFacebook={handleShareToFacebook}
        onShareToInstagram={handleShareToInstagram}
        onShareToLinkedIn={handleShareToLinkedIn}
        onShareToTwitter={handleShareToTwitter}
        onShareToWhatsApp={handleShareToWhatsApp}
      />
    </div>
  );
}
