const DashboardHeader = () => {
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-white/10 bg-[#07111f]/95 backdrop-blur">
      <div className="flex h-full items-center justify-between px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-lg">
            🛰️
          </div>

          <div>
            <h1 className="text-sm font-bold tracking-wide text-white">
              OIL SPILL INTELLIGENCE
            </h1>

            <p className="text-[10px] text-slate-500">
              Maritime Geo-Intelligence Platform
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              Mission
            </p>

            <p className="text-xs font-semibold text-slate-300">
              SIH 2026 • SPACE TECHNOLOGY
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />

            <span className="text-xs font-semibold text-emerald-300">
              SYSTEM ONLINE
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;