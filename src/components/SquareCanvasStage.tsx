import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Crop,
  FlipHorizontal2,
  Maximize2,
  Minimize2,
  Move,
  Plus,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  CornerLayoutConfig,
  CoverFormat,
  PhotoItem,
  SlotAdjustment,
  SlotKey,
  SplitLayoutConfig,
  TextOverlayItem,
} from '../types/cover';
import {
  REFERENCE_SIZE,
  computeImageTransform,
  computeSlotRects,
  getSlotLabel,
  getSlotsForFormat,
  getTextOverlayFontStack,
} from '../utils/canvasComposer';

interface SquareCanvasStageProps {
  format: CoverFormat;
  cornerConfig: CornerLayoutConfig;
  splitConfig: SplitLayoutConfig;
  slots: Record<SlotKey, SlotAdjustment>;
  photos: PhotoItem[];
  activeSlot: SlotKey;
  textOverlays: TextOverlayItem[];
  selectedTextId: string | null;
  onSelectSlot: (slot: SlotKey) => void;
  onUpdateSlot: (slot: SlotKey, patch: Partial<SlotAdjustment>) => void;
  onUpdateCornerConfig: (patch: Partial<CornerLayoutConfig>) => void;
  onResetSlot: (slot: SlotKey) => void;
  onAssignPhotoToSlot: (slot: SlotKey, photoId: string) => void;
  onSwapSlots: (slotA: SlotKey, slotB: SlotKey) => void;
  onUploadFilesToSlot: (slot: SlotKey, files: FileList | File[]) => void;
  onSelectTextOverlay: (id: string | null) => void;
  onUpdateTextOverlay: (id: string, patch: Partial<TextOverlayItem>) => void;
  onDropNewTextOverlay: (text: string, posX: number, posY: number) => void;
}

type DragSession =
  | {
      kind: 'pan-image';
      slot: SlotKey;
      startX: number;
      startY: number;
      origPanX: number;
      origPanY: number;
      slotW: number;
      slotH: number;
    }
  | {
      kind: 'move-inset';
      startX: number;
      startY: number;
      origPosX: number;
      origPosY: number;
    }
  | {
      kind: 'move-text';
      id: string;
      startX: number;
      startY: number;
      origPosX: number;
      origPosY: number;
    };

export function SquareCanvasStage({
  format,
  cornerConfig,
  splitConfig,
  slots,
  photos,
  activeSlot,
  textOverlays,
  selectedTextId,
  onSelectSlot,
  onUpdateSlot,
  onUpdateCornerConfig,
  onResetSlot,
  onAssignPhotoToSlot,
  onSwapSlots,
  onUploadFilesToSlot,
  onSelectTextOverlay,
  onUpdateTextOverlay,
  onDropNewTextOverlay,
}: SquareCanvasStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const slotInputRef = useRef<HTMLInputElement>(null);
  const [previewSize, setPreviewSize] = useState(540);
  const [dragTargetSlot, setDragTargetSlot] = useState<SlotKey | null>(null);
  const [uploadTargetSlot, setUploadTargetSlot] = useState<SlotKey>(activeSlot);
  const [cornerInteraction, setCornerInteraction] = useState<'move' | 'pan'>('move');
  const [snapGuide, setSnapGuide] = useState<{ x?: number; y?: number }>({});

  const dragSessionRef = useRef<DragSession | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        setPreviewSize(Math.round(rect.width));
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const formatSlots = getSlotsForFormat(format);
  const rects = computeSlotRects(previewSize, format, cornerConfig, splitConfig);
  const photoMap = new Map(photos.map((p) => [p.id, p]));

  const activeAdjustment = slots[activeSlot];
  const activePhoto = activeAdjustment.photoId
    ? photoMap.get(activeAdjustment.photoId)
    : undefined;

  const startMoveInset = (
    e: React.PointerEvent<HTMLElement>,
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelectSlot('corner');
    onSelectTextOverlay(null);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragSessionRef.current = {
      kind: 'move-inset',
      startX: e.clientX,
      startY: e.clientY,
      origPosX: cornerConfig.posX,
      origPosY: cornerConfig.posY,
    };
  };

  const startMoveText = (
    e: React.PointerEvent<HTMLDivElement>,
    item: TextOverlayItem,
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelectTextOverlay(item.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragSessionRef.current = {
      kind: 'move-text',
      id: item.id,
      startX: e.clientX,
      startY: e.clientY,
      origPosX: item.posX,
      origPosY: item.posY,
    };
  };

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    slotKey: SlotKey,
    innerW: number,
    innerH: number,
    hasPhoto: boolean,
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelectSlot(slotKey);
    onSelectTextOverlay(null);

    if (slotKey === 'corner' && cornerInteraction === 'move') {
      startMoveInset(e);
      return;
    }

    if (!hasPhoto) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    const adj = slots[slotKey];
    dragSessionRef.current = {
      kind: 'pan-image',
      slot: slotKey,
      startX: e.clientX,
      startY: e.clientY,
      origPanX: adj.panX,
      origPanY: adj.panY,
      slotW: innerW,
      slotH: innerH,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const session = dragSessionRef.current;
    if (!session) return;

    if (session.kind === 'move-text') {
      const dxPct = ((e.clientX - session.startX) / previewSize) * 100;
      const dyPct = ((e.clientY - session.startY) / previewSize) * 100;

      let nextX = Math.max(4, Math.min(96, session.origPosX + dxPct));
      let nextY = Math.max(4, Math.min(96, session.origPosY + dyPct));

      const guides: { x?: number; y?: number } = {};
      if (Math.abs(nextX - 50) < 1.2) {
        nextX = 50;
        guides.x = 50;
      }
      if (Math.abs(nextY - 50) < 1.2) {
        nextY = 50;
        guides.y = 50;
      }

      setSnapGuide(guides);
      onUpdateTextOverlay(session.id, {
        posX: Number(nextX.toFixed(2)),
        posY: Number(nextY.toFixed(2)),
      });
      return;
    }

    if (session.kind === 'move-inset') {
      const dxPct = ((e.clientX - session.startX) / previewSize) * 100;
      const dyPct = ((e.clientY - session.startY) / previewSize) * 100;
      const maxPct = Math.max(0, 100 - cornerConfig.cornerSizePct);

      let nextX = Math.max(0, Math.min(maxPct, session.origPosX + dxPct));
      let nextY = Math.max(0, Math.min(maxPct, session.origPosY + dyPct));

      const centerPct = maxPct / 2;
      const marginAnchor = Math.min(2.5, maxPct);
      const farMarginAnchor = Math.max(0, maxPct - 2.5);
      const snapThreshold = 1.0;

      const guides: { x?: number; y?: number } = {};

      if (Math.abs(nextX - centerPct) < snapThreshold) {
        nextX = centerPct;
        guides.x = 50;
      } else if (Math.abs(nextX - marginAnchor) < snapThreshold) {
        nextX = marginAnchor;
      } else if (Math.abs(nextX - farMarginAnchor) < snapThreshold) {
        nextX = farMarginAnchor;
      }

      if (Math.abs(nextY - centerPct) < snapThreshold) {
        nextY = centerPct;
        guides.y = 50;
      } else if (Math.abs(nextY - marginAnchor) < snapThreshold) {
        nextY = marginAnchor;
      } else if (Math.abs(nextY - farMarginAnchor) < snapThreshold) {
        nextY = farMarginAnchor;
      }

      setSnapGuide(guides);
      onUpdateCornerConfig({
        posX: Number(nextX.toFixed(2)),
        posY: Number(nextY.toFixed(2)),
      });
      return;
    }

    const dx = e.clientX - session.startX;
    const dy = e.clientY - session.startY;
    const nextPanX = Math.max(
      -0.85,
      Math.min(0.85, session.origPanX + dx / session.slotW),
    );
    const nextPanY = Math.max(
      -0.85,
      Math.min(0.85, session.origPanY + dy / session.slotH),
    );
    onUpdateSlot(session.slot, { panX: nextPanX, panY: nextPanY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (dragSessionRef.current) {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      dragSessionRef.current = null;
      setSnapGuide({});
    }
  };

  const handleSlotDrop = (e: React.DragEvent<HTMLDivElement>, targetSlot: SlotKey) => {
    e.preventDefault();
    e.stopPropagation();
    setDragTargetSlot(null);

    const textPreset = e.dataTransfer.getData('application/x-squarecover-text-preset');
    if (textPreset && stageRef.current) {
      const stageRect = stageRef.current.getBoundingClientRect();
      const dropX = Math.max(
        6,
        Math.min(94, ((e.clientX - stageRect.left) / stageRect.width) * 100),
      );
      const dropY = Math.max(
        6,
        Math.min(94, ((e.clientY - stageRect.top) / stageRect.height) * 100),
      );
      onDropNewTextOverlay(textPreset, Number(dropX.toFixed(2)), Number(dropY.toFixed(2)));
      return;
    }

    const photoId = e.dataTransfer.getData('application/x-squarecover-photo');
    if (photoId) {
      onAssignPhotoToSlot(targetSlot, photoId);
      onSelectSlot(targetSlot);
      return;
    }

    const sourceSlot = e.dataTransfer.getData('application/x-squarecover-slot') as SlotKey | '';
    if (sourceSlot && sourceSlot !== targetSlot) {
      onSwapSlots(sourceSlot, targetSlot);
      onSelectSlot(targetSlot);
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFilesToSlot(targetSlot, e.dataTransfer.files);
    }
  };

  const handleQuickSwap = () => {
    if (format === 'corner-inset') {
      onSwapSlots('main', 'corner');
      return;
    }
    const idx = formatSlots.indexOf(activeSlot);
    const nextSlot = formatSlots[(idx + 1) % formatSlots.length];
    onSwapSlots(activeSlot, nextSlot);
  };

  const handleRotate = () => {
    const nextRot = ((activeAdjustment.rotation + 90) % 360) as 0 | 90 | 180 | 270;
    onUpdateSlot(activeSlot, { rotation: nextRot });
  };

  return (
    <div id="canvas-stage" className="flex flex-col items-center w-full">
      <input
        ref={slotInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onUploadFilesToSlot(uploadTargetSlot, e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Slot Selector Strip above square canvas */}
      <div className="mb-3 flex w-full max-w-[560px] items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Active layout slot"
          className="flex items-center gap-1 rounded-lg bg-zinc-200/70 p-1"
        >
          {formatSlots.map((slotKey) => {
            const isSelected = activeSlot === slotKey;
            return (
              <button
                key={slotKey}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onSelectSlot(slotKey)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600 ${
                  isSelected
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {getSlotLabel(slotKey)}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleQuickSwap}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
          Swap
        </button>
      </div>

      {/* 1:1 Square Canvas Frame */}
      <div className="w-full max-w-[560px]">
        <div
          ref={stageRef}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('application/x-squarecover-text-preset')) {
              e.preventDefault();
            }
          }}
          onDrop={(e) => {
            const textPreset = e.dataTransfer.getData('application/x-squarecover-text-preset');
            if (textPreset && stageRef.current) {
              e.preventDefault();
              const stageRect = stageRef.current.getBoundingClientRect();
              const dropX = Math.max(
                6,
                Math.min(94, ((e.clientX - stageRect.left) / stageRect.width) * 100),
              );
              const dropY = Math.max(
                6,
                Math.min(94, ((e.clientY - stageRect.top) / stageRect.height) * 100),
              );
              onDropNewTextOverlay(
                textPreset,
                Number(dropX.toFixed(2)),
                Number(dropY.toFixed(2)),
              );
            }
          }}
          className="relative aspect-square w-full overflow-hidden rounded-sm shadow-[0_12px_36px_-10px_rgba(24,24,27,0.18)] ring-1 ring-zinc-900/10 select-none"
          style={{
            backgroundColor:
              format === 'three-split' ? splitConfig.backgroundColor : '#FFFFFF',
          }}
        >
          {/* Optional center alignment snap guides while dragging inset */}
          {snapGuide.x === 50 && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-1/2 z-30 w-px -translate-x-1/2 bg-blue-600/70"
            />
          )}
          {snapGuide.y === 50 && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-1/2 z-30 h-px -translate-y-1/2 bg-blue-600/70"
            />
          )}

          {rects.map((rect) => {
            const adj = slots[rect.key];
            const photo = adj.photoId ? photoMap.get(adj.photoId) : undefined;
            const isSelected = activeSlot === rect.key;
            const isDragOver = dragTargetSlot === rect.key;
            const isCornerSlot = rect.key === 'corner';

            const border = rect.border ?? 0;
            const innerW = Math.max(1, rect.w - border * 2);
            const innerH = Math.max(1, rect.h - border * 2);
            const innerRadius = Math.max(0, rect.radius - border);

            const transform = photo
              ? computeImageTransform(
                  photo.width,
                  photo.height,
                  innerW,
                  innerH,
                  adj,
                )
              : null;

            const cursorClass = isCornerSlot
              ? cornerInteraction === 'move'
                ? 'cursor-move'
                : photo
                  ? 'cursor-grab active:cursor-grabbing'
                  : 'cursor-pointer'
              : photo
                ? 'cursor-grab active:cursor-grabbing'
                : 'cursor-pointer';

            return (
              <div
                key={rect.key}
                onPointerDown={(e) =>
                  handlePointerDown(e, rect.key, innerW, innerH, Boolean(photo))
                }
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onDoubleClick={() => {
                  if (photo) onResetSlot(rect.key);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!e.dataTransfer.types.includes('application/x-squarecover-text-preset')) {
                    setDragTargetSlot(rect.key);
                  }
                }}
                onDragLeave={(e) => {
                  e.stopPropagation();
                  setDragTargetSlot((prev) => (prev === rect.key ? null : prev));
                }}
                onDrop={(e) => handleSlotDrop(e, rect.key)}
                style={{
                  left: `${rect.x}px`,
                  top: `${rect.y}px`,
                  width: `${rect.w}px`,
                  height: `${rect.h}px`,
                  borderRadius: `${rect.radius}px`,
                  padding: `${border}px`,
                  backgroundColor: isCornerSlot
                    ? rect.borderColor || '#FFFFFF'
                    : 'transparent',
                  boxShadow:
                    isCornerSlot && rect.shadow
                      ? '0 10px 28px rgba(0, 0, 0, 0.24)'
                      : undefined,
                  zIndex: isCornerSlot ? 20 : 10,
                }}
                className={`group absolute touch-none transition-shadow duration-150 ${cursorClass}`}
              >
                <div
                  className="relative h-full w-full overflow-hidden"
                  style={{
                    borderRadius: `${innerRadius}px`,
                    backgroundColor:
                      format === 'three-split'
                        ? splitConfig.backgroundColor
                        : '#F4F4F5',
                  }}
                >
                  {photo && transform ? (
                    <img
                      src={photo.url}
                      alt={photo.name}
                      draggable={false}
                      referrerPolicy="no-referrer"
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        width: `${transform.drawW}px`,
                        height: `${transform.drawH}px`,
                        maxWidth: 'none',
                        maxHeight: 'none',
                        transformOrigin: 'center center',
                        transform: `translate(calc(-50% + ${transform.offsetX}px), calc(-50% + ${transform.offsetY}px)) scaleX(${
                          adj.flipH ? -1 : 1
                        }) rotate(${adj.rotation}deg)`,
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-3 text-center">
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadTargetSlot(rect.key);
                          onSelectSlot(rect.key);
                          slotInputRef.current?.click();
                        }}
                        className="flex flex-col items-center gap-1.5 rounded-lg px-3 py-2 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900 transition-colors"
                      >
                        <Plus className="h-5 w-5" aria-hidden="true" />
                        <span className="text-xs font-medium">{rect.label}</span>
                        <span className="text-[11px] text-zinc-500">
                          Drop or upload photo
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Subtle interactive selection/drop ring — never exported */}
                  <div
                    className={`pointer-events-none absolute inset-0 transition-all duration-150 ${
                      isDragOver
                        ? 'ring-3 ring-inset ring-blue-600 bg-blue-600/10'
                        : isSelected
                          ? 'ring-2 ring-inset ring-blue-600/85'
                          : 'ring-0 group-hover:ring-1 group-hover:ring-inset group-hover:ring-zinc-900/35'
                    }`}
                    style={{ borderRadius: `${innerRadius}px` }}
                  />

                  {/* Subtle corner slot identifier on hover/selection */}
                  <div
                    className={`pointer-events-none absolute left-2 top-2 rounded bg-zinc-900/75 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs transition-opacity duration-150 ${
                      isSelected || isDragOver
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {rect.label}
                  </div>

                  {/* Always-accessible Move handle on the inset photo even in Pan Crop mode */}
                  {isCornerSlot && (
                    <button
                      type="button"
                      title="Drag to move inset position"
                      aria-label="Drag to move inset position"
                      onPointerDown={startMoveInset}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      className={`absolute right-2 top-2 flex h-6 w-6 cursor-move items-center justify-center rounded bg-zinc-900/75 text-white backdrop-blur-xs transition-opacity duration-150 hover:bg-zinc-900 ${
                        isSelected
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <Move className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Interactive Draggable Text Overlays */}
          {textOverlays
            .filter((t) => t.text.trim().length > 0)
            .map((item) => {
              const scale = previewSize / REFERENCE_SIZE;
              const fontPx = item.fontSizePx * scale;
              const isSelectedText = selectedTextId === item.id;
              const hasBg = Boolean(item.backgroundColor);

              return (
                <div
                  key={item.id}
                  onPointerDown={(e) => startMoveText(e, item)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  style={{
                    left: `${item.posX}%`,
                    top: `${item.posY}%`,
                    transform: 'translate(-50%, -50%)',
                    fontFamily: getTextOverlayFontStack(item.fontFamily),
                    fontWeight: item.fontWeight,
                    fontSize: `${fontPx}px`,
                    lineHeight: 1.15,
                    color: item.color,
                    backgroundColor: item.backgroundColor ?? 'transparent',
                    padding: hasBg
                      ? `${fontPx * 0.22}px ${fontPx * 0.42}px`
                      : '2px 4px',
                    borderRadius: hasBg ? `${fontPx * 0.16}px` : '4px',
                    boxShadow: hasBg
                      ? `0 ${previewSize * 0.004}px ${previewSize * 0.014}px rgba(0, 0, 0, 0.18)`
                      : undefined,
                    textShadow: !hasBg
                      ? `0 ${fontPx * 0.04}px ${fontPx * 0.18}px rgba(0, 0, 0, 0.28)`
                      : undefined,
                    zIndex: 35,
                  }}
                  className={`absolute cursor-move touch-none whitespace-nowrap select-none transition-shadow duration-150 ${
                    isSelectedText
                      ? 'ring-2 ring-blue-600 ring-offset-2'
                      : 'hover:ring-1 hover:ring-blue-600/70 hover:ring-offset-1'
                  }`}
                >
                  {item.text}
                </div>
              );
            })}
        </div>
      </div>

      {/* Active Slot Controls Toolbar */}
      <div className="mt-3 flex w-full max-w-[560px] flex-wrap items-center justify-between gap-2.5 rounded-xl border border-zinc-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {activeSlot === 'corner' ? (
            <div
              role="group"
              aria-label="Inset drag mode"
              className="flex items-center gap-0.5 rounded-md bg-zinc-100 p-0.5"
            >
              <button
                type="button"
                onClick={() => setCornerInteraction('move')}
                aria-pressed={cornerInteraction === 'move'}
                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  cornerInteraction === 'move'
                    ? 'bg-white text-zinc-900 shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Move className="h-3 w-3" aria-hidden="true" />
                Move
              </button>
              <button
                type="button"
                onClick={() => setCornerInteraction('pan')}
                aria-pressed={cornerInteraction === 'pan'}
                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  cornerInteraction === 'pan'
                    ? 'bg-white text-zinc-900 shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Crop className="h-3 w-3" aria-hidden="true" />
                Pan Photo
              </button>
            </div>
          ) : (
            <span className="text-xs font-semibold text-zinc-900 whitespace-nowrap">
              {getSlotLabel(activeSlot)}
            </span>
          )}

          <span className="text-zinc-300" aria-hidden="true">
            ·
          </span>
          <button
            type="button"
            disabled={!activePhoto}
            onClick={() =>
              onUpdateSlot(activeSlot, {
                fitMode: activeAdjustment.fitMode === 'cover' ? 'contain' : 'cover',
                panX: 0,
                panY: 0,
                zoom: 1,
              })
            }
            title={
              activeAdjustment.fitMode === 'cover'
                ? 'Switch to Fit (show entire product)'
                : 'Switch to Fill (crop to fill slot)'
            }
            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            {activeAdjustment.fitMode === 'cover' ? (
              <>
                <Maximize2 className="h-3 w-3" aria-hidden="true" />
                Fill
              </>
            ) : (
              <>
                <Minimize2 className="h-3 w-3" aria-hidden="true" />
                Fit
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-[190px] min-w-[130px]">
          <button
            type="button"
            disabled={!activePhoto}
            onClick={() =>
              onUpdateSlot(activeSlot, {
                zoom: Math.max(1, +(activeAdjustment.zoom - 0.1).toFixed(2)),
              })
            }
            aria-label="Zoom out"
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40"
          >
            <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <input
            type="range"
            min={1}
            max={3}
            step={0.02}
            disabled={!activePhoto}
            value={activeAdjustment.zoom}
            aria-label="Zoom level"
            onChange={(e) =>
              onUpdateSlot(activeSlot, { zoom: parseFloat(e.target.value) })
            }
            className="studio-slider w-full disabled:opacity-40"
          />
          <button
            type="button"
            disabled={!activePhoto}
            onClick={() =>
              onUpdateSlot(activeSlot, {
                zoom: Math.min(3, +(activeAdjustment.zoom + 0.1).toFixed(2)),
              })
            }
            aria-label="Zoom in"
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40"
          >
            <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <span className="font-mono text-[11px] text-zinc-600 tabular-nums w-9 text-right shrink-0">
            {activeAdjustment.zoom.toFixed(1)}×
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!activePhoto}
            onClick={handleRotate}
            title="Rotate 90° clockwise"
            aria-label="Rotate 90 degrees"
            className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 transition-colors"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={!activePhoto}
            onClick={() =>
              onUpdateSlot(activeSlot, { flipH: !activeAdjustment.flipH })
            }
            title="Flip horizontally"
            aria-label="Flip horizontally"
            aria-pressed={activeAdjustment.flipH}
            className={`rounded-md p-1.5 transition-colors disabled:opacity-40 ${
              activeAdjustment.flipH
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <FlipHorizontal2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={!activePhoto}
            onClick={() => onResetSlot(activeSlot)}
            title="Reset framing"
            aria-label="Reset slot framing"
            className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 transition-colors"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-zinc-500">
        {format === 'corner-inset' && activeSlot === 'corner'
          ? cornerInteraction === 'move'
            ? 'Drag the inset photo anywhere on the cover · Switch to Pan Photo to adjust its crop'
            : 'Drag inside to crop photo · Drag the top-right move handle to reposition the inset'
          : 'Drag inside any photo to reposition · Double-click a slot to reset framing'}
      </p>
    </div>
  );
}
