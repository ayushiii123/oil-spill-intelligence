const DashboardSidebar = ({ activePage = "overview", onNavigate }) => {
  const menu = [
    {
      id: "overview",
      label: "Overview",
      icon: "◉",
      section: "Investigation",
    },
    {
      id: "satellite",
      label: "Satellite Detection",
      icon: "🛰️",
      section: "Investigation",
    },
    {
      id: "drift",
      label: "Drift Analysis",
      icon: "🌊",
      section: "Investigation",
    },
    {
      id: "ais",
      label: "AIS Correlation",
      icon: "🚢",
      section: "Investigation",
    },
    {
      id: "vessels",
      label: "Vessel Risk",
      icon: "🎯",
      section: "Investigation",
    },
    {
      id: "alerts",
      label: "Alert Center",
      icon: "🚨",
      section: "System",
    },
    {
      id: "history",
      label: "Investigation History",
      icon: "🕘",
      section: "System",
    },
    {
      id: "reports",
      label: "Reports",
      icon: "📊",
      section: "System",
    },
    {
      id: "configuration",
      label: "Configuration",
      icon: "⚙️",
      section: "System",
    },
  ];

  const sections = ["Investigation", "System"];

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-white/10 bg-[#050d19] lg:flex lg:flex-col">
      <div className="flex-1 p-5">
        {sections.map((section) => (
          <div key={section} className="mb-7">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
              {section}
            </p>

            <nav className="space-y-1">
              {menu
                .filter((item) => item.section === section)
                .map((item) => {
                  const active = activePage === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onNavigate?.(item.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition ${
                        active
                          ? "border border-cyan-400/10 bg-cyan-400/10 font-semibold text-cyan-300"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className="flex w-5 justify-center text-base">
                        {item.icon}
                      </span>

                      <span>{item.label}</span>
                    </button>
                  );
                })}
            </nav>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-600">
            Analysis Engine
          </p>

          <div className="mt-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />

            <span className="text-xs text-slate-400">
              Operational
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;