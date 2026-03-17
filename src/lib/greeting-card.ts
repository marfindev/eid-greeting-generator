import {
  CARD_SIZES,
  type EditorState,
  type EidTemplate,
  type TextAlignment,
} from "@/data/eid-templates";

export interface RenderFonts {
  readonly body: string;
  readonly display: string;
}

export interface CardTextBounds {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

interface RenderGreetingCardOptions {
  readonly backgroundImage: HTMLImageElement | null;
  readonly canvas: HTMLCanvasElement;
  readonly fonts: RenderFonts;
  readonly settings: EditorState;
  readonly template: EidTemplate;
  readonly templateImage: HTMLImageElement | null;
}

const HORIZONTAL_PADDING = 84;
const PANEL_PADDING = 34;
const WORD_SEPARATOR = /\s+/u;
const FULL_CIRCLE = Math.PI * 2;

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

const drawRoundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void => {
  const boundedRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + boundedRadius, y);
  context.lineTo(x + width - boundedRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + boundedRadius);
  context.lineTo(x + width, y + height - boundedRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - boundedRadius,
    y + height
  );
  context.lineTo(x + boundedRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - boundedRadius);
  context.lineTo(x, y + boundedRadius);
  context.quadraticCurveTo(x, y, x + boundedRadius, y);
  context.closePath();
};

const drawImageCover = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number
): void => {
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const renderWidth = imageWidth * scale;
  const renderHeight = imageHeight * scale;
  const renderX = (width - renderWidth) / 2;
  const renderY = (height - renderHeight) / 2;

  context.save();
  context.filter = "saturate(0.92) contrast(1.04)";
  context.drawImage(image, renderX, renderY, renderWidth, renderHeight);
  context.restore();
};

const drawDiamond = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
): void => {
  context.beginPath();
  context.moveTo(x, y - height / 2);
  context.lineTo(x + width / 2, y);
  context.lineTo(x, y + height / 2);
  context.lineTo(x - width / 2, y);
  context.closePath();
};

const drawStar = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerRadius: number,
  innerRadius: number,
  points: number,
  rotation = -Math.PI / 2
): void => {
  context.beginPath();

  for (let index = 0; index < points * 2; index += 1) {
    const angle = rotation + (index * Math.PI) / points;
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const pointX = x + Math.cos(angle) * radius;
    const pointY = y + Math.sin(angle) * radius;

    if (index === 0) {
      context.moveTo(pointX, pointY);
      continue;
    }

    context.lineTo(pointX, pointY);
  }

  context.closePath();
};

const drawTwinkle = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  alpha: number
): void => {
  context.save();
  context.strokeStyle = hexToRgba(color, alpha);
  context.lineCap = "round";
  context.lineWidth = Math.max(1.25, size / 5.5);

  context.beginPath();
  context.moveTo(x - size, y);
  context.lineTo(x + size, y);
  context.moveTo(x, y - size);
  context.lineTo(x, y + size);
  context.stroke();

  context.beginPath();
  context.moveTo(x - size * 0.58, y - size * 0.58);
  context.lineTo(x + size * 0.58, y + size * 0.58);
  context.moveTo(x + size * 0.58, y - size * 0.58);
  context.lineTo(x - size * 0.58, y + size * 0.58);
  context.lineWidth = Math.max(1, size / 8);
  context.strokeStyle = hexToRgba(color, alpha * 0.52);
  context.stroke();

  context.restore();
};

const drawPatternField = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  accentColor: string,
  borderColor: string
): void => {
  const columns = 4;
  const rows = height > 1400 ? 6 : 4;
  const cellWidth = width / columns;
  const cellHeight = height / (rows + 1);

  context.save();

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = cellWidth * (column + 0.5);
      const y = cellHeight * (row + 0.75);
      const outerRadius = Math.min(cellWidth, cellHeight) * 0.18;
      const innerRadius = outerRadius * 0.44;
      const shouldDrawStar = (row + column) % 2 === 0;

      if (shouldDrawStar) {
        drawStar(context, x, y, outerRadius, innerRadius, 8);
        context.fillStyle = hexToRgba(accentColor, 0.05);
        context.fill();
        context.strokeStyle = hexToRgba(borderColor, 0.1);
        context.lineWidth = 1.25;
        context.stroke();
        continue;
      }

      drawDiamond(context, x, y, outerRadius * 1.3, outerRadius * 1.3);
      context.fillStyle = hexToRgba(borderColor, 0.045);
      context.fill();
      context.strokeStyle = hexToRgba(accentColor, 0.08);
      context.lineWidth = 1;
      context.stroke();
    }
  }

  context.restore();
};

const drawSkyline = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  baseColor: string,
  accentColor: string
): void => {
  const baseY = height * 0.82;
  const structures = [
    {
      height: height * 0.16,
      width: width * 0.18,
      x: width * 0.08,
    },
    {
      height: height * 0.24,
      width: width * 0.26,
      x: width * 0.36,
    },
    {
      height: height * 0.14,
      width: width * 0.18,
      x: width * 0.74,
    },
  ] as const;

  context.save();
  context.fillStyle = hexToRgba(baseColor, 0.14);

  for (const structure of structures) {
    const domeRadius = structure.width * 0.46;
    const towerHeight = structure.height - domeRadius;

    context.fillRect(
      structure.x,
      baseY - towerHeight,
      structure.width,
      towerHeight
    );
    context.beginPath();
    context.arc(
      structure.x + structure.width / 2,
      baseY - towerHeight,
      domeRadius,
      Math.PI,
      0
    );
    context.fill();
  }

  const minaretWidth = width * 0.035;
  const minaretHeight = height * 0.22;
  const minarets = [width * 0.03, width * 0.29, width * 0.67, width * 0.92];

  for (const minaretX of minarets) {
    context.fillRect(
      minaretX,
      baseY - minaretHeight,
      minaretWidth,
      minaretHeight
    );
    context.beginPath();
    context.arc(
      minaretX + minaretWidth / 2,
      baseY - minaretHeight,
      minaretWidth * 0.56,
      Math.PI,
      0
    );
    context.fill();
  }

  const floorGradient = context.createLinearGradient(0, baseY, 0, height);
  floorGradient.addColorStop(0, hexToRgba(baseColor, 0));
  floorGradient.addColorStop(1, hexToRgba(accentColor, 0.14));
  context.fillStyle = floorGradient;
  context.fillRect(
    0,
    baseY - height * 0.05,
    width,
    height - baseY + height * 0.05
  );

  context.restore();
};

const drawCornerOrnaments = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string
): void => {
  const corners = [
    {
      flipX: 1,
      flipY: 1,
      x: 76,
      y: 76,
    },
    {
      flipX: -1,
      flipY: 1,
      x: width - 76,
      y: 76,
    },
    {
      flipX: 1,
      flipY: -1,
      x: 76,
      y: height - 76,
    },
    {
      flipX: -1,
      flipY: -1,
      x: width - 76,
      y: height - 76,
    },
  ] as const;

  context.save();
  context.strokeStyle = hexToRgba(color, 0.2);
  context.lineWidth = 2;
  context.lineCap = "round";

  for (const corner of corners) {
    context.save();
    context.translate(corner.x, corner.y);
    context.scale(corner.flipX, corner.flipY);

    context.beginPath();
    context.moveTo(0, 24);
    context.quadraticCurveTo(0, 0, 24, 0);
    context.stroke();

    context.beginPath();
    context.moveTo(18, 0);
    context.quadraticCurveTo(42, 0, 42, 24);
    context.stroke();

    context.beginPath();
    context.arc(24, 24, 6, 0, FULL_CIRCLE);
    context.fillStyle = hexToRgba(color, 0.15);
    context.fill();

    context.restore();
  }

  context.restore();
};

const drawAmbientLayers = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  accentColor: string,
  glowColor: string,
  borderColor: string
): void => {
  const diagonalGlow = context.createLinearGradient(0, 0, width, height);
  diagonalGlow.addColorStop(0, hexToRgba(glowColor, 0.18));
  diagonalGlow.addColorStop(0.45, hexToRgba(accentColor, 0.08));
  diagonalGlow.addColorStop(1, hexToRgba(borderColor, 0));
  context.fillStyle = diagonalGlow;
  context.fillRect(0, 0, width, height);

  const leftAura = context.createRadialGradient(
    width * 0.14,
    height * 0.18,
    width * 0.03,
    width * 0.14,
    height * 0.18,
    width * 0.48
  );
  leftAura.addColorStop(0, hexToRgba(glowColor, 0.28));
  leftAura.addColorStop(1, hexToRgba(glowColor, 0));
  context.fillStyle = leftAura;
  context.fillRect(0, 0, width, height);

  const bottomAura = context.createRadialGradient(
    width * 0.5,
    height * 0.94,
    width * 0.08,
    width * 0.5,
    height * 0.94,
    width * 0.48
  );
  bottomAura.addColorStop(0, hexToRgba(accentColor, 0.16));
  bottomAura.addColorStop(1, hexToRgba(accentColor, 0));
  context.fillStyle = bottomAura;
  context.fillRect(0, 0, width, height);
};

const drawSparkles = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string
): void => {
  for (let index = 0; index < 22; index += 1) {
    const x = (((index + 2) * 89) % 1000) / 1000;
    const y = (((index + 5) * 137) % 1000) / 1000;
    let radius = 2.5;

    if (index % 4 === 0) {
      radius = 5.5;
    } else if (index % 2 === 0) {
      radius = 3.5;
    }

    const sparkleX = width * (0.1 + x * 0.8);
    const sparkleY = height * (0.06 + y * 0.82);

    context.beginPath();
    context.fillStyle = hexToRgba(color, index % 4 === 0 ? 0.22 : 0.14);
    context.arc(sparkleX, sparkleY, radius, 0, FULL_CIRCLE);
    context.fill();

    if (index % 5 === 0) {
      drawTwinkle(context, sparkleX, sparkleY, radius * 1.8, color, 0.22);
    }
  }
};

const drawArchDecoration = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  accentColor: string,
  glowColor: string
): void => {
  const archWidth = width * 0.38;
  const archHeight = height * 0.48;
  const archX = width - archWidth - 78;
  const archY = 74;

  context.save();
  context.strokeStyle = hexToRgba(accentColor, 0.48);
  context.fillStyle = hexToRgba(glowColor, 0.12);
  context.lineWidth = 8;
  drawRoundedRect(
    context,
    archX,
    archY + archHeight * 0.2,
    archWidth,
    archHeight,
    34
  );
  context.stroke();
  context.fill();

  drawRoundedRect(
    context,
    archX + archWidth * 0.1,
    archY + archHeight * 0.34,
    archWidth * 0.8,
    archHeight * 0.58,
    28
  );
  context.strokeStyle = hexToRgba(glowColor, 0.28);
  context.lineWidth = 2;
  context.stroke();

  context.beginPath();
  context.moveTo(archX + archWidth * 0.1, archY + archHeight * 0.25);
  context.quadraticCurveTo(
    archX + archWidth * 0.5,
    archY - archHeight * 0.1,
    archX + archWidth * 0.9,
    archY + archHeight * 0.25
  );
  context.stroke();

  for (let column = 0; column < 5; column += 1) {
    const x = archX + 22 + column * (archWidth / 5.2);
    context.beginPath();
    context.moveTo(x, archY + archHeight * 0.23);
    context.lineTo(x, archY + archHeight * 0.95);
    context.strokeStyle = hexToRgba(
      accentColor,
      column % 2 === 0 ? 0.35 : 0.18
    );
    context.lineWidth = 2;
    context.stroke();
  }

  context.beginPath();
  context.ellipse(
    archX + archWidth * 0.5,
    archY + archHeight * 0.92,
    archWidth * 0.34,
    archHeight * 0.06,
    0,
    0,
    FULL_CIRCLE
  );
  context.fillStyle = hexToRgba(glowColor, 0.14);
  context.fill();

  for (let step = 0; step < 4; step += 1) {
    const stepY = archY + archHeight * (0.82 + step * 0.04);
    context.beginPath();
    context.moveTo(archX + archWidth * 0.18, stepY);
    context.lineTo(archX + archWidth * 0.82, stepY);
    context.strokeStyle = hexToRgba(accentColor, 0.18 - step * 0.02);
    context.lineWidth = 1.5;
    context.stroke();
  }

  context.restore();
};

const drawCrescentDecoration = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  accentColor: string,
  glowColor: string
): void => {
  const moonX = width * 0.82;
  const moonY = height * 0.2;
  const moonRadius = Math.min(width, height) * 0.11;

  context.save();
  context.beginPath();
  context.fillStyle = hexToRgba(accentColor, 0.9);
  context.arc(moonX, moonY, moonRadius, 0, FULL_CIRCLE);
  context.fill();

  context.beginPath();
  context.fillStyle = hexToRgba(glowColor, 0.95);
  context.arc(
    moonX + moonRadius * 0.34,
    moonY - moonRadius * 0.12,
    moonRadius * 0.82,
    0,
    FULL_CIRCLE
  );
  context.fill();

  context.beginPath();
  context.strokeStyle = hexToRgba(glowColor, 0.4);
  context.lineWidth = 3;
  context.arc(moonX, moonY, moonRadius * 1.24, Math.PI * 0.9, Math.PI * 1.85);
  context.stroke();

  for (let starIndex = 0; starIndex < 7; starIndex += 1) {
    const x = width * (0.63 + starIndex * 0.045);
    const y = height * (0.12 + (starIndex % 3) * 0.05);
    const size = starIndex % 2 === 0 ? 8 : 5;

    context.beginPath();
    context.fillStyle = hexToRgba(accentColor, 0.4);
    context.arc(x, y, size, 0, FULL_CIRCLE);
    context.fill();

    if (starIndex % 2 === 0) {
      drawTwinkle(context, x, y, size * 1.4, glowColor, 0.18);
    }
  }

  context.beginPath();
  context.moveTo(width * 0.58, height * 0.29);
  context.quadraticCurveTo(
    width * 0.72,
    height * 0.24,
    width * 0.9,
    height * 0.32
  );
  context.strokeStyle = hexToRgba(accentColor, 0.18);
  context.lineWidth = 2;
  context.stroke();

  context.restore();
};

const drawLanternDecoration = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  accentColor: string,
  glowColor: string
): void => {
  const anchors = [0.16, 0.5, 0.84];

  context.save();
  context.lineCap = "round";

  context.beginPath();
  context.moveTo(width * 0.08, height * 0.08);
  context.quadraticCurveTo(
    width * 0.5,
    height * 0.18,
    width * 0.92,
    height * 0.08
  );
  context.strokeStyle = hexToRgba(accentColor, 0.22);
  context.lineWidth = 3;
  context.stroke();

  for (const anchor of anchors) {
    const x = width * anchor;
    const top = height * 0.06;
    const drop = height * (anchor === 0.5 ? 0.22 : 0.17);
    const lanternWidth = width * 0.08;
    const lanternHeight = height * 0.1;

    context.beginPath();
    context.strokeStyle = hexToRgba(accentColor, 0.38);
    context.lineWidth = 4;
    context.moveTo(x, top);
    context.lineTo(x, drop);
    context.stroke();

    drawRoundedRect(
      context,
      x - lanternWidth / 2,
      drop,
      lanternWidth,
      lanternHeight,
      lanternWidth * 0.22
    );
    context.fillStyle = hexToRgba(glowColor, 0.34);
    context.fill();
    context.strokeStyle = hexToRgba(accentColor, 0.54);
    context.lineWidth = 3;
    context.stroke();

    for (let section = 1; section < 4; section += 1) {
      const sectionY = drop + (lanternHeight / 4) * section;
      context.beginPath();
      context.moveTo(x - lanternWidth * 0.32, sectionY);
      context.lineTo(x + lanternWidth * 0.32, sectionY);
      context.strokeStyle = hexToRgba(accentColor, 0.24);
      context.lineWidth = 1.5;
      context.stroke();
    }

    context.beginPath();
    context.fillStyle = hexToRgba(accentColor, 0.72);
    context.arc(
      x,
      drop + lanternHeight / 2,
      lanternWidth * 0.13,
      0,
      Math.PI * 2
    );
    context.fill();

    context.beginPath();
    context.ellipse(
      x,
      drop + lanternHeight + height * 0.035,
      lanternWidth * 0.52,
      height * 0.018,
      0,
      0,
      FULL_CIRCLE
    );
    context.fillStyle = hexToRgba(glowColor, 0.14);
    context.fill();
  }

  context.restore();
};

const drawMosaicDecoration = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  accentColor: string,
  glowColor: string
): void => {
  context.save();

  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 6; column += 1) {
      const tileWidth = width * 0.1;
      const tileHeight = height * 0.07;
      const x = 48 + column * (tileWidth + 14);
      const y = height - 64 - row * (tileHeight + 14);
      const fill = (row + column) % 2 === 0 ? accentColor : glowColor;

      drawRoundedRect(context, x, y, tileWidth, tileHeight, 18);
      context.fillStyle = hexToRgba(fill, row === 0 ? 0.2 : 0.12);
      context.fill();
      context.strokeStyle = hexToRgba(accentColor, 0.22);
      context.lineWidth = 2;
      context.stroke();

      drawDiamond(
        context,
        x + tileWidth / 2,
        y + tileHeight / 2,
        tileWidth * 0.28,
        tileHeight * 0.42
      );
      context.fillStyle = hexToRgba(accentColor, 0.1);
      context.fill();
    }
  }

  drawStar(
    context,
    width * 0.82,
    height * 0.22,
    width * 0.06,
    width * 0.028,
    8
  );
  context.fillStyle = hexToRgba(glowColor, 0.14);
  context.fill();
  context.strokeStyle = hexToRgba(accentColor, 0.22);
  context.lineWidth = 2;
  context.stroke();

  context.restore();
};

const wrapText = (
  context: CanvasRenderingContext2D,
  content: string,
  maximumWidth: number
): string[] => {
  const words = content.trim().split(WORD_SEPARATOR).filter(Boolean);

  if (words.length === 0) {
    return [];
  }

  const lines: string[] = [];
  let currentLine = words[0] ?? "";

  for (const word of words.slice(1)) {
    const nextLine = `${currentLine} ${word}`;

    if (context.measureText(nextLine).width <= maximumWidth) {
      currentLine = nextLine;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  lines.push(currentLine);
  return lines;
};

const resolveTextLayout = (
  width: number,
  height: number,
  alignment: TextAlignment,
  anchorXPercent: number,
  anchorYPercent: number
): {
  readonly drawX: number;
  readonly left: number;
  readonly maxWidth: number;
  readonly top: number;
} => {
  const top = clamp((anchorYPercent / 100) * height, 210, height - 320);
  const maximumWidth = Math.min(width * 0.74, 720);
  const targetX = (anchorXPercent / 100) * width;

  if (alignment === "left") {
    const left = clamp(
      targetX,
      HORIZONTAL_PADDING,
      width - HORIZONTAL_PADDING - maximumWidth
    );

    return {
      drawX: left,
      left,
      maxWidth: maximumWidth,
      top,
    };
  }

  if (alignment === "right") {
    const right = clamp(
      targetX,
      HORIZONTAL_PADDING + maximumWidth,
      width - HORIZONTAL_PADDING
    );
    const left = right - maximumWidth;

    return {
      drawX: right,
      left,
      maxWidth: maximumWidth,
      top,
    };
  }

  const center = clamp(
    targetX,
    HORIZONTAL_PADDING + maximumWidth / 2,
    width - HORIZONTAL_PADDING - maximumWidth / 2
  );
  const left = center - maximumWidth / 2;

  return {
    drawX: center,
    left,
    maxWidth: maximumWidth,
    top,
  };
};

export const renderGreetingCard = ({
  backgroundImage,
  canvas,
  fonts,
  settings,
  templateImage,
  template,
}: RenderGreetingCardOptions): CardTextBounds => {
  const size = CARD_SIZES[settings.sizeId];
  const width = size.width;
  const height = size.height;

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    return {
      height: 0,
      width: 0,
      x: 0,
      y: 0,
    };
  }

  const { palette } = template;
  const overlayOpacity = clamp(settings.overlayStrength / 100, 0.25, 0.92);
  const hasTemplateArtwork = templateImage !== null;

  context.clearRect(0, 0, width, height);

  const baseGradient = context.createLinearGradient(0, 0, width, height);
  baseGradient.addColorStop(0, palette.backdropStart);
  baseGradient.addColorStop(1, palette.backdropEnd);
  context.fillStyle = baseGradient;
  context.fillRect(0, 0, width, height);

  if (backgroundImage) {
    drawImageCover(context, backgroundImage, width, height);
  }

  if (!hasTemplateArtwork || backgroundImage) {
    drawAmbientLayers(
      context,
      width,
      height,
      settings.accentColor,
      palette.glow,
      palette.border
    );
  }

  const topGlow = context.createRadialGradient(
    width * 0.8,
    height * 0.16,
    width * 0.04,
    width * 0.8,
    height * 0.16,
    width * 0.45
  );
  topGlow.addColorStop(0, hexToRgba(settings.accentColor, 0.36));
  topGlow.addColorStop(1, hexToRgba(palette.glow, 0));
  context.fillStyle = topGlow;
  context.fillRect(0, 0, width, height);

  const sideGlow = context.createRadialGradient(
    width * 0.06,
    height * 0.64,
    width * 0.04,
    width * 0.06,
    height * 0.64,
    width * 0.5
  );
  sideGlow.addColorStop(0, hexToRgba(palette.glow, 0.18));
  sideGlow.addColorStop(1, hexToRgba(palette.glow, 0));
  context.fillStyle = sideGlow;
  context.fillRect(0, 0, width, height);

  const atmosphere = context.createLinearGradient(0, 0, 0, height);
  atmosphere.addColorStop(
    0,
    hexToRgba("#08121d", backgroundImage ? overlayOpacity : 0.14)
  );
  atmosphere.addColorStop(
    1,
    hexToRgba("#0c1924", backgroundImage ? overlayOpacity * 1.08 : 0.2)
  );
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  if (hasTemplateArtwork) {
    drawImageCover(context, templateImage, width, height);
  } else {
    drawPatternField(
      context,
      width,
      height,
      settings.accentColor,
      palette.border
    );
    drawSkyline(context, width, height, palette.text, settings.accentColor);
    drawSparkles(context, width, height, palette.accentSoft);

    switch (template.decoration) {
      case "arch": {
        drawArchDecoration(
          context,
          width,
          height,
          settings.accentColor,
          palette.glow
        );
        break;
      }
      case "crescent": {
        drawCrescentDecoration(
          context,
          width,
          height,
          settings.accentColor,
          palette.glow
        );
        break;
      }
      case "lantern": {
        drawLanternDecoration(
          context,
          width,
          height,
          settings.accentColor,
          palette.glow
        );
        break;
      }
      case "mosaic": {
        drawMosaicDecoration(
          context,
          width,
          height,
          settings.accentColor,
          palette.glow
        );
        break;
      }
      default: {
        break;
      }
    }
  }

  context.save();
  context.lineWidth = 2;
  context.strokeStyle = hexToRgba(palette.border, 0.28);
  drawRoundedRect(context, 26, 26, width - 52, height - 52, 28);
  context.stroke();
  context.restore();

  drawCornerOrnaments(context, width, height, palette.border);

  const textLayout = resolveTextLayout(
    width,
    height,
    settings.alignment,
    settings.textX,
    settings.textY
  );
  const headingSize = clamp(settings.titleSize, 68, 136);
  const bodySize = clamp(settings.bodySize, 28, 48);
  const recipientLine = settings.recipient.trim()
    ? `Untuk ${settings.recipient.trim()}`
    : "Untuk orang-orang tercinta";
  const bodyText = settings.message.trim() || template.defaultMessage;
  const senderLine = settings.sender.trim()
    ? `Salam hangat, ${settings.sender.trim()}`
    : "Salam hangat di hari kemenangan";

  context.textAlign = settings.alignment;

  context.font = `700 ${Math.round(bodySize * 0.74)}px ${fonts.body}`;
  const badgeWidth = Math.min(
    context.measureText(template.badge).width + 48,
    textLayout.maxWidth * 0.65
  );
  let badgeX = textLayout.drawX - badgeWidth / 2;

  if (settings.alignment === "left") {
    badgeX = textLayout.left;
  } else if (settings.alignment === "right") {
    badgeX = textLayout.drawX - badgeWidth;
  }

  const badgeY = textLayout.top - 82;

  drawRoundedRect(context, badgeX, badgeY, badgeWidth, 46, 23);
  context.fillStyle = hexToRgba(settings.accentColor, 0.22);
  context.fill();
  context.strokeStyle = hexToRgba(palette.border, 0.28);
  context.lineWidth = 1.5;
  context.stroke();

  context.fillStyle = hexToRgba(settings.textColor, 0.88);
  context.textBaseline = "middle";
  context.fillText(template.badge, textLayout.drawX, badgeY + 23);

  context.font = `600 ${Math.round(bodySize * 0.72)}px ${fonts.body}`;
  const recipientHeight = bodySize * 0.92;
  const kickerHeight = bodySize * 0.78;
  const titleHeight = headingSize * 0.92;
  const messageLineHeight = bodySize * 1.34;
  const footerHeight = bodySize * 0.96;
  const titleGap = 20;
  const sectionGap = 18;
  const footerGap = 24;

  context.font = `500 ${bodySize}px ${fonts.body}`;
  const bodyLines = wrapText(context, bodyText, textLayout.maxWidth);
  const bodyHeight = Math.max(bodyLines.length, 1) * messageLineHeight;
  const panelHeight =
    PANEL_PADDING * 2 +
    kickerHeight +
    sectionGap +
    titleHeight +
    titleGap +
    recipientHeight +
    sectionGap +
    bodyHeight +
    footerGap +
    footerHeight;
  const panelY = textLayout.top - PANEL_PADDING;
  const panelWidth = textLayout.maxWidth + PANEL_PADDING * 2;
  const panelX = textLayout.left - PANEL_PADDING;

  context.save();
  context.shadowBlur = 34;
  context.shadowColor = hexToRgba("#000000", backgroundImage ? 0.3 : 0.18);
  context.shadowOffsetY = 18;
  drawRoundedRect(context, panelX, panelY, panelWidth, panelHeight, 32);
  context.fillStyle = hexToRgba("#000000", 0.08);
  context.fill();
  context.restore();

  drawRoundedRect(context, panelX, panelY, panelWidth, panelHeight, 32);
  const panelGradient = context.createLinearGradient(
    panelX,
    panelY,
    panelX,
    panelY + panelHeight
  );
  panelGradient.addColorStop(
    0,
    backgroundImage
      ? hexToRgba("#07131a", overlayOpacity * 0.58)
      : hexToRgba("#0b1422", 0.3)
  );
  panelGradient.addColorStop(
    1,
    backgroundImage
      ? hexToRgba("#07131a", overlayOpacity * 0.44)
      : hexToRgba("#0b1422", 0.2)
  );
  context.fillStyle = panelGradient;
  context.fill();
  context.strokeStyle = hexToRgba(palette.border, 0.24);
  context.lineWidth = 1.5;
  context.stroke();

  drawRoundedRect(
    context,
    panelX + 10,
    panelY + 10,
    panelWidth - 20,
    panelHeight - 20,
    26
  );
  context.strokeStyle = hexToRgba(palette.glow, 0.08);
  context.lineWidth = 1;
  context.stroke();

  context.beginPath();
  context.moveTo(panelX + 28, panelY + 26);
  context.lineTo(panelX + 118, panelY + 26);
  context.strokeStyle = hexToRgba(settings.accentColor, 0.55);
  context.lineWidth = 3;
  context.stroke();

  let cursorY = textLayout.top;

  context.textBaseline = "alphabetic";
  context.font = `600 ${Math.round(bodySize * 0.72)}px ${fonts.body}`;
  context.fillStyle = hexToRgba(settings.textColor, 0.82);
  context.fillText(template.kicker, textLayout.drawX, cursorY);

  cursorY += kickerHeight + sectionGap;

  context.font = `700 ${headingSize}px ${fonts.display}`;
  context.fillStyle = settings.textColor;
  context.fillText(template.headline, textLayout.drawX, cursorY);

  cursorY += titleHeight + titleGap;

  context.font = `700 ${Math.round(bodySize * 0.78)}px ${fonts.body}`;
  context.fillStyle = hexToRgba(settings.accentColor, 0.96);
  context.fillText(recipientLine, textLayout.drawX, cursorY);

  cursorY += recipientHeight + sectionGap;

  context.font = `500 ${bodySize}px ${fonts.body}`;
  context.fillStyle = hexToRgba(settings.textColor, 0.92);

  for (const line of bodyLines) {
    context.fillText(line, textLayout.drawX, cursorY);
    cursorY += messageLineHeight;
  }

  cursorY += footerGap - (messageLineHeight - footerHeight);

  context.font = `600 ${Math.round(bodySize * 0.76)}px ${fonts.body}`;
  context.fillStyle = hexToRgba(settings.textColor, 0.8);
  context.fillText(senderLine, textLayout.drawX, cursorY);

  return {
    height: panelHeight,
    width: panelWidth,
    x: panelX,
    y: panelY,
  };
};
