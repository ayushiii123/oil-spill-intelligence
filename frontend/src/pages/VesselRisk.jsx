import { useEffect, useMemo, useState } from "react";

const VesselRisk = () => {
  const [aisResult, setAisResult] = useState(null);

  useEffect(() => {
    const savedAIS = sessionStorage.getItem("oilSpillAISResult");

    if (!savedAIS) return;

    try {
      setAisResult(JSON.parse(savedAIS));
    } catch (error) {
      console.error("Unable to restore AIS result:", error);
    }
  }, []);

  const vessels = aisResult?.vessels || [];

  const topVessel = vessels[0];

  const riskCounts = useMemo(() => {
    return {
      high: vessels.filter((v) => v.riskLevel === "HIGH").length,
      medium: vessels.filter((v) => v.riskLevel === "MEDIUM").length,
      low: vessels.filter((v) => v.riskLevel === "LOW").length,
    };
  }, [vessels]);

  const getRiskClasses = (risk) => {
    if (risk === "HIGH") {
      return {
        badge: "bg-red-400/10 text-red-400",
        border: "border-red-400/20",
        text: "text-red-400",
      };
    }

    if (risk === "MEDIUM") {
      return {
        badge: "bg-amber-400/10 text-amber-400",
        border: "border-amber-400/20",
        text: "text-amber-400",
      };
    }

    return {
      badge: "bg-emerald-400/10 text-emerald-400",
      border: "border-emerald-400/20",
      text: "text-emerald-400",
    };
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Module 04 • Risk Intelligence
        </p>

        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Vessel Risk Assessment
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Review ranked vessel candidates and the analytical signals
          contributing to their investigation priority.
        </p>
      </section>

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-[#0a1424] p-5">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Candidate Vessels
          </p>

          <p className="mt-2 text-3xl font-black text-white">
            {vessels.length}
          </p>
        </div>

        <div className="rounded-2xl border border-red-400/10 bg-[#0a1424] p-5">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            High Risk
          </p>

          <p className="mt-2 text-3xl font-black text-red-400">
            {riskCounts.high}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-400/10 bg-[#0a1424] p-5">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Medium Risk
          </p>

          <p className="mt-2 text-3xl font-black text-amber-400">
            {riskCounts.medium}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-400/10 bg-[#0a1424] p-5">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Lower Risk
          </p>

          <p className="mt-2 text-3xl font-black text-emerald-400">
            {riskCounts.low}
          </p>
        </div>
      </section>

      {!topVessel ? (
        <section className="rounded-2xl border border-white/10 bg-[#0a1424] p-8">
          <div className="flex min-h-[340px] flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-3xl">
              🎯
            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-300">
              Risk assessment waiting for AIS correlation
            </h3>

            <p className="mt-2 max-w-md text-xs leading-5 text-slate-600">
              Run AIS Correlation first. Ranked vessel candidates will
              automatically appear here.
            </p>
          </div>
        </section>
      ) : (
        <>
          {/* Top vessel */}
          <section
            className={`rounded-2xl border ${
              getRiskClasses(topVessel.riskLevel).border
            } bg-[#0a1424] p-6`}
          >
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
                  Highest Ranked Candidate
                </p>

                <h3 className="mt-2 text-2xl font-black text-white">
                  {topVessel.vesselName || "Unknown Vessel"}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  {topVessel.vesselId || "N/A"} •{" "}
                  {topVessel.vesselType || "Unknown Type"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-slate-600">
                    Analytical Probability
                  </p>

                  <p
                    className={`mt-1 text-3xl font-black ${
                      getRiskClasses(topVessel.riskLevel).text
                    }`}
                  >
                    {topVessel.suspectProbability ?? "--"}%
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${
                    getRiskClasses(topVessel.riskLevel).badge
                  }`}
                >
                  {topVessel.riskLevel || "N/A"}
                </span>
              </div>
            </div>

            {/* Signal metrics */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <p className="text-[10px] text-slate-500">
                  Spatial Proximity
                </p>

                <p className="mt-2 text-lg font-bold text-white">
                  {topVessel.distanceKm ?? "--"} km
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <p className="text-[10px] text-slate-500">
                  Time Correlation
                </p>

                <p className="mt-2 text-lg font-bold text-white">
                  {topVessel.timeDifferenceMinutes ?? "--"} min
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <p className="text-[10px] text-slate-500">
                  Trajectory Alignment
                </p>

                <p className="mt-2 text-lg font-bold text-white">
                  {topVessel.trajectoryAlignment != null
                    ? `${Math.round(
                        topVessel.trajectoryAlignment
                      )}%`
                    : "N/A"}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <p className="text-[10px] text-slate-500">
                  AIS Gap
                </p>

                <p className="mt-2 text-lg font-bold text-white">
                  {topVessel.aisGapMinutes ?? "--"} min
                </p>
              </div>
            </div>
          </section>

          {/* Evidence */}
          <section className="rounded-2xl border border-white/10 bg-[#0a1424] p-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                Evidence Breakdown
              </p>

              <h3 className="mt-2 text-lg font-bold text-white">
                Contributing Risk Signals
              </h3>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                {
                  label: "Spatial Proximity",
                  value: topVessel.proximityScore ?? 0,
                },
                {
                  label: "Trajectory Alignment",
                  value:
                    Number(topVessel.trajectoryAlignment ?? 0) > 1
                      ? Number(topVessel.trajectoryAlignment)
                      : Number(topVessel.trajectoryAlignment ?? 0) * 100,
                },
                {
                  label: "Time Correlation",
                  value: topVessel.timeMatchScore ?? 0,
                },
                {
                  label: "Behavioural Anomaly",
                  value: topVessel.behaviourScore ?? 0,
                },
              ].map((factor) => {
                const value = Math.max(
                  0,
                  Math.min(Number(factor.value) || 0, 100)
                );

                return (
                  <div
                    key={factor.label}
                    className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">
                        {factor.label}
                      </span>

                      <span className="text-xs font-bold text-white">
                        {Math.round(value)}%
                      </span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {topVessel.riskFactors?.length > 0 && (
              <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Evidence Signals
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {topVessel.riskFactors.map((factor, index) => (
                    <div
                      key={`${factor}-${index}`}
                      className="flex items-start gap-2 text-xs text-slate-400"
                    >
                      <span className="mt-0.5 text-cyan-400">•</span>
                      <span>{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Ranked table */}
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a1424]">
            <div className="border-b border-white/10 px-5 py-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                Risk Ranking
              </p>

              <h3 className="mt-2 text-lg font-bold text-white">
                Candidate Vessel Assessment
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">
                <thead className="border-b border-white/10 bg-black/10">
                  <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3">Rank</th>
                    <th className="px-5 py-3">Vessel</th>
                    <th className="px-5 py-3">Probability</th>
                    <th className="px-5 py-3">Distance</th>
                    <th className="px-5 py-3">Trajectory</th>
                    <th className="px-5 py-3">Risk</th>
                  </tr>
                </thead>

                <tbody>
                  {vessels.map((vessel, index) => (
                    <tr
                      key={vessel.vesselId || index}
                      className="border-b border-white/5 hover:bg-white/[0.03]"
                    >
                      <td className="px-5 py-4 text-xs font-bold text-slate-400">
                        #{index + 1}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-xs font-bold text-white">
                          {vessel.vesselName || "Unknown Vessel"}
                        </p>

                        <p className="mt-1 text-[10px] text-slate-600">
                          {vessel.vesselId || "N/A"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm font-black text-white">
                        {vessel.suspectProbability ?? "--"}%
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-300">
                        {vessel.distanceKm ?? "--"} km
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-300">
                        {vessel.trajectoryAlignment != null
                          ? `${Math.round(
                              vessel.trajectoryAlignment
                            )}%`
                          : "N/A"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${
                            getRiskClasses(vessel.riskLevel).badge
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
          </section>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-[10px] leading-5 text-slate-600">
            <span>ⓘ</span>

            <span>
              Vessel rankings represent analytical
              suspicion/probability based on available signals and do
              not establish legal responsibility, guilt or definitive
              causation.
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default VesselRisk;