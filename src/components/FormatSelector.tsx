import { CoverFormat } from '../types/cover';

interface FormatSelectorProps {
  format: CoverFormat;
  onChange: (format: CoverFormat) => void;
}

export function FormatSelector({ format, onChange }: FormatSelectorProps) {
  return (
    <section aria-labelledby="format-heading" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 id="format-heading" className="text-sm font-semibold text-zinc-900">
          Cover Format
        </h2>
        <span className="text-xs text-zinc-500">Always 1:1 square</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => onChange('corner-inset')}
          aria-pressed={format === 'corner-inset'}
          className={`group flex flex-col items-start gap-2.5 rounded-xl border p-3 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
            format === 'corner-inset'
              ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
              : 'border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50'
          }`}
        >
          <div className="w-full flex items-center justify-between">
            <svg
              viewBox="0 0 48 48"
              className="h-10 w-10 shrink-0"
              aria-hidden="true"
            >
              <rect
                x="2"
                y="2"
                width="44"
                height="44"
                rx="3"
                fill={format === 'corner-inset' ? '#27272a' : '#f4f4f5'}
                stroke={format === 'corner-inset' ? '#52525b' : '#d4d4d8'}
                strokeWidth="1.5"
              />
              <rect
                x="5"
                y="25"
                width="18"
                height="18"
                rx="2"
                fill={format === 'corner-inset' ? '#ffffff' : '#18181b'}
                stroke={format === 'corner-inset' ? '#18181b' : '#ffffff'}
                strokeWidth="1.5"
              />
            </svg>
            <span
              className={`font-mono text-[11px] tabular-nums ${
                format === 'corner-inset' ? 'text-zinc-300' : 'text-zinc-500'
              }`}
            >
              2 photos
            </span>
          </div>
          <div>
            <div className="text-xs font-semibold leading-tight">
              Corner Inset
            </div>
            <div
              className={`mt-0.5 text-[11px] leading-snug ${
                format === 'corner-inset' ? 'text-zinc-300' : 'text-zinc-500'
              }`}
            >
              Main + bottom-left
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChange('three-split')}
          aria-pressed={format === 'three-split'}
          className={`group flex flex-col items-start gap-2.5 rounded-xl border p-3 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
            format === 'three-split'
              ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
              : 'border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50'
          }`}
        >
          <div className="w-full flex items-center justify-between">
            <svg
              viewBox="0 0 48 48"
              className="h-10 w-10 shrink-0"
              aria-hidden="true"
            >
              <rect
                x="2"
                y="2"
                width="20.5"
                height="20.5"
                rx="2"
                fill={format === 'three-split' ? '#52525b' : '#e4e4e7'}
              />
              <rect
                x="2"
                y="25.5"
                width="20.5"
                height="20.5"
                rx="2"
                fill={format === 'three-split' ? '#52525b' : '#e4e4e7'}
              />
              <rect
                x="25.5"
                y="2"
                width="20.5"
                height="44"
                rx="2"
                fill={format === 'three-split' ? '#ffffff' : '#18181b'}
              />
            </svg>
            <span
              className={`font-mono text-[11px] tabular-nums ${
                format === 'three-split' ? 'text-zinc-300' : 'text-zinc-500'
              }`}
            >
              3 photos
            </span>
          </div>
          <div>
            <div className="text-xs font-semibold leading-tight">
              Half Split
            </div>
            <div
              className={`mt-0.5 text-[11px] leading-snug ${
                format === 'three-split' ? 'text-zinc-300' : 'text-zinc-500'
              }`}
            >
              2 left + 1 right half
            </div>
          </div>
        </button>
      </div>
    </section>
  );
}
