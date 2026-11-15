export type CoverFormat = 'corner-inset' | 'three-split';

export type SlotKey = 'main' | 'corner' | 'topLeft' | 'bottomLeft' | 'rightHalf';

export type FitMode = 'cover' | 'contain';

export interface PhotoItem {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  isSample?: boolean;
}

export interface SlotAdjustment {
  photoId: string | null;
  zoom: number;
  panX: number;
  panY: number;
  fitMode: FitMode;
  rotation: 0 | 90 | 180 | 270;
  flipH: boolean;
}

export interface CornerLayoutConfig {
  cornerSizePct: number;
  posX: number;
  posY: number;
  borderPx: number;
  borderColor: string;
  borderRadiusPx: number;
  shadow: boolean;
}

export interface SplitLayoutConfig {
  gapPx: number;
  outerMarginPx: number;
  backgroundColor: string;
  cornerRadiusPx: number;
}

export type ExportResolution = 1080 | 1600 | 2048 | 3000;
export type ExportFormat = 'image/jpeg' | 'image/png';

export interface ExportConfig {
  resolution: ExportResolution;
  format: ExportFormat;
  jpegQuality: number;
  fileName: string;
}

export interface SlotRect {
  key: SlotKey;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  border?: number;
  borderColor?: string;
  shadow?: boolean;
}

export type TextFontFamily = 'sans' | 'serif' | 'mono';

export interface TextOverlayItem {
  id: string;
  text: string;
  posX: number;
  posY: number;
  fontSizePx: number;
  fontFamily: TextFontFamily;
  color: string;
  backgroundColor: string | null;
  fontWeight: 600 | 700;
}

