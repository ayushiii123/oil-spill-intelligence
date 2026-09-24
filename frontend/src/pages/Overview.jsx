const Overview = ({ onNavigate }) => {
  const modules = [
    {
      id: "satellite",
      number: "01",
      title: "Satellite Detection",
      description: "Analyze SAR / EO satellite imagery",
      icon: "🛰️",
      accent: "cyan",
      status: "READY",
    },
    {
      id: "drift",
      number: "02",
      title: "Drift Analysis",
      description: "Reconstruct probable spill origin",
      icon: "🌊",
      accent: "blue",
      status: "STANDBY",
    },
    {
      id: "ais",
      number: "03",
      title: "AIS Correlation",
      description: "Correlate nearby vessel activity",
      icon: "🚢",
      accent: "purple",
      status: "STANDBY",
    },
    {
      id: "vessels",
      number: "04",
      title: "Vessel Risk",
      description: "Review analytical vessel ranking",
      icon: "🎯",
      accent: "amber",
      status: "STANDBY",
    },
  ];

  const accentClasses = {
    cyan: {
      icon: "border-cyan-400/20 bg-cyan-400/10",
      iconText: "text-cyan-300",
      hover: "hover:border-cyan-400/30",
      number: "text-cyan-400",
    },
    blue: {
      icon: "border-blue-400/20 bg-blue-400/10",
      iconText: "text-blue-300",
      hover: "hover:border-blue-400/30",
      number: "text-blue-400",
    },
    purple: {
      icon: "border-purple-400/20 bg-purple-400/10",
      iconText: "text-purple-300",
      hover: "hover:border-purple-400/30",
      number: "text-purple-400",
    },
    amber: {
      icon: "border-amber-400/20 bg-amber-400/10",
      iconText: "text-amber-300",
      hover: "hover:border-amber-400/30",
      number: "text-amber-400",
    },
  };

  const goTo = (page) => {
    onNavigate?.(page);
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="rounded-2xl border border-cyan-400/10 bg-gradient-to-br from-cyan-400/[0.06] via-[#0a1424] to-[#0a1424] p-7 md:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400">
              Maritime Intelligence Center
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Oil Spill Investigation
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Detect potential oil spills, reconstruct probable
              origins and correlate vessel activity through a
              structured maritime intelligence workflow.
            </p>
          </div>

          <button
            type="button"
            onClick={() => goTo("satellite")}
            className="w-fit rounded-xl bg-cyan-500 px-5 py-3 text-xs font-bold text-white transition hover:bg-cyan-400"
          >
            Start Investigation →
          </button>
        </div>
      </section>

      {/* Module cards */}
      <section>
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Investigation Pipeline
          </p>

          <h3 className="mt-2 text-lg font-bold text-white">
            Intelligence Modules
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => {
            const style = accentClasses[module.accent];

            return (
              <button
                key={module.id}
                type="button"
                onClick={() => goTo(module.id)}
                className={`group rounded-2xl border border-white/10 bg-[#0a1424] p-5 text-left transition hover:-translate-y-0.5 hover:bg-[#0c1728] ${style.hover}`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border text-xl ${style.icon} ${style.iconText}`}
                  >
                    {module.icon}
                  </div>

                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-[9px] font-bold text-slate-500">
                    {module.status}
                  </span>
                </div>

                <p
                  className={`mt-5 text-[10px] font-bold uppercase tracking-[0.18em] ${style.number}`}
                >
                  Module {module.number}
                </p>

                <h4 className="mt-2 text-base font-bold text-white">
                  {module.title}
                </h4>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {module.description}
                </p>

                <p className="mt-5 text-[10px] font-bold text-slate-600 transition group-hover:text-slate-300">
                  Open Module →
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Quick access */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => goTo("alerts")}
          className="rounded-2xl border border-white/10 bg-[#0a1424] p-5 text-left transition hover:border-red-400/20 hover:bg-[#0c1728]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-400/10">
              🚨
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                Monitoring
              </p>

              <h4 className="mt-1 text-sm font-bold text-white">
                Alert Center
              </h4>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            Review active analytical signals from the investigation
            pipeline.
          </p>
        </button>

        <button
          type="button"
          onClick={() => goTo("reports")}
          className="rounded-2xl border border-white/10 bg-[#0a1424] p-5 text-left transition hover:border-cyan-400/20 hover:bg-[#0c1728]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10">
              📊
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                Documentation
              </p>

              <h4 className="mt-1 text-sm font-bold text-white">
                Investigation Reports
              </h4>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            Open the consolidated evidence and intelligence report
            workspace.
          </p>
        </button>
      </section>

      {/* Archive */}
      <section className="rounded-2xl border border-white/10 bg-[#0a1424] p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Investigation Archive
            </p>

            <h3 className="mt-2 text-base font-bold text-white">
              Previous Investigations
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Access saved investigations and historical evidence.
            </p>
          </div>

          <button
            type="button"
            onClick={() => goTo("history")}
            className="w-fit rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Open History →
          </button>
        </div>
      </section>
    </div>
  );
};

export default Overview;