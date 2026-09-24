import { useEffect, useState } from "react";

const AISCorrelation = () => {
  const [driftResult, setDriftResult] = useState(null);
  const [aisResult, setAisResult] = useState(null);

  const [searchRadius, setSearchRadius] = useState(50);
  const [timeWindow, setTimeWindow] = useState(2);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedDrift = sessionStorage.getItem(
      "oilSpillDriftResult"
    );

    if (!savedDrift) return;

    try {
      setDriftResult(JSON.parse(savedDrift));
    } catch (err) {
      console.error("Unable to restore drift result:", err);
    }
  }, []);

  useEffect(() => {
    const savedAIS = sessionStorage.getItem(
      "oilSpillAISResult"
    );

    if (!savedAIS) return;

    try {
      setAisResult(JSON.parse(savedAIS));
    } catch (err) {
      console.error("Unable to restore AIS result:", err);
      sessionStorage.removeItem("oilSpillAISResult");
    }
  }, []);

  const runCorrelation = async () => {
    if (!driftResult?.driftAnalysis?.origin) {
      setError(
        "Please complete Drift Analysis before running AIS correlation."
      );
      return;
    }

    const {
      latitude,
      longitude,
      originTime,
    } = driftResult.driftAnalysis.origin;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/ais/correlate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            latitude,
            longitude,
            originTime,
            searchRadiusKm: Number(searchRadius),
            timeWindowHours: Number(timeWindow),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "AIS correlation failed."
        );
      }

      setAisResult(data);

      sessionStorage.setItem(
        "oilSpillAISResult",
        JSON.stringify(data)
      );
    } catch (err) {
      console.error("AIS correlation error:", err);

      setError(
        err.message || "Unable to analyze AIS correlation."
      );
    } finally {
      setLoading(false);
    }
  };

  const vessels = aisResult?.vessels || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-purple-400">
          Module 03 • Maritime Intelligence
        </p>

        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
          AIS Correlation
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Correlate vessel activity around the probable spill origin
          using spatial and temporal AIS signals.
        </p>
      </section>

      {/* Analysis status */}
      <section className="rounded-2xl border border-white/10 bg-[#0a1424] p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Investigation Origin
            </p>

            <h3 className="mt-2 text-sm font-bold text-white">
              {driftResult?.driftAnalysis?.origin
                ? `${Number(
                    driftResult.driftAnalysis.origin.latitude
                  ).toFixed(4)}, ${Number(
                    driftResult.driftAnalysis.origin.longitude
                  ).toFixed(4)}`
                : "Origin unavailable"}
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Probable spill origin supplied by drift analysis.
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-3 py-1.5 text-[10px] font-bold ${
              driftResult?.driftAnalysis?.origin
                ? "bg-emerald-400/10 text-emerald-400"
                : "bg-white/5 text-slate-500"
            }`}
          >
            {driftResult?.driftAnalysis?.origin
              ? "ORIGIN AVAILABLE"
              : "WAITING FOR DRIFT"}
          </span>
        </div>
      </section>

      {/* Controls + Summary */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.4fr]">
        {/* Controls */}
        <div className="rounded-2xl border border-white/10 bg-[#0a1424] p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">
            Correlation Parameters
          </p>

          <h3 className="mt-2 text-lg font-bold text-white">
            Search Configuration
          </h3>

          <div className="mt-6 space-y-6">
            {/* Radius */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Search Radius
                </label>

                <span className="rounded-lg bg-purple-400/10 px-2.5 py-1 text-xs font-bold text-purple-300">
                  {searchRadius} km
                </span>
              </div>

              <input
                type="range"
                min="10"
                max="100"
                value={searchRadius}
                onChange={(e) =>
                  setSearchRadius(Number(e.target.value))
                }
                className="mt-4 w-full accent-purple-400"
              />

              <div className="mt-2 flex justify-between text-[9px] text-slate-600">
                <span>10 km</span>
                <span>100 km</span>
              </div>
            </div>

            {/* Time */}
            <div>
              <label className="text-xs font-semibold text-slate-300">
                Time Window
              </label>

              <select
                value={timeWindow}
                onChange={(e) =>
                  setTimeWindow(Number(e.target.value))
                }
                className="mt-3 w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-2.5 text-xs text-slate-300 outline-none focus:border-purple-400/40"
              >
                <option value="1">± 1 hour</option>
                <option value="2">± 2 hours</option>
                <option value="6">± 6 hours</option>
                <option value="12">± 12 hours</option>
                <option value="24">± 24 hours</option>
              </select>
            </div>

            <button
              type="button"
              onClick={runCorrelation}
              disabled={
                loading ||
                !driftResult?.driftAnalysis?.origin
              }
              className="w-full rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Correlating Vessel Activity..."
                : "Run AIS Correlation →"}
            </button>

            {error && (
              <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-xs text-red-300">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-2xl border border-white/10 bg-[#0a1424] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">
                Correlation Output
              </p>

              <h3 className="mt-2 text-lg font-bold text-white">
                Vessel Intelligence
              </h3>
            </div>

            {aisResult && (
              <span className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold text-emerald-400">
                READY
              </span>
            )}
          </div>

          {!aisResult ? (
            <div className="mt-6 flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-white/5 bg-[#050d19] text-center">
              <div className="text-3xl opacity-60">🚢</div>

              <p className="mt-4 text-sm font-semibold text-slate-400">
                Awaiting AIS correlation
              </p>

              <p className="mt-2 max-w-sm text-xs leading-5 text-slate-600">
                Complete Drift Analysis first, then run AIS
                correlation to identify candidate vessels.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <p className="text-[10px] text-slate-500">
                  Candidates
                </p>

                <p className="mt-2 text-2xl font-black text-purple-400">
                  {vessels.length}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <p className="text-[10px] text-slate-500">
                  Search Radius
                </p>

                <p className="mt-2 text-2xl font-black text-white">
                  {aisResult.searchRadiusKm ?? searchRadius} km
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <p className="text-[10px] text-slate-500">
                  Investigation Point
                </p>

                <p className="mt-2 text-sm font-bold text-white">
                  {aisResult.investigationPoint
                    ? `${Number(
                        aisResult.investigationPoint.latitude
                      ).toFixed(4)}, ${Number(
                        aisResult.investigationPoint.longitude
                      ).toFixed(4)}`
                    : "N/A"}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Vessel table */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a1424]">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">
                Ranked Candidates
              </p>

              <h3 className="mt-2 text-lg font-bold text-white">
                AIS Vessel Correlation
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Vessel activity ranked around the probable spill
                origin.
              </p>
            </div>

            <span className="w-fit rounded-full bg-purple-400/10 px-3 py-1.5 text-[10px] font-bold text-purple-300">
              {vessels.length} CANDIDATES
            </span>
          </div>
        </div>

        {vessels.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-slate-400">
              No correlated vessels available
            </p>

            <p className="mt-2 text-xs text-slate-600">
              Run AIS correlation to populate the vessel table.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-white/10 bg-black/10">
                <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Rank</th>
                  <th className="px-5 py-3">Vessel</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Distance</th>
                  <th className="px-5 py-3">Time Match</th>
                  <th className="px-5 py-3">Trajectory</th>
                  <th className="px-5 py-3">AIS Gap</th>
                  <th className="px-5 py-3">Probability</th>
                  <th className="px-5 py-3">Risk</th>
                </tr>
              </thead>

              <tbody>
                {vessels.map((vessel, index) => (
                  <tr
                    key={vessel.vesselId || index}
                    className="border-b border-white/5 transition hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-4">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-xs font-bold text-slate-300">
                        #{index + 1}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-xs font-bold text-white">
                        {vessel.vesselName || "Unknown Vessel"}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-600">
                        {vessel.vesselId || "N/A"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-400">
                      {vessel.vesselType || "N/A"}
                    </td>

                    <td className="px-5 py-4 text-xs font-semibold text-white">
                      {vessel.distanceKm ?? "--"} km
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-300">
                      {vessel.timeDifferenceMinutes != null
                        ? `${vessel.timeDifferenceMinutes} min`
                        : "N/A"}
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-300">
                      {vessel.trajectoryAlignment != null
                        ? `${Math.round(
                            vessel.trajectoryAlignment
                          )}%`
                        : "N/A"}
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-300">
                      {vessel.aisGapMinutes != null
                        ? `${vessel.aisGapMinutes} min`
                        : "N/A"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-sm font-black text-white">
                        {vessel.suspectProbability ?? "--"}%
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${
                          vessel.riskLevel === "HIGH"
                            ? "bg-red-400/10 text-red-400"
                            : vessel.riskLevel === "MEDIUM"
                            ? "bg-amber-400/10 text-amber-400"
                            : "bg-emerald-400/10 text-emerald-400"
                        }`}
                      >
                        {vessel.riskLevel || "N/A"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AISCorrelation;