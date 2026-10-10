interface BrandMarkProps {
  compact?: boolean;
  inverse?: boolean;
}

export function BrandMark({ compact = false, inverse = false }: BrandMarkProps) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="relative grid h-9 w-9 rotate-[-7deg] place-items-center rounded-xl bg-blue-600 shadow-[0_8px_20px_rgba(21,94,239,0.28)]"
      >
        <span className="absolute left-2 top-2 h-2.5 w-2.5 rounded-[4px] bg-cyan-300" />
        <span className="absolute bottom-2 right-2 h-3 w-3 rounded-[5px] bg-orange-300" />
        <span className="h-2 w-2 rounded-full bg-white" />
      </span>
      {!compact && (
        <span className={`text-xl font-black tracking-[-0.04em] ${inverse ? 'text-white' : 'text-slate-950'}`}>
          Course<span className={inverse ? 'text-cyan-300' : 'text-blue-600'}>Hub</span>
        </span>
      )}
    </span>
  );
}
