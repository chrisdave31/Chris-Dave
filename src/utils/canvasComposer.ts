import {
  CornerLayoutConfig,
  CoverFormat,
  ExportConfig,
  PhotoItem,
  SlotAdjustment,
  SlotKey,
  SlotRect,
  SplitLayoutConfig,
  TextFontFamily,
  TextOverlayItem,
} from '../types/cover';

export const REFERENCE_SIZE = 2048;

export function getTextOverlayFontStack(fontFamily: TextFontFamily = 'sans'): string {
  switch (fontFamily) {
    case 'serif':
      return '"Playfair Display", Georgia, "Times New Roman", serif';
    case 'mono':
      return '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
    case 'sans':
    default:
      return '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';
  }
}

export function getSlotsForFormat(format: CoverFormat): SlotKey[] {
  return format === 'corner-inset'
    ? ['main', 'corner']
    : ['topLeft', 'bottomLeft', 'rightHalf'];
}

export function getSlotLabel(key: SlotKey): string {
  switch (key) {
    case 'main':
      return 'Main Photo';
    case 'corner':
      return 'Inset Photo';
    case 'topLeft':
      return 'Top-Left';
    case 'bottomLeft':
      return 'Bottom-Left';
    case 'rightHalf':
      return 'Right Half';
  }
}

export function computeSlotRects(
  size: number,
  format: CoverFormat,
  cornerConfig: CornerLayoutConfig,
  splitConfig: SplitLayoutConfig,
): SlotRect[] {
  const scale = size / REFERENCE_SIZE;

  if (format === 'corner-inset') {
    const cornerSize = size * (cornerConfig.cornerSizePct / 100);
    const maxOffset = Math.max(0, size - cornerSize);
    const x = Math.max(0, Math.min(maxOffset, size * (cornerConfig.posX / 100)));
    const y = Math.max(0, Math.min(maxOffset, size * (cornerConfig.posY / 100)));
    const border = cornerConfig.borderPx * scale;
    const radius = cornerConfig.borderRadiusPx * scale;

    return [
      {
        key: 'main',
        label: 'Main Photo',
        x: 0,
        y: 0,
        w: size,
        h: size,
        radius: 0,
      },
      {
        key: 'corner',
        label: 'Inset Photo',
        x,
        y,
        w: cornerSize,
        h: cornerSize,
        radius,
        border,
        borderColor: cornerConfig.borderColor,
        shadow: cornerConfig.shadow,
      },
    ];
  }

  const outerMargin = splitConfig.outerMarginPx * scale;
  const gap = splitConfig.gapPx * scale;
  const radius = splitConfig.cornerRadiusPx * scale;
  const inner = Math.max(10, size - 2 * outerMargin);
  const halfW = Math.max(4, (inner - gap) / 2);
  const leftCellH = Math.max(4, (inner - gap) / 2);

  return [
    {
      key: 'topLeft',
      label: 'Top-Left',
      x: outerMargin,
      y: outerMargin,
      w: halfW,
      h: leftCellH,
      radius,
    },
    {
      key: 'bottomLeft',
      label: 'Bottom-Left',
      x: outerMargin,
      y: outerMargin + leftCellH + gap,
      w: halfW,
      h: leftCellH,
      radius,
    },
    {
      key: 'rightHalf',
      label: 'Right Half',
      x: outerMargin + halfW + gap,
      y: outerMargin,
      w: halfW,
      h: inner,
      radius,
    },
  ];
}

export function computeImageTransform(
  naturalWidth: number,
  naturalHeight: number,
  slotWidth: number,
  slotHeight: number,
  adjustment: SlotAdjustment,
) {
  const rotated = adjustment.rotation === 90 || adjustment.rotation === 270;
  const effectiveW = rotated ? naturalHeight : naturalWidth;
  const effectiveH = rotated ? naturalWidth : naturalHeight;

  const baseScale =
    adjustment.fitMode === 'cover'
      ? Math.max(slotWidth / effectiveW, slotHeight / effectiveH)
      : Math.min(slotWidth / effectiveW, slotHeight / effectiveH);

  const scale = baseScale * adjustment.zoom;
  const offsetX = adjustment.panX * slotWidth;
  const offsetY = adjustment.panY * slotHeight;

  return {
    scale,
    drawW: naturalWidth * scale,
    drawH: naturalHeight * scale,
    offsetX,
    offsetY,
  };
}

function traceRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const clampedR = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  if (clampedR === 0) {
    ctx.rect(x, y, w, h);
  } else {
    ctx.moveTo(x + clampedR, y);
    ctx.arcTo(x + w, y, x + w, y + h, clampedR);
    ctx.arcTo(x + w, y + h, x, y + h, clampedR);
    ctx.arcTo(x, y + h, x, y, clampedR);
    ctx.arcTo(x, y, x + w, y, clampedR);
    ctx.closePath();
  }
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImageElement(url: string): Promise<HTMLImageElement> {
  const existing = imageCache.get(url);
  if (existing) return existing;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => {
      imageCache.delete(url);
      reject(err);
    };
    img.src = url;
  });

  imageCache.set(url, promise);
  return promise;
}

export async function renderCoverToCanvas(options: {
  size: number;
  format: CoverFormat;
  cornerConfig: CornerLayoutConfig;
  splitConfig: SplitLayoutConfig;
  slots: Record<SlotKey, SlotAdjustment>;
  photos: PhotoItem[];
  textOverlays?: TextOverlayItem[];
}): Promise<HTMLCanvasElement> {
  const { size, format, cornerConfig, splitConfig, slots, photos, textOverlays = [] } = options;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize 2D canvas context');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const bgColor = format === 'three-split' ? splitConfig.backgroundColor : '#FFFFFF';
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);

  const rects = computeSlotRects(size, format, cornerConfig, splitConfig);
  const photoMap = new Map(photos.map((p) => [p.id, p]));

  const loadedImages = new Map<SlotKey, HTMLImageElement>();
  await Promise.all(
    rects.map(async (rect) => {
      const adj = slots[rect.key];
      const photo = adj.photoId ? photoMap.get(adj.photoId) : undefined;
      if (photo) {
        try {
          const img = await loadImageElement(photo.url);
          loadedImages.set(rect.key, img);
        } catch {
          // Skip failed load gracefully
        }
      }
    }),
  );

  for (const rect of rects) {
    const border = rect.border ?? 0;
    const outerRadius = rect.radius;

    // Draw shadow + border frame if applicable (e.g. corner inset)
    if (rect.key === 'corner') {
      ctx.save();
      if (rect.shadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.24)';
        ctx.shadowBlur = size * 0.028;
        ctx.shadowOffsetX = size * 0.004;
        ctx.shadowOffsetY = size * 0.01;
      }
      traceRoundedRect(ctx, rect.x, rect.y, rect.w, rect.h, outerRadius);
      ctx.fillStyle = rect.borderColor || '#FFFFFF';
      ctx.fill();
      ctx.restore();
    }

    const innerX = rect.x + border;
    const innerY = rect.y + border;
    const innerW = Math.max(1, rect.w - border * 2);
    const innerH = Math.max(1, rect.h - border * 2);
    const innerRadius = Math.max(0, outerRadius - border);

    ctx.save();
    traceRoundedRect(ctx, innerX, innerY, innerW, innerH, innerRadius);
    ctx.clip();

    // Slot interior backdrop (visible in 'contain' mode or empty slot)
    ctx.fillStyle = format === 'three-split' ? splitConfig.backgroundColor : '#F4F4F5';
    ctx.fillRect(innerX, innerY, innerW, innerH);

    const img = loadedImages.get(rect.key);
    const adj = slots[rect.key];

    if (img) {
      const { drawW, drawH, offsetX, offsetY } = computeImageTransform(
        img.naturalWidth,
        img.naturalHeight,
        innerW,
        innerH,
        adj,
      );

      ctx.translate(innerX + innerW / 2 + offsetX, innerY + innerH / 2 + offsetY);
      if (adj.flipH) {
        ctx.scale(-1, 1);
      }
      if (adj.rotation !== 0) {
        ctx.rotate((adj.rotation * Math.PI) / 180);
      }
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    }

    ctx.restore();
  }

  // Render text overlays on top
  const visibleTexts = textOverlays.filter((t) => t.text.trim().length > 0);
  if (visibleTexts.length > 0) {
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // Proceed with fallback font
      }
    }

    const scale = size / REFERENCE_SIZE;
    for (const overlay of visibleTexts) {
      const fontPx = overlay.fontSizePx * scale;
      const cx = size * (overlay.posX / 100);
      const cy = size * (overlay.posY / 100);

      ctx.save();
      ctx.font = `${overlay.fontWeight} ${fontPx}px ${getTextOverlayFontStack(overlay.fontFamily)}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (overlay.backgroundColor) {
        const metrics = ctx.measureText(overlay.text);
        const padX = fontPx * 0.42;
        const padY = fontPx * 0.22;
        const boxW = metrics.width + padX * 2;
        const boxH = fontPx * 1.15 + padY * 2;
        const radius = fontPx * 0.16;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
        ctx.shadowBlur = size * 0.014;
        ctx.shadowOffsetY = size * 0.004;
        traceRoundedRect(ctx, cx - boxW / 2, cy - boxH / 2, boxW, boxH, radius);
        ctx.fillStyle = overlay.backgroundColor;
        ctx.fill();
        ctx.restore();
      } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
        ctx.shadowBlur = fontPx * 0.18;
        ctx.shadowOffsetY = fontPx * 0.04;
      }

      ctx.fillStyle = overlay.color;
      ctx.fillText(overlay.text, cx, cy + fontPx * 0.03);
      ctx.restore();
    }
  }

  return canvas;
}

export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ExportConfig['format'],
  jpegQuality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const quality = format === 'image/jpeg' ? jpegQuality / 100 : undefined;
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to encode image file'));
      },
      format,
      quality,
    );
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}
