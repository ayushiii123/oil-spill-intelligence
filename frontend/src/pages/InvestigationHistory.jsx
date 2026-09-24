import { useEffect, useState } from "react";

const InvestigationHistory = () => {
  const [investigations, setInvestigations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "http://127.0.0.1:5000/api/investigations"
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to load investigation history."
          );
        }

        setInvestigations(data.investigations || []);
      } catch (err) {
        console.error("History fetch error:", err);

        setError(
          err.message || "Unable to load investigation history."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const getStatusStyle = (status) => {
    const value = String(status || "completed").toLowerCase();

    if (
      value === "completed" ||
      value === "complete" ||
      value === "success"
    ) {
      return "bg-emerald-400/10 text-emerald-400";
    }

    if (value === "active" || value === "running") {
      return "bg-cyan-400/10 text-cyan-400";
    }

    return "bg-white/5 text-slate-400";
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400">
          Investigation Archive
        </p>

        <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Investigation History
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Review previously saved oil-spill investigations,
              analysis modules and available evidence.
            </p>
          </div>

          <div className="w-fit rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 text-xs font-semibold text-cyan-300">
            {investigations.length} Saved
          </div>
        </div>
      </section>

      {/* Loading */}
      {loading && (
        <section className="rounded-2xl border border-white/10 bg-[#0a1424] p-10">
          <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />

            <p className="mt-5 text-sm font-semibold text-slate-400">
              Loading investigation history...
            </p>

            <p className="mt-2 text-xs text-slate-600">
              Retrieving saved investigations from the backend.
            </p>
          </div>
        </section>
      )}

      {/* Error */}
      {!loading && error && (
        <section className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-red-400">
            History Service Error
          </p>

          <p className="mt-2 text-sm text-red-300">
            {error}
          </p>
        </section>
      )}

      {/* Empty */}
      {!loading && !error && investigations.length === 0 && (
        <section className="rounded-2xl border border-white/10 bg-[#0a1424] p-10">
          <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-3xl">
              🕘
            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-300">
              No saved investigations
            </h3>

            <p className="mt-2 max-w-md text-xs leading-5 text-slate-600">
              Completed investigations will appear here after they
              are saved.
            </p>
          </div>
        </section>
      )}

      {/* Investigation cards */}
      {!loading && !error && investigations.length > 0 && (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {investigations.map((investigation) => {
            const status = investigation.status || "completed";

            return (
              <article
                key={investigation._id || investigation.investigationId}
                className="rounded-2xl border border-white/10 bg-[#0a1424] p-6 transition hover:border-cyan-400/20 hover:bg-[#0c1728]"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                      Investigation ID
                    </p>

                    <h3 className="mt-1 text-sm font-bold text-white">
                      {investigation.investigationId || "N/A"}
                    </h3>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${getStatusStyle(
                      status
                    )}`}
                  >
                    {status}
                  </span>
                </div>

                <div className="mt-5">
                  <p className="text-lg font-bold text-white">
                    {investigation.title ||
                      "Oil Spill Investigation"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Scene date:{" "}
                    {investigation.sceneDate || "Not available"}
                  </p>
                </div>

                {/* Dates */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <p className="text-[9px] uppercase tracking-wider text-slate-600">
                      Created
                    </p>

                    <p className="mt-2 text-xs font-semibold text-slate-300">
                      {investigation.createdAt
                        ? new Date(
                            investigation.createdAt
                          ).toLocaleString("en-IN")
                        : "Not available"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <p className="text-[9px] uppercase tracking-wider text-slate-600">
                      Updated
                    </p>

                    <p className="mt-2 text-xs font-semibold text-slate-300">
                      {investigation.updatedAt
                        ? new Date(
                            investigation.updatedAt
                          ).toLocaleString("en-IN")
                        : "Not available"}
                    </p>
                  </div>
                </div>

                {/* Module availability */}
                <div className="mt-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Available Evidence
                  </p>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      {
                        label: "Satellite",
                        available: Boolean(
                          investigation.satellite
                        ),
                      },
                      {
                        label: "Drift",
                        available: Boolean(
                          investigation.drift
                        ),
                      },
                      {
                        label: "AIS",
                        available: Boolean(
                          investigation.ais
                        ),
                      },
                    ].map((module) => (
                      <div
                        key={module.label}
                        className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
                      >
                        <p className="text-[9px] text-slate-600">
                          {module.label}
                        </p>

                        <p
                          className={`mt-1 text-xs font-bold ${
                            module.available
                              ? "text-emerald-400"
                              : "text-slate-600"
                          }`}
                        >
                          {module.available
                            ? "Available"
                            : "N/A"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk */}
                {investigation.risk && (
                  <div className="mt-4 rounded-xl border border-amber-400/10 bg-amber-400/[0.03] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-slate-600">
                          Highest Ranked Vessel
                        </p>

                        <p className="mt-1 text-xs font-bold text-white">
                          {investigation.risk.vesselName ||
                            "Unknown Vessel"}
                        </p>

                        <p className="mt-1 text-[9px] text-slate-600">
                          {investigation.risk.vesselId ||
                            "N/A"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[9px] uppercase tracking-wider text-slate-600">
                          Suspicion
                        </p>

                        <p className="mt-1 text-lg font-black text-amber-400">
                          {investigation.risk.suspectProbability ??
                            "--"}
                          %
                        </p>

                        <p className="mt-1 text-[9px] font-bold text-slate-500">
                          {investigation.risk.riskLevel ||
                            "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action */}
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem(
                      "oilSpillDetectionResult",
                      JSON.stringify(
                        investigation.satellite || null
                      )
                    );

                    sessionStorage.setItem(
                      "oilSpillDriftResult",
                      JSON.stringify(
                        investigation.drift || null
                      )
                    );

                    sessionStorage.setItem(
                      "oilSpillAISResult",
                      JSON.stringify(
                        investigation.ais || null
                      )
                    );

                    window.location.href = "/reports";
                  }}
                  className="mt-5 w-full rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400/10"
                >
                  View Investigation Report →
                </button>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
};

export default InvestigationHistory;