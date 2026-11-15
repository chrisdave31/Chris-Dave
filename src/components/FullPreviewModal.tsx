import { useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { ExportConfig } from '../types/cover';
import { formatBytes } from '../utils/canvasComposer';

interface FullPreviewModalProps {
  previewUrl: string | null;
  previewBytes: number | null;
  exportConfig: ExportConfig;
  onClose: () => void;
  onDownload: () => void;
}

export function FullPreviewModal({
  previewUrl,
  previewBytes,
  exportConfig,
  onClose,
  onDownload,
}: FullPreviewModalProps) {
  useEffect(() => {
    if (!previewUrl) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [previewUrl, onClose]);

  if (!previewUrl) return null;

  const ext = exportConfig.format === 'image/jpeg' ? 'JPG' : 'PNG';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rendered Cover Photo Preview"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 sm:p-8 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3.5">
          <div className="flex items-baseline gap-2.5">
            <h3 className="text-sm font-semibold text-zinc-900">
              Rendered Square Cover
            </h3>
            <span className="font-mono text-xs text-zinc-500 tabular-nums">
              {exportConfig.resolution} × {exportConfig.resolution} px · {ext}
              {previewBytes ? ` · ${formatBytes(previewBytes)}` : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center bg-zinc-100 p-6 overflow-auto">
          <img
            src={previewUrl}
            alt="Rendered square cover preview"
            referrerPolicy="no-referrer"
            className="aspect-square max-h-[70vh] w-auto rounded-xs shadow-lg ring-1 ring-zinc-900/10"
          />
        </div>
      </div>
    </div>
  );
}
