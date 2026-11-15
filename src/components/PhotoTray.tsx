import React, { useRef, useState } from 'react';
import { ImagePlus, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { PhotoItem, SlotKey } from '../types/cover';
import { getSlotLabel } from '../utils/canvasComposer';

interface PhotoTrayProps {
  photos: PhotoItem[];
  activeSlot: SlotKey;
  slotAssignments: Partial<Record<SlotKey, string | null>>;
  activeFormatSlots: SlotKey[];
  onUploadFiles: (files: FileList | File[]) => void;
  onAssignPhotoToActiveSlot: (photoId: string) => void;
  onRemovePhoto: (photoId: string) => void;
  onAutoFill: () => void;
  onLoadSamples: () => void;
  onClearAll: () => void;
}

export function PhotoTray({
  photos,
  activeSlot,
  slotAssignments,
  activeFormatSlots,
  onUploadFiles,
  onAssignPhotoToActiveSlot,
  onRemovePhoto,
  onAutoFill,
  onLoadSamples,
  onClearAll,
}: PhotoTrayProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFiles(e.dataTransfer.files);
    }
  };

  const getUsedInSlots = (photoId: string): string[] => {
    return activeFormatSlots
      .filter((key) => slotAssignments[key] === photoId)
      .map((key) => getSlotLabel(key));
  };

  return (
    <section
      id="photo-tray"
      aria-labelledby="photo-tray-heading"
      className="flex flex-1 flex-col min-h-0 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h2 id="photo-tray-heading" className="text-sm font-semibold text-zinc-900">
            Photo Tray
          </h2>
          <span className="font-mono text-xs text-zinc-500 tabular-nums">
            {photos.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {photos.length > 0 && (
            <button
              type="button"
              onClick={onAutoFill}
              title="Fill all active slots from tray photos"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Auto-fill
            </button>
          )}
          {photos.length > 0 ? (
            <button
              type="button"
              onClick={onClearAll}
              title="Clear uploaded photos"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Clear
            </button>
          ) : (
            <button
              type="button"
              onClick={onLoadSamples}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              Load samples
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onUploadFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-3 py-4 text-center transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
          isDragOver
            ? 'border-blue-600 bg-blue-50/70 text-blue-700'
            : 'border-zinc-300 bg-zinc-50/60 text-zinc-600 hover:border-zinc-400 hover:bg-zinc-100/70'
        }`}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-zinc-200 text-zinc-700 shadow-2xs">
          <Upload className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="text-xs font-medium text-zinc-800">
          Add product photos
        </div>
        <div className="text-[11px] text-zinc-500">
          Drop multiple files or click to browse
        </div>
      </button>

      <div className="text-[11px] text-zinc-500 leading-snug">
        Click a photo to place into{' '}
        <span className="font-medium text-zinc-800">{getSlotLabel(activeSlot)}</span>,
        or drag directly onto any canvas slot.
      </div>

      {photos.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50/50 p-6 text-center">
          <ImagePlus className="h-6 w-6 text-zinc-400 mb-2" aria-hidden="true" />
          <p className="text-xs font-medium text-zinc-700">No photos in tray</p>
          <p className="mt-1 text-[11px] text-zinc-500">
            Upload your product angles or load the sample bag set.
          </p>
          <button
            type="button"
            onClick={onLoadSamples}
            className="mt-3 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 transition-colors"
          >
            Load sample product set
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-0.5 max-h-[340px] lg:max-h-[calc(100vh-410px)]">
          {photos.map((photo) => {
            const usedIn = getUsedInSlots(photo.id);
            const isAssignedToActive = slotAssignments[activeSlot] === photo.id;

            return (
              <div
                key={photo.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-squarecover-photo', photo.id);
                  e.dataTransfer.effectAllowed = 'copyMove';
                }}
                className={`group relative overflow-hidden rounded-lg border bg-white transition-all duration-150 ${
                  isAssignedToActive
                    ? 'border-blue-600 ring-1 ring-blue-600'
                    : 'border-zinc-200 hover:border-zinc-400'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onAssignPhotoToActiveSlot(photo.id)}
                  className="block w-full text-left focus-visible:outline-2 focus-visible:outline-blue-600"
                  title={`Assign ${photo.name} to ${getSlotLabel(activeSlot)}`}
                >
                  <div className="aspect-square w-full overflow-hidden bg-zinc-100">
                    <img
                      src={photo.url}
                      alt={photo.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-150 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="px-2 py-1.5">
                    <div className="truncate text-[11px] font-medium text-zinc-800">
                      {photo.name}
                    </div>
                    <div className="flex items-center justify-between gap-1 text-[10px] text-zinc-500">
                      <span className="font-mono tabular-nums">
                        {photo.width}×{photo.height}
                      </span>
                      {usedIn.length > 0 && (
                        <span className="truncate font-medium text-blue-600">
                          {usedIn.length === 1 ? usedIn[0] : `${usedIn.length} slots`}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePhoto(photo.id);
                  }}
                  aria-label={`Remove ${photo.name}`}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-zinc-900/75 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-zinc-900"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
