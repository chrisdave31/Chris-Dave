import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import sampleMainUrl from './assets/images/sample_bag_main_1794765840517.jpg';
import sampleDetailUrl from './assets/images/sample_bag_detail_1794765840574.jpg';
import sampleInteriorUrl from './assets/images/sample_bag_interior_1794765841288.jpg';
import { FormatSelector } from './components/FormatSelector';
import { FullPreviewModal } from './components/FullPreviewModal';
import { InspectorPanel } from './components/InspectorPanel';
import { PhotoTray } from './components/PhotoTray';
import { SquareCanvasStage } from './components/SquareCanvasStage';
import {
  CornerLayoutConfig,
  CoverFormat,
  ExportConfig,
  PhotoItem,
  SlotAdjustment,
  SlotKey,
  SplitLayoutConfig,
  TextOverlayItem,
} from './types/cover';
import {
  canvasToBlob,
  getSlotsForFormat,
  loadImageElement,
  renderCoverToCanvas,
} from './utils/canvasComposer';

const DEFAULT_ADJUSTMENT: Omit<SlotAdjustment, 'photoId'> = {
  zoom: 1,
  panX: 0,
  panY: 0,
  fitMode: 'cover',
  rotation: 0,
  flipH: false,
};

function createInitialSlots(): Record<SlotKey, SlotAdjustment> {
  return {
    main: { photoId: 'sample-main', ...DEFAULT_ADJUSTMENT },
    corner: { photoId: 'sample-detail', ...DEFAULT_ADJUSTMENT },
    topLeft: { photoId: 'sample-detail', ...DEFAULT_ADJUSTMENT },
    bottomLeft: { photoId: 'sample-interior', ...DEFAULT_ADJUSTMENT },
    rightHalf: { photoId: 'sample-main', ...DEFAULT_ADJUSTMENT },
  };
}

const SAMPLE_PHOTOS_SEED: PhotoItem[] = [
  {
    id: 'sample-main',
    name: 'front-studio.jpg',
    url: sampleMainUrl,
    width: 1024,
    height: 1024,
    isSample: true,
  },
  {
    id: 'sample-detail',
    name: 'brass-clasp.jpg',
    url: sampleDetailUrl,
    width: 1024,
    height: 1024,
    isSample: true,
  },
  {
    id: 'sample-interior',
    name: 'open-interior.jpg',
    url: sampleInteriorUrl,
    width: 1024,
    height: 1024,
    isSample: true,
  },
];

async function readImageDimensions(
  url: string,
): Promise<{ width: number; height: number }> {
  const img = await loadImageElement(url);
  return {
    width: img.naturalWidth || 1024,
    height: img.naturalHeight || 1024,
  };
}

export default function App() {
  const [format, setFormat] = useState<CoverFormat>('corner-inset');
  const [activeSlot, setActiveSlot] = useState<SlotKey>('main');
  const [photos, setPhotos] = useState<PhotoItem[]>(SAMPLE_PHOTOS_SEED);
  const [slots, setSlots] = useState<Record<SlotKey, SlotAdjustment>>(
    createInitialSlots,
  );

  const [cornerConfig, setCornerConfig] = useState<CornerLayoutConfig>({
    cornerSizePct: 38,
    posX: 2.5,
    posY: 59.5,
    borderPx: 14,
    borderColor: '#FFFFFF',
    borderRadiusPx: 12,
    shadow: true,
  });

  const handleUpdateCornerConfig = useCallback(
    (patch: Partial<CornerLayoutConfig>) => {
      setCornerConfig((prev) => {
        const next = { ...prev, ...patch };
        const maxOffset = Math.max(0, 100 - next.cornerSizePct);
        return {
          ...next,
          posX: Math.max(0, Math.min(maxOffset, next.posX)),
          posY: Math.max(0, Math.min(maxOffset, next.posY)),
        };
      });
    },
    [],
  );

  const [splitConfig, setSplitConfig] = useState<SplitLayoutConfig>({
    gapPx: 14,
    outerMarginPx: 0,
    backgroundColor: '#FFFFFF',
    cornerRadiusPx: 0,
  });

  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    resolution: 2048,
    format: 'image/jpeg',
    jpegQuality: 95,
    fileName: 'listing-cover',
  });

  const [textOverlays, setTextOverlays] = useState<TextOverlayItem[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  const [estimatedBytes, setEstimatedBytes] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedState, setCopiedState] = useState(false);
  const [previewModalData, setPreviewModalData] = useState<{
    url: string;
    bytes: number;
  } | null>(null);

  const blobUrlsRef = useRef<Set<string>>(new Set());

  // Probe true natural dimensions for sample photos
  useEffect(() => {
    let active = true;
    Promise.all(
      SAMPLE_PHOTOS_SEED.map(async (item) => {
        try {
          const dims = await readImageDimensions(item.url);
          return { ...item, ...dims };
        } catch {
          return item;
        }
      }),
    ).then((resolved) => {
      if (!active) return;
      setPhotos((prev) =>
        prev.map((p) => {
          const match = resolved.find((r) => r.id === p.id);
          return match && p.isSample ? { ...p, width: match.width, height: match.height } : p;
        }),
      );
    });
    return () => {
      active = false;
    };
  }, []);

  // Revoke any created object URLs on unmount
  useEffect(() => {
    const urls = blobUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const activeFormatSlots = useMemo(() => getSlotsForFormat(format), [format]);

  const hasAnyPhotoInActiveFormat = useMemo(
    () =>
      activeFormatSlots.some((key) => {
        const pid = slots[key].photoId;
        return pid !== null && photos.some((p) => p.id === pid);
      }),
    [activeFormatSlots, slots, photos],
  );

  // Debounced live file-size estimation
  useEffect(() => {
    if (!hasAnyPhotoInActiveFormat) {
      setEstimatedBytes(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const canvas = await renderCoverToCanvas({
          size: exportConfig.resolution,
          format,
          cornerConfig,
          splitConfig,
          slots,
          photos,
          textOverlays,
        });
        if (cancelled) return;
        const blob = await canvasToBlob(
          canvas,
          exportConfig.format,
          exportConfig.jpegQuality,
        );
        if (!cancelled) {
          setEstimatedBytes(blob.size);
        }
      } catch {
        if (!cancelled) setEstimatedBytes(null);
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    format,
    cornerConfig,
    splitConfig,
    slots,
    photos,
    textOverlays,
    exportConfig.resolution,
    exportConfig.format,
    exportConfig.jpegQuality,
    hasAnyPhotoInActiveFormat,
  ]);

  const handleFormatChange = (nextFormat: CoverFormat) => {
    setFormat(nextFormat);
    const nextSlots = getSlotsForFormat(nextFormat);
    if (!nextSlots.includes(activeSlot)) {
      setActiveSlot(nextSlots[0]);
    }
  };

  const handleUploadFiles = useCallback(
    async (fileList: FileList | File[], targetSlot?: SlotKey) => {
      const files = Array.from(fileList).filter((f) =>
        f.type.startsWith('image/'),
      );
      if (files.length === 0) return;

      const created: PhotoItem[] = await Promise.all(
        files.map(async (file, index) => {
          const url = URL.createObjectURL(file);
          blobUrlsRef.current.add(url);
          let width = 1024;
          let height = 1024;
          try {
            const dims = await readImageDimensions(url);
            width = dims.width;
            height = dims.height;
          } catch {
            // Fallback dimensions
          }
          return {
            id: `photo-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name || `photo-${index + 1}.jpg`,
            url,
            width,
            height,
            isSample: false,
          };
        }),
      );

      setPhotos((prevPhotos) => {
        const onlySamples = prevPhotos.length > 0 && prevPhotos.every((p) => p.isSample);
        const nextList = onlySamples ? created : [...prevPhotos, ...created];

        setSlots((prevSlots) => {
          const updated = { ...prevSlots };

          // Clear sample photo assignments if transitioning from sample set to user uploads
          if (onlySamples) {
            (['main', 'corner', 'topLeft', 'bottomLeft', 'rightHalf'] as SlotKey[]).forEach(
              (k) => {
                updated[k] = { ...DEFAULT_ADJUSTMENT, photoId: null };
              },
            );
          }

          if (targetSlot) {
            updated[targetSlot] = {
              ...DEFAULT_ADJUSTMENT,
              photoId: created[0].id,
            };
            // Assign remaining uploaded files to empty slots in active format
            const remaining = created.slice(1);
            let rIdx = 0;
            for (const sKey of getSlotsForFormat(format)) {
              if (sKey !== targetSlot && !updated[sKey].photoId && remaining[rIdx]) {
                updated[sKey] = {
                  ...DEFAULT_ADJUSTMENT,
                  photoId: remaining[rIdx].id,
                };
                rIdx++;
              }
            }
          } else {
            // Fill empty slots across both formats sensibly
            const currentFormatKeys = getSlotsForFormat(format);
            let cIdx = 0;
            for (const sKey of currentFormatKeys) {
              if (!updated[sKey].photoId && created[cIdx]) {
                updated[sKey] = {
                  ...DEFAULT_ADJUSTMENT,
                  photoId: created[cIdx].id,
                };
                cIdx++;
              }
            }

            // Also seed the alternate format if it is currently empty
            const altFormatKeys = getSlotsForFormat(
              format === 'corner-inset' ? 'three-split' : 'corner-inset',
            );
            let aIdx = 0;
            for (const sKey of altFormatKeys) {
              const source = nextList[aIdx];
              if (!updated[sKey].photoId && source) {
                updated[sKey] = {
                  ...DEFAULT_ADJUSTMENT,
                  photoId: source.id,
                };
                aIdx++;
              }
            }
          }

          return updated;
        });

        return nextList;
      });

      if (targetSlot) {
        setActiveSlot(targetSlot);
      }
    },
    [format],
  );

  // Support pasting images from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        handleUploadFiles(imageFiles);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleUploadFiles]);

  const handleAssignPhotoToSlot = (slot: SlotKey, photoId: string) => {
    setSlots((prev) => ({
      ...prev,
      [slot]: {
        ...DEFAULT_ADJUSTMENT,
        photoId,
      },
    }));
  };

  const handleUpdateSlot = (slot: SlotKey, patch: Partial<SlotAdjustment>) => {
    setSlots((prev) => ({
      ...prev,
      [slot]: { ...prev[slot], ...patch },
    }));
  };

  const handleResetSlot = (slot: SlotKey) => {
    setSlots((prev) => ({
      ...prev,
      [slot]: {
        ...DEFAULT_ADJUSTMENT,
        photoId: prev[slot].photoId,
      },
    }));
  };

  const handleSwapSlots = (slotA: SlotKey, slotB: SlotKey) => {
    setSlots((prev) => ({
      ...prev,
      [slotA]: { ...prev[slotB] },
      [slotB]: { ...prev[slotA] },
    }));
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === photoId);
      if (target && !target.isSample && blobUrlsRef.current.has(target.url)) {
        URL.revokeObjectURL(target.url);
        blobUrlsRef.current.delete(target.url);
      }
      return prev.filter((p) => p.id !== photoId);
    });

    setSlots((prev) => {
      const next = { ...prev };
      (Object.keys(next) as SlotKey[]).forEach((k) => {
        if (next[k].photoId === photoId) {
          next[k] = { ...DEFAULT_ADJUSTMENT, photoId: null };
        }
      });
      return next;
    });
  };

  const handleAutoFill = () => {
    if (photos.length === 0) return;
    setSlots((prev) => {
      const next = { ...prev };
      const keys = getSlotsForFormat(format);
      keys.forEach((key, idx) => {
        const photo = photos[idx % photos.length];
        next[key] = { ...DEFAULT_ADJUSTMENT, photoId: photo.id };
      });
      return next;
    });
  };

  const handleLoadSamples = () => {
    setPhotos((prev) => {
      prev.forEach((p) => {
        if (!p.isSample && blobUrlsRef.current.has(p.url)) {
          URL.revokeObjectURL(p.url);
          blobUrlsRef.current.delete(p.url);
        }
      });
      return SAMPLE_PHOTOS_SEED;
    });
    setSlots(createInitialSlots());
  };

  const handleClearAll = () => {
    setPhotos((prev) => {
      prev.forEach((p) => {
        if (!p.isSample && blobUrlsRef.current.has(p.url)) {
          URL.revokeObjectURL(p.url);
          blobUrlsRef.current.delete(p.url);
        }
      });
      return [];
    });
    setSlots({
      main: { ...DEFAULT_ADJUSTMENT, photoId: null },
      corner: { ...DEFAULT_ADJUSTMENT, photoId: null },
      topLeft: { ...DEFAULT_ADJUSTMENT, photoId: null },
      bottomLeft: { ...DEFAULT_ADJUSTMENT, photoId: null },
      rightHalf: { ...DEFAULT_ADJUSTMENT, photoId: null },
    });
  };

  const handleAddTextOverlay = useCallback(
    (text: string, posX?: number, posY?: number) => {
      const id = `text-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const offsetStep = (textOverlays.length % 4) * 8;
      const newItem: TextOverlayItem = {
        id,
        text,
        posX: posX ?? 82,
        posY: posY ?? Math.min(86, 12 + offsetStep),
        fontSizePx: 120,
        fontFamily: 'sans',
        color: '#FFFFFF',
        backgroundColor: '#DC2626',
        fontWeight: 700,
      };
      setTextOverlays((prev) => [...prev, newItem]);
      setSelectedTextId(id);
    },
    [textOverlays.length],
  );

  const handleUpdateTextOverlay = useCallback(
    (id: string, patch: Partial<TextOverlayItem>) => {
      setTextOverlays((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const handleRemoveTextOverlay = useCallback((id: string) => {
    setTextOverlays((prev) => {
      const next = prev.filter((item) => item.id !== id);
      setSelectedTextId((curr) => (curr === id ? next[0]?.id ?? null : curr));
      return next;
    });
  }, []);

  const handleDownload = async () => {
    if (!hasAnyPhotoInActiveFormat || isExporting) return;
    setIsExporting(true);
    try {
      const canvas = await renderCoverToCanvas({
        size: exportConfig.resolution,
        format,
        cornerConfig,
        splitConfig,
        slots,
        photos,
        textOverlays,
      });
      const blob = await canvasToBlob(
        canvas,
        exportConfig.format,
        exportConfig.jpegQuality,
      );
      const url = URL.createObjectURL(blob);
      const cleanName = (exportConfig.fileName || 'listing-cover')
        .trim()
        .replace(/\.(jpe?g|png)$/i, '');
      const ext = exportConfig.format === 'image/jpeg' ? 'jpg' : 'png';
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${cleanName}-${exportConfig.resolution}px.${ext}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleInspectFullSize = async () => {
    if (!hasAnyPhotoInActiveFormat || isExporting) return;
    setIsExporting(true);
    try {
      const canvas = await renderCoverToCanvas({
        size: exportConfig.resolution,
        format,
        cornerConfig,
        splitConfig,
        slots,
        photos,
        textOverlays,
      });
      const blob = await canvasToBlob(
        canvas,
        exportConfig.format,
        exportConfig.jpegQuality,
      );
      const url = URL.createObjectURL(blob);
      setPreviewModalData((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { url, bytes: blob.size };
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyPng = async () => {
    if (!hasAnyPhotoInActiveFormat || isExporting) return;
    setIsExporting(true);
    try {
      const canvas = await renderCoverToCanvas({
        size: exportConfig.resolution,
        format,
        cornerConfig,
        splitConfig,
        slots,
        photos,
        textOverlays,
      });
      const blob = await canvasToBlob(canvas, 'image/png', 100);
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopiedState(true);
        window.setTimeout(() => setCopiedState(false), 2000);
      }
    } catch {
      // Fallback gracefully if clipboard permission is blocked in iframe
      await handleDownload();
    } finally {
      setIsExporting(false);
    }
  };

  const slotAssignments: Partial<Record<SlotKey, string | null>> = {
    main: slots.main.photoId,
    corner: slots.corner.photoId,
    topLeft: slots.topLeft.photoId,
    bottomLeft: slots.bottomLeft.photoId,
    rightHalf: slots.rightHalf.photoId,
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f7f5] text-zinc-900">
      {/* 3-Zone Top Bar */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-6 py-3.5">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#canvas-stage"
            className="font-display text-lg font-bold tracking-tight text-zinc-900 whitespace-nowrap shrink-0"
          >
            SquareCover
          </a>

          {/* Zone 2: Concise single-line navigation controls */}
          <nav
            aria-label="Studio sections"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600"
          >
            <button
              type="button"
              onClick={() => handleFormatChange('corner-inset')}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-zinc-900 ${
                format === 'corner-inset'
                  ? 'text-zinc-900 underline decoration-2 underline-offset-8'
                  : ''
              }`}
            >
              Corner Inset
            </button>
            <button
              type="button"
              onClick={() => handleFormatChange('three-split')}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-zinc-900 ${
                format === 'three-split'
                  ? 'text-zinc-900 underline decoration-2 underline-offset-8'
                  : ''
              }`}
            >
              Half Split
            </button>
            <a
              href="#photo-tray"
              className="transition-colors whitespace-nowrap shrink-0 hover:text-zinc-900"
            >
              Photo Tray
            </a>
            <a
              href="#export-panel"
              className="transition-colors whitespace-nowrap shrink-0 hover:text-zinc-900"
            >
              Export
            </a>
          </nav>

          {/* Zone 3: Primary CTA */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              disabled={!hasAnyPhotoInActiveFormat || isExporting}
              onClick={handleDownload}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-40 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              {isExporting ? 'Exporting...' : 'Download Cover'}
            </button>
          </div>
        </div>
      </header>

      {/* Main 3-Column Studio Workbench */}
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[290px_minmax(0,1fr)_310px] lg:items-start">
          {/* Left Rail: Format Selector + Photo Tray */}
          <div className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-5">
            <FormatSelector format={format} onChange={handleFormatChange} />
            <div className="border-t border-zinc-200" />
            <PhotoTray
              photos={photos}
              activeSlot={activeSlot}
              slotAssignments={slotAssignments}
              activeFormatSlots={activeFormatSlots}
              onUploadFiles={(files) => handleUploadFiles(files)}
              onAssignPhotoToActiveSlot={(photoId) =>
                handleAssignPhotoToSlot(activeSlot, photoId)
              }
              onRemovePhoto={handleRemovePhoto}
              onAutoFill={handleAutoFill}
              onLoadSamples={handleLoadSamples}
              onClearAll={handleClearAll}
            />
          </div>

          {/* Center Stage: Dominant 1:1 Square Cover Canvas */}
          <div className="flex flex-col items-center justify-start py-1 lg:py-2">
            <SquareCanvasStage
              format={format}
              cornerConfig={cornerConfig}
              splitConfig={splitConfig}
              slots={slots}
              photos={photos}
              activeSlot={activeSlot}
              textOverlays={textOverlays}
              selectedTextId={selectedTextId}
              onSelectSlot={setActiveSlot}
              onUpdateSlot={handleUpdateSlot}
              onUpdateCornerConfig={handleUpdateCornerConfig}
              onResetSlot={handleResetSlot}
              onAssignPhotoToSlot={handleAssignPhotoToSlot}
              onSwapSlots={handleSwapSlots}
              onUploadFilesToSlot={(slot, files) => handleUploadFiles(files, slot)}
              onSelectTextOverlay={setSelectedTextId}
              onUpdateTextOverlay={handleUpdateTextOverlay}
              onDropNewTextOverlay={(text, posX, posY) =>
                handleAddTextOverlay(text, posX, posY)
              }
            />
          </div>

          {/* Right Inspector: Layout Geometry, Text Overlay & Square Export */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <InspectorPanel
              format={format}
              cornerConfig={cornerConfig}
              splitConfig={splitConfig}
              exportConfig={exportConfig}
              textOverlays={textOverlays}
              selectedTextId={selectedTextId}
              estimatedBytes={estimatedBytes}
              isExporting={isExporting}
              copiedState={copiedState}
              hasAnyPhoto={hasAnyPhotoInActiveFormat}
              onChangeCornerConfig={handleUpdateCornerConfig}
              onChangeSplitConfig={(patch) =>
                setSplitConfig((prev) => ({ ...prev, ...patch }))
              }
              onChangeExportConfig={(patch) =>
                setExportConfig((prev) => ({ ...prev, ...patch }))
              }
              onSelectTextOverlay={setSelectedTextId}
              onAddTextOverlay={(text) => handleAddTextOverlay(text)}
              onUpdateTextOverlay={handleUpdateTextOverlay}
              onRemoveTextOverlay={handleRemoveTextOverlay}
              onDownload={handleDownload}
              onInspectFullSize={handleInspectFullSize}
              onCopyPng={handleCopyPng}
            />
          </div>
        </div>
      </main>

      <FullPreviewModal
        previewUrl={previewModalData?.url ?? null}
        previewBytes={previewModalData?.bytes ?? null}
        exportConfig={exportConfig}
        onClose={() => {
          setPreviewModalData((prev) => {
            if (prev) URL.revokeObjectURL(prev.url);
            return null;
          });
        }}
        onDownload={handleDownload}
      />
    </div>
  );
}
