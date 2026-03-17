import {
  CARD_SIZES,
  type EditorState,
  type EidTemplate,
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

interface ImagePlacement {
  readonly renderHeight: number;
  readonly renderWidth: number;
  readonly renderX: number;
  readonly renderY: number;
}

interface ResolvedNamePlate {
  readonly bottom: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly color: string;
  readonly fontSize: number;
  readonly maxWidth: number;
}

const FULL_CIRCLE = Math.PI * 2;
type ImageFitMode = "contain" | "cover";

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

const getImagePlacement = (
  image: HTMLImageElement,
  width: number,
  height: number,
  mode: ImageFitMode
): ImagePlacement => {
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  const scale =
    mode === "cover"
      ? Math.max(width / imageWidth, height / imageHeight)
      : Math.min(width / imageWidth, height / imageHeight);
  return {
    renderHeight: imageHeight * scale,
    renderWidth: imageWidth * scale,
    renderX: (width - imageWidth * scale) / 2,
    renderY: (height - imageHeight * scale) / 2,
  };
};

const drawPlacedImage = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  placement: ImagePlacement,
  filter = "saturate(0.92) contrast(1.04)",
  alpha = 1
): void => {
  context.save();
  context.filter = filter;
  context.globalAlpha = alpha;
  context.drawImage(
    image,
    placement.renderX,
    placement.renderY,
    placement.renderWidth,
    placement.renderHeight
  );
  context.restore();
};

const drawImageCover = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number
): ImagePlacement => {
  const placement = getImagePlacement(image, width, height, "cover");
  drawPlacedImage(context, image, placement);
  return placement;
};

const drawImageContainWithBackdrop = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number
): ImagePlacement => {
  const backdropPlacement = getImagePlacement(image, width, height, "cover");
  drawPlacedImage(
    context,
    image,
    backdropPlacement,
    "blur(28px) saturate(0.98) contrast(1.02)",
    0.88
  );

  const containPlacement = getImagePlacement(image, width, height, "contain");

  context.save();
  context.shadowBlur = 30;
  context.shadowColor = hexToRgba("#000000", 0.14);
  context.shadowOffsetY = 18;
  drawPlacedImage(context, image, containPlacement);
  context.restore();

  return containPlacement;
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

const drawGeneratedTemplateArtwork = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: EditorState,
  template: EidTemplate
): void => {
  drawPatternField(
    context,
    width,
    height,
    settings.accentColor,
    template.palette.border
  );
  drawSkyline(
    context,
    width,
    height,
    template.palette.text,
    settings.accentColor
  );
  drawSparkles(context, width, height, template.palette.accentSoft);

  switch (template.decoration) {
    case "arch": {
      drawArchDecoration(
        context,
        width,
        height,
        settings.accentColor,
        template.palette.glow
      );
      break;
    }
    case "crescent": {
      drawCrescentDecoration(
        context,
        width,
        height,
        settings.accentColor,
        template.palette.glow
      );
      break;
    }
    case "lantern": {
      drawLanternDecoration(
        context,
        width,
        height,
        settings.accentColor,
        template.palette.glow
      );
      break;
    }
    case "mosaic": {
      drawMosaicDecoration(
        context,
        width,
        height,
        settings.accentColor,
        template.palette.glow
      );
      break;
    }
    default: {
      break;
    }
  }
};

const resolveNamePlate = (
  template: EidTemplate,
  placement: ImagePlacement,
  templateImage: HTMLImageElement
): ResolvedNamePlate | null => {
  const namePlate = template.namePlate;

  if (!namePlate) {
    return null;
  }

  const imageWidth = templateImage.naturalWidth || templateImage.width;
  const scale = placement.renderWidth / imageWidth;
  const plateHeight = namePlate.boxHeight * placement.renderHeight;

  return {
    bottom:
      placement.renderY +
      namePlate.centerY * placement.renderHeight +
      plateHeight / 2,
    centerX: placement.renderX + namePlate.centerX * placement.renderWidth,
    centerY: placement.renderY + namePlate.centerY * placement.renderHeight,
    color: namePlate.color,
    fontSize: namePlate.fontSize * scale,
    maxWidth: namePlate.maxWidth * placement.renderWidth,
  };
};

const fitNamePlateFontSize = (
  context: CanvasRenderingContext2D,
  name: string,
  baseFontSize: number,
  maxWidth: number,
  fontFamily: string
): number => {
  let fontSize = Math.max(baseFontSize, 24);

  for (let attempt = 0; attempt < 18; attempt += 1) {
    context.font = `700 ${Math.round(fontSize)}px ${fontFamily}`;

    if (context.measureText(name).width <= maxWidth || fontSize <= 28) {
      return fontSize;
    }

    fontSize -= 2;
  }

  return Math.max(fontSize, 28);
};

const drawNamePlateText = (
  context: CanvasRenderingContext2D,
  namePlate: ResolvedNamePlate,
  name: string,
  fonts: RenderFonts
): void => {
  const fittedFontSize = fitNamePlateFontSize(
    context,
    name,
    namePlate.fontSize,
    namePlate.maxWidth,
    fonts.display
  );

  context.save();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `700 ${Math.round(fittedFontSize)}px ${fonts.display}`;
  context.fillStyle = namePlate.color;
  context.shadowBlur = 14;
  context.shadowColor = hexToRgba("#ffffff", 0.78);
  context.fillText(name, namePlate.centerX, namePlate.centerY + 2);
  context.restore();
};

const drawCardBackdrop = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: EditorState,
  template: EidTemplate,
  templateImage: HTMLImageElement | null,
  backgroundImage: HTMLImageElement | null
): ImagePlacement | null => {
  const hasTemplateArtwork = templateImage !== null;
  const overlayOpacity = clamp(settings.overlayStrength / 100, 0.25, 0.92);
  const baseGradient = context.createLinearGradient(0, 0, width, height);

  baseGradient.addColorStop(0, template.palette.backdropStart);
  baseGradient.addColorStop(1, template.palette.backdropEnd);
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
      template.palette.glow,
      template.palette.border
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
  topGlow.addColorStop(1, hexToRgba(template.palette.glow, 0));
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
  sideGlow.addColorStop(0, hexToRgba(template.palette.glow, 0.18));
  sideGlow.addColorStop(1, hexToRgba(template.palette.glow, 0));
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

  if (templateImage) {
    return settings.sizeId === "portrait"
      ? drawImageCover(context, templateImage, width, height)
      : drawImageContainWithBackdrop(context, templateImage, width, height);
  }

  drawGeneratedTemplateArtwork(context, width, height, settings, template);
  return null;
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

  context.clearRect(0, 0, width, height);
  const templateImagePlacement = drawCardBackdrop(
    context,
    width,
    height,
    settings,
    template,
    templateImage,
    backgroundImage
  );

  context.save();
  context.lineWidth = 2;
  context.strokeStyle = hexToRgba(palette.border, 0.28);
  drawRoundedRect(context, 26, 26, width - 52, height - 52, 28);
  context.stroke();
  context.restore();

  drawCornerOrnaments(context, width, height, palette.border);

  const senderName = settings.sender.trim() || "Nama Anda";
  const namePlate =
    templateImage && templateImagePlacement
      ? resolveNamePlate(template, templateImagePlacement, templateImage)
      : null;

  if (namePlate) {
    drawNamePlateText(context, namePlate, senderName, fonts);
  }

  return {
    height: 0,
    width: 0,
    x: 0,
    y: 0,
  };
};
