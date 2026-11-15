import { Check, Copy, Download, Eye, Plus, Trash2, Type } from 'lucide-react';
import {
  CornerLayoutConfig,
  CoverFormat,
  ExportConfig,
  ExportResolution,
  SplitLayoutConfig,
  TextFontFamily,
  TextOverlayItem,
} from '../types/cover';
import { formatBytes } from '../utils/canvasComposer';

interface InspectorPanelProps {
  format: CoverFormat;
  cornerConfig: CornerLayoutConfig;
  splitConfig: SplitLayoutConfig;
  exportConfig: ExportConfig;
  textOverlays: TextOverlayItem[];
  selectedTextId: string | null;
  estimatedBytes: number | null;
  isExporting: boolean;
  copiedState: boolean;
  hasAnyPhoto: boolean;
  onChangeCornerConfig: (patch: Partial<CornerLayoutConfig>) => void;
  onChangeSplitConfig: (patch: Partial<SplitLayoutConfig>) => void;
  onChangeExportConfig: (patch: Partial<ExportConfig>) => void;
  onSelectTextOverlay: (id: string | null) => void;
  onAddTextOverlay: (text: string) => void;
  onUpdateTextOverlay: (id: string, patch: Partial<TextOverlayItem>) => void;
  onRemoveTextOverlay: (id: string) => void;
  onDownload: () => void;
  onInspectFullSize: () => void;
  onCopyPng: () => void;
}

const RESOLUTIONS: { value: ExportResolution; label: string }[] = [
  { value: 1080, label: '1080 × 1080' },
  { value: 1600, label: '1600 × 1600' },
  { value: 2048, label: '2048 × 2048' },
  { value: 3000, label: '3000 × 3000' },
];

const COLOR_PRESETS = [
  { label: 'Pure White', value: '#FFFFFF' },
  { label: 'Warm Chalk', value: '#F5F5F4' },
  { label: 'Cool Mist', value: '#E4E4E7' },
  { label: 'Natural Oak', value: '#C69C6D' },
  { label: 'Warm Walnut', value: '#8B5A2B' },
  { label: 'Dark Espresso', value: '#4A2C18' },
  { label: 'Jet Black', value: '#111111' },
];

const TEXT_COLOR_PRESETS = [
  { label: 'Pure White', value: '#FFFFFF' },
  { label: 'Jet Black', value: '#111111' },
  { label: 'Crimson Red', value: '#DC2626' },
  { label: 'Cobalt Blue', value: '#2563EB' },
  { label: 'Amber Gold', value: '#D97706' },
  { label: 'Forest Green', value: '#15803D' },
  { label: 'Warm Walnut', value: '#8B5A2B' },
];

const TEXT_QUICK_TAGS = ['SALE', 'NEW', 'BUNDLE', 'LIMITED'];

const TEXT_BACKDROP_OPTIONS: { label: string; value: string | null }[] = [
  { label: 'None', value: null },
  { label: 'Dark', value: '#18181B' },
  { label: 'White', value: '#FFFFFF' },
  { label: 'Red', value: '#DC2626' },
];

export function InspectorPanel({
  format,
  cornerConfig,
  splitConfig,
  exportConfig,
  textOverlays,
  selectedTextId,
  estimatedBytes,
  isExporting,
  copiedState,
  hasAnyPhoto,
  onChangeCornerConfig,
  onChangeSplitConfig,
  onChangeExportConfig,
  onSelectTextOverlay,
  onAddTextOverlay,
  onUpdateTextOverlay,
  onRemoveTextOverlay,
  onDownload,
  onInspectFullSize,
  onCopyPng,
}: InspectorPanelProps) {
  const activeText =
    textOverlays.find((item) => item.id === selectedTextId) ??
    textOverlays[0] ??
    null;
  return (
    <aside
      id="export-panel"
      aria-label="Layout and Export Settings"
      className="flex flex-col gap-6"
    >
      {/* Section 1: Layout Geometry */}
      <section aria-labelledby="geometry-heading" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 id="geometry-heading" className="text-sm font-semibold text-zinc-900">
            {format === 'corner-inset' ? 'Corner Inset Style' : 'Split Grid Style'}
          </h2>
          <span className="text-xs text-zinc-500">
            {format === 'corner-inset' ? '2-photo' : '3-photo'}
          </span>
        </div>

        {format === 'corner-inset' ? (
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-700">Quick Placement</span>
                <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
                  {Math.round(cornerConfig.posX)}%, {Math.round(cornerConfig.posY)}%
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {(() => {
                  const max = Math.max(0, 100 - cornerConfig.cornerSizePct);
                  const m = Math.min(2.5, max / 2);
                  const far = Math.max(0, max - m);
                  const presets = [
                    { label: 'BL', title: 'Bottom-Left', x: m, y: far },
                    { label: 'BR', title: 'Bottom-Right', x: far, y: far },
                    { label: 'TL', title: 'Top-Left', x: m, y: m },
                    { label: 'TR', title: 'Top-Right', x: far, y: m },
                    { label: 'Ctr', title: 'Center', x: max / 2, y: max / 2 },
                  ];
                  return presets.map((p) => {
                    const isActive =
                      Math.abs(cornerConfig.posX - p.x) < 0.6 &&
                      Math.abs(cornerConfig.posY - p.y) < 0.6;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        title={p.title}
                        onClick={() =>
                          onChangeCornerConfig({
                            posX: Number(p.x.toFixed(2)),
                            posY: Number(p.y.toFixed(2)),
                          })
                        }
                        className={`rounded-md border py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                          isActive
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="corner-pos-x" className="font-medium text-zinc-700">
                    X Position
                  </label>
                  <span className="font-mono text-[11px] text-zinc-600 tabular-nums">
                    {Math.round(cornerConfig.posX)}%
                  </span>
                </div>
                <input
                  id="corner-pos-x"
                  type="range"
                  min={0}
                  max={Math.max(0, 100 - cornerConfig.cornerSizePct)}
                  step={0.5}
                  value={Math.min(cornerConfig.posX, Math.max(0, 100 - cornerConfig.cornerSizePct))}
                  onChange={(e) =>
                    onChangeCornerConfig({ posX: Number(e.target.value) })
                  }
                  className="studio-slider w-full"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="corner-pos-y" className="font-medium text-zinc-700">
                    Y Position
                  </label>
                  <span className="font-mono text-[11px] text-zinc-600 tabular-nums">
                    {Math.round(cornerConfig.posY)}%
                  </span>
                </div>
                <input
                  id="corner-pos-y"
                  type="range"
                  min={0}
                  max={Math.max(0, 100 - cornerConfig.cornerSizePct)}
                  step={0.5}
                  value={Math.min(cornerConfig.posY, Math.max(0, 100 - cornerConfig.cornerSizePct))}
                  onChange={(e) =>
                    onChangeCornerConfig({ posY: Number(e.target.value) })
                  }
                  className="studio-slider w-full"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="corner-size" className="font-medium text-zinc-700">
                  Inset Size
                </label>
                <span className="font-mono text-zinc-600 tabular-nums">
                  {cornerConfig.cornerSizePct}%
                </span>
              </div>
              <input
                id="corner-size"
                type="range"
                min={20}
                max={60}
                step={1}
                value={cornerConfig.cornerSizePct}
                onChange={(e) =>
                  onChangeCornerConfig({ cornerSizePct: Number(e.target.value) })
                }
                className="studio-slider w-full"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="corner-border" className="font-medium text-zinc-700">
                  Frame Border
                </label>
                <span className="font-mono text-zinc-600 tabular-nums">
                  {cornerConfig.borderPx} px
                </span>
              </div>
              <input
                id="corner-border"
                type="range"
                min={0}
                max={32}
                step={2}
                value={cornerConfig.borderPx}
                onChange={(e) =>
                  onChangeCornerConfig({ borderPx: Number(e.target.value) })
                }
                className="studio-slider w-full"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="corner-radius" className="font-medium text-zinc-700">
                  Corner Radius
                </label>
                <span className="font-mono text-zinc-600 tabular-nums">
                  {cornerConfig.borderRadiusPx} px
                </span>
              </div>
              <input
                id="corner-radius"
                type="range"
                min={0}
                max={48}
                step={4}
                value={cornerConfig.borderRadiusPx}
                onChange={(e) =>
                  onChangeCornerConfig({ borderRadiusPx: Number(e.target.value) })
                }
                className="studio-slider w-full"
              />
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-700">Border Color</span>
                <span className="font-mono text-[11px] text-zinc-500 uppercase tabular-nums">
                  {cornerConfig.borderColor}
                </span>
              </div>
              <div className="grid grid-cols-8 gap-1.5">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    title={preset.label}
                    aria-label={`Set border color to ${preset.label}`}
                    onClick={() => onChangeCornerConfig({ borderColor: preset.value })}
                    className={`h-7 w-full rounded-md border transition-transform ${
                      cornerConfig.borderColor.toUpperCase() === preset.value
                        ? 'scale-105 border-blue-600 ring-2 ring-blue-600/30'
                        : 'border-zinc-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset.value }}
                  />
                ))}
                <label
                  title="Custom border color"
                  className="relative flex h-7 w-full cursor-pointer items-center justify-center overflow-hidden rounded-md border border-zinc-300 bg-white text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  <input
                    type="color"
                    aria-label="Custom border color"
                    value={cornerConfig.borderColor}
                    onChange={(e) =>
                      onChangeCornerConfig({ borderColor: e.target.value })
                    }
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                  <span>+</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label htmlFor="corner-shadow" className="text-xs font-medium text-zinc-700">
                Drop Shadow
              </label>
              <button
                id="corner-shadow"
                type="button"
                role="switch"
                aria-checked={cornerConfig.shadow}
                onClick={() => onChangeCornerConfig({ shadow: !cornerConfig.shadow })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  cornerConfig.shadow ? 'bg-zinc-900' : 'bg-zinc-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-150 ${
                    cornerConfig.shadow ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="split-gap" className="font-medium text-zinc-700">
                  Divider Gap
                </label>
                <span className="font-mono text-zinc-600 tabular-nums">
                  {splitConfig.gapPx === 0 ? 'Seamless' : `${splitConfig.gapPx} px`}
                </span>
              </div>
              <input
                id="split-gap"
                type="range"
                min={0}
                max={48}
                step={2}
                value={splitConfig.gapPx}
                onChange={(e) =>
                  onChangeSplitConfig({ gapPx: Number(e.target.value) })
                }
                className="studio-slider w-full"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="split-margin" className="font-medium text-zinc-700">
                  Outer Frame
                </label>
                <span className="font-mono text-zinc-600 tabular-nums">
                  {splitConfig.outerMarginPx} px
                </span>
              </div>
              <input
                id="split-margin"
                type="range"
                min={0}
                max={48}
                step={2}
                value={splitConfig.outerMarginPx}
                onChange={(e) =>
                  onChangeSplitConfig({ outerMarginPx: Number(e.target.value) })
                }
                className="studio-slider w-full"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="split-radius" className="font-medium text-zinc-700">
                  Tile Radius
                </label>
                <span className="font-mono text-zinc-600 tabular-nums">
                  {splitConfig.cornerRadiusPx} px
                </span>
              </div>
              <input
                id="split-radius"
                type="range"
                min={0}
                max={32}
                step={4}
                value={splitConfig.cornerRadiusPx}
                onChange={(e) =>
                  onChangeSplitConfig({ cornerRadiusPx: Number(e.target.value) })
                }
                className="studio-slider w-full"
              />
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-700">Backdrop & Gap</span>
                <span className="font-mono text-[11px] text-zinc-500 uppercase tabular-nums">
                  {splitConfig.backgroundColor}
                </span>
              </div>
              <div className="grid grid-cols-8 gap-1.5">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    title={preset.label}
                    aria-label={`Set divider color to ${preset.label}`}
                    onClick={() =>
                      onChangeSplitConfig({ backgroundColor: preset.value })
                    }
                    className={`h-7 w-full rounded-md border transition-transform ${
                      splitConfig.backgroundColor.toUpperCase() === preset.value
                        ? 'scale-105 border-blue-600 ring-2 ring-blue-600/30'
                        : 'border-zinc-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset.value }}
                  />
                ))}
                <label
                  title="Custom backdrop color"
                  className="relative flex h-7 w-full cursor-pointer items-center justify-center overflow-hidden rounded-md border border-zinc-300 bg-white text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  <input
                    type="color"
                    aria-label="Custom backdrop color"
                    value={splitConfig.backgroundColor}
                    onChange={(e) =>
                      onChangeSplitConfig({ backgroundColor: e.target.value })
                    }
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                  <span>+</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Hairline divider */}
      <div className="border-t border-zinc-200" />

      {/* Section 2: Text Overlay */}
      <section aria-labelledby="text-overlay-heading" className="space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Type className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
            <h2 id="text-overlay-heading" className="text-sm font-semibold text-zinc-900">
              Text Overlay
            </h2>
          </div>
          {textOverlays.length > 0 && (
            <button
              type="button"
              onClick={() => onAddTextOverlay('NEW')}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add Label
            </button>
          )}
        </div>

        {/* Active text labels list when 1+ exist */}
        {textOverlays.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {textOverlays.map((item) => {
              const isSelected = activeText?.id === item.id;
              return (
                <div
                  key={item.id}
                  className={`inline-flex items-center rounded-md border text-xs transition-colors ${
                    isSelected
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectTextOverlay(item.id)}
                    className="max-w-[140px] truncate px-2.5 py-1 font-medium"
                  >
                    {item.text.trim() || 'Untitled'}
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${item.text || 'text label'}`}
                    onClick={() => onRemoveTextOverlay(item.id)}
                    className={`pr-1.5 pl-0.5 py-1 transition-colors ${
                      isSelected
                        ? 'text-zinc-300 hover:text-white'
                        : 'text-zinc-400 hover:text-zinc-900'
                    }`}
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Custom Text Input */}
        <div className="space-y-1.5">
          <label htmlFor="overlay-text-input" className="block text-xs font-medium text-zinc-700">
            Label Text
          </label>
          <input
            id="overlay-text-input"
            type="text"
            value={activeText?.text ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              if (activeText) {
                onUpdateTextOverlay(activeText.id, { text: val });
              } else if (val.length > 0) {
                onAddTextOverlay(val);
              }
            }}
            placeholder="Type text (e.g. SALE, NEW)"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>

        {/* Quick draggable or clickable presets */}
        <div className="space-y-1.5">
          <span className="block text-[11px] text-zinc-500">
            Click to insert or drag onto canvas:
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {TEXT_QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-squarecover-text-preset', tag);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => {
                  if (activeText && activeText.text.trim().length === 0) {
                    onUpdateTextOverlay(activeText.id, { text: tag });
                  } else {
                    onAddTextOverlay(tag);
                  }
                }}
                className="cursor-grab active:cursor-grabbing rounded-md border border-zinc-200 bg-zinc-50 py-1.5 text-[11px] font-semibold tracking-wide text-zinc-800 hover:border-zinc-300 hover:bg-zinc-100 transition-colors whitespace-nowrap shrink-0"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {activeText && (
          <>
            {/* Font Family */}
            <div className="space-y-1.5">
              <label htmlFor="overlay-font-family" className="block text-xs font-medium text-zinc-700">
                Font Family
              </label>
              <select
                id="overlay-font-family"
                value={activeText.fontFamily}
                onChange={(e) =>
                  onUpdateTextOverlay(activeText.id, {
                    fontFamily: e.target.value as TextFontFamily,
                  })
                }
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              >
                <option value="sans">Sans-serif (Plus Jakarta Sans)</option>
                <option value="serif">Serif (Playfair Display)</option>
                <option value="mono">Monospace (JetBrains Mono)</option>
              </select>
            </div>

            {/* Font Size */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="overlay-font-size" className="font-medium text-zinc-700">
                  Font Size
                </label>
                <span className="font-mono text-zinc-600 tabular-nums">
                  {activeText.fontSizePx} px
                </span>
              </div>
              <input
                id="overlay-font-size"
                type="range"
                min={48}
                max={280}
                step={4}
                value={activeText.fontSizePx}
                onChange={(e) =>
                  onUpdateTextOverlay(activeText.id, {
                    fontSizePx: Number(e.target.value),
                  })
                }
                className="studio-slider w-full"
              />
            </div>

            {/* Text Color */}
            <div className="space-y-2 pt-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-700">Text Color</span>
                <span className="font-mono text-[11px] text-zinc-500 uppercase tabular-nums">
                  {activeText.color}
                </span>
              </div>
              <div className="grid grid-cols-8 gap-1.5">
                {TEXT_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    title={preset.label}
                    aria-label={`Set text color to ${preset.label}`}
                    onClick={() =>
                      onUpdateTextOverlay(activeText.id, { color: preset.value })
                    }
                    className={`h-7 w-full rounded-md border transition-transform ${
                      activeText.color.toUpperCase() === preset.value
                        ? 'scale-105 border-blue-600 ring-2 ring-blue-600/30'
                        : 'border-zinc-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset.value }}
                  />
                ))}
                <label
                  title="Custom text color"
                  className="relative flex h-7 w-full cursor-pointer items-center justify-center overflow-hidden rounded-md border border-zinc-300 bg-white text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  <input
                    type="color"
                    aria-label="Custom text color"
                    value={activeText.color}
                    onChange={(e) =>
                      onUpdateTextOverlay(activeText.id, { color: e.target.value })
                    }
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                  <span>+</span>
                </label>
              </div>
            </div>

            {/* Label Tag Backdrop */}
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-zinc-700">
                Label Backdrop
              </span>
              <div className="grid grid-cols-4 gap-1 rounded-lg bg-zinc-100 p-1">
                {TEXT_BACKDROP_OPTIONS.map((opt) => {
                  const isActive = activeText.backgroundColor === opt.value;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        const patch: Partial<TextOverlayItem> = {
                          backgroundColor: opt.value,
                        };
                        if (opt.value === '#FFFFFF' && activeText.color.toUpperCase() === '#FFFFFF') {
                          patch.color = '#111111';
                        } else if (
                          (opt.value === '#18181B' || opt.value === '#DC2626') &&
                          activeText.color.toUpperCase() === '#111111'
                        ) {
                          patch.color = '#FFFFFF';
                        }
                        onUpdateTextOverlay(activeText.id, patch);
                      }}
                      aria-pressed={isActive}
                      className={`rounded-md py-1 text-[11px] font-medium transition-all whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-white text-zinc-900 shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </section>

      {/* Hairline divider */}
      <div className="border-t border-zinc-200" />

      {/* Section 3: Export Settings */}
      <section aria-labelledby="export-heading" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 id="export-heading" className="text-sm font-semibold text-zinc-900">
            Square Export
          </h2>
          <span className="font-mono text-xs text-zinc-500 tabular-nums">
            1:1 Square
          </span>
        </div>

        {/* Resolution selector */}
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-zinc-700">
            Output Resolution
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {RESOLUTIONS.map((res) => (
              <button
                key={res.value}
                type="button"
                onClick={() => onChangeExportConfig({ resolution: res.value })}
                aria-pressed={exportConfig.resolution === res.value}
                className={`rounded-lg border px-2.5 py-2 font-mono text-xs tabular-nums transition-colors ${
                  exportConfig.resolution === res.value
                    ? 'border-zinc-900 bg-zinc-900 text-white font-medium'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
                }`}
              >
                {res.label}
              </button>
            ))}
          </div>
        </div>

        {/* File Format selector */}
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-zinc-700">
            File Format
          </span>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => onChangeExportConfig({ format: 'image/jpeg' })}
              aria-pressed={exportConfig.format === 'image/jpeg'}
              className={`rounded-md py-1.5 text-xs font-medium transition-all ${
                exportConfig.format === 'image/jpeg'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              JPEG (.jpg)
            </button>
            <button
              type="button"
              onClick={() => onChangeExportConfig({ format: 'image/png' })}
              aria-pressed={exportConfig.format === 'image/png'}
              className={`rounded-md py-1.5 text-xs font-medium transition-all ${
                exportConfig.format === 'image/png'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              PNG (.png)
            </button>
          </div>
        </div>

        {/* JPEG Quality */}
        {exportConfig.format === 'image/jpeg' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="jpeg-quality" className="font-medium text-zinc-700">
                JPEG Quality
              </label>
              <span className="font-mono text-zinc-600 tabular-nums">
                {exportConfig.jpegQuality}%
              </span>
            </div>
            <input
              id="jpeg-quality"
              type="range"
              min={80}
              max={100}
              step={1}
              value={exportConfig.jpegQuality}
              onChange={(e) =>
                onChangeExportConfig({ jpegQuality: Number(e.target.value) })
              }
              className="studio-slider w-full"
            />
          </div>
        )}

        {/* File Name */}
        <div className="space-y-1.5">
          <label htmlFor="file-name" className="block text-xs font-medium text-zinc-700">
            File Name
          </label>
          <div className="flex items-center rounded-lg border border-zinc-200 bg-white focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600">
            <input
              id="file-name"
              type="text"
              value={exportConfig.fileName}
              onChange={(e) =>
                onChangeExportConfig({ fileName: e.target.value })
              }
              placeholder="listing-cover"
              className="w-full bg-transparent px-3 py-2 text-xs text-zinc-900 outline-none"
            />
            <span className="pr-3 font-mono text-xs text-zinc-400 select-none">
              {exportConfig.format === 'image/jpeg' ? '.jpg' : '.png'}
            </span>
          </div>
        </div>

        {/* Output summary metadata (unboxed text with typographic separator) */}
        <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
          <span className="font-mono tabular-nums">
            {exportConfig.resolution} × {exportConfig.resolution} px
          </span>
          <span aria-hidden="true">·</span>
          <span>{exportConfig.format === 'image/jpeg' ? 'High-Res JPEG' : 'Lossless PNG'}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            {estimatedBytes ? formatBytes(estimatedBytes) : '—'}
          </span>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            disabled={!hasAnyPhoto || isExporting}
            onClick={onDownload}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {isExporting
              ? 'Rendering...'
              : `Download ${exportConfig.format === 'image/jpeg' ? 'JPEG' : 'PNG'}`}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!hasAnyPhoto || isExporting}
              onClick={onInspectFullSize}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              Inspect Output
            </button>

            <button
              type="button"
              disabled={!hasAnyPhoto || isExporting}
              onClick={onCopyPng}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40 transition-colors"
            >
              {copiedState ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Copy PNG
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </aside>
  );
}
