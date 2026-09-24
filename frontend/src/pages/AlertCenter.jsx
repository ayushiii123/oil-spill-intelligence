import { useEffect, useMemo, useState } from "react";

const AlertCenter = () => {
  const [detectionResult, setDetectionResult] = useState(null);
  const [driftResult, setDriftResult] = useState(null);
  const [aisResult, setAisResult] = useState(null);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    const savedDetection = sessionStorage.getItem(
      "oilSpillDetectionResult"
    );

    const savedDrift = sessionStorage.getItem(
      "oilSpillDriftResult"
    );

    const savedAIS = sessionStorage.getItem(
      "oilSpillAISResult"
    );

    try {
      if (savedDetection) {
        setDetectionResult(JSON.parse(savedDetection));
      }

      if (savedDrift) {
        setDriftResult(JSON.parse(savedDrift));
      }

      if (savedAIS) {
        setAisResult(JSON.parse(savedAIS));
      }
    } catch (error) {
      console.error("Unable to restore alert data:", error);
    }
  }, []);

  const topVessel = aisResult?.vessels?.[0];

  const alerts = useMemo(() => {
    const items = [];

    if (detectionResult?.detection) {
      const detected = detectionResult.detection.detected;

      items.push({
        id: "satellite",
        type: "SATELLITE",
        icon: "🛰️",
        severity: detected ? "ATTENTION" : "INFO",
        title: detected
          ? "Potential Oil Spill Detected"
          : "No Significant Oil Spill Signature",
        description: detected
          ? "Satellite analysis identified a potential surface anomaly requiring further investigation."
          : "Satellite analysis did not identify a significant oil-spill signature in the submitted image.",
        accent: detected ? "cyan" : "emerald",
      });
    }

    if (driftResult?.driftAnalysis) {
      items.push({
        id: "drift",
        type: "DRIFT",
        icon: "🌊",
        severity: "ANALYTICAL",
        title: "Probable Origin Estimated",
        description:
          "Drift analysis has produced a probable spill-origin region for downstream vessel correlation.",
        accent: "blue",
      });
    }

    if (aisResult?.alerts?.length) {
      aisResult.alerts.forEach((alert, index) => {
        items.push({
          id: alert.alertId || `ais-${index}`,
          type: "VESSEL",
          icon: "🚨",
          severity: alert.severity || "HIGH",
          title: "Vessel Correlation Alert",
          description:
            alert.message ||
            "AIS correlation generated a vessel investigation alert.",
          accent: "red",
          vesselName: alert.vesselName,
          vesselId: alert.vesselId,
          score: alert.suspectScore,
        });
      });
    } else if (topVessel) {
      items.push({
        id: "top-vessel",
        type: "VESSEL",
        icon: "🚢",
        severity: topVessel.riskLevel || "ANALYTICAL",
        title: "Ranked Vessel Candidate Available",
        description:
          "AIS correlation has produced a highest-ranked vessel candidate for investigation.",
        accent:
          topVessel.riskLevel === "HIGH"
            ? "red"
            : topVessel.riskLevel === "MEDIUM"
            ? "amber"
            : "emerald",
        vesselName: topVessel.vesselName,
        vesselId: topVessel.vesselId,
        score: topVessel.suspectProbability,
      });
    }

    return items;
  }, [detectionResult, driftResult, aisResult, topVessel]);

  const getAccent = (accent) => {
    const styles = {
      cyan: {
        border: "border-cyan-400/20",
        bg: "bg-cyan-400/[0.03]",
        icon: "bg-cyan-400/10",
        text: "text-cyan-400",
        badge: "bg-cyan-400/10 text-cyan-300",
      },
      blue: {
        border: "border-blue-400/20",
        bg: "bg-blue-400/[0.03]",
        icon: "bg-blue-400/10",
        text: "text-blue-400",
        badge: "bg-blue-400/10 text-blue-300",
      },
      red: {
        border: "border-red-400/20",
        bg: "bg-red-400/[0.04]",
        icon: "bg-red-400/10",
        text: "text-red-400",
        badge: "bg-red-400/10 text-red-300",
      },
      amber: {
        border: "border-amber-400/20",
        bg: "bg-amber-400/[0.03]",
        icon: "bg-amber-400/10",
        text: "text-amber-400",
        badge: "bg-amber-400/10 text-amber-300",
      },
      emerald: {
        border: "border-emerald-400/20",
        bg: "bg-emerald-400/[0.03]",
        icon: "bg-emerald-400/10",
        text: "text-emerald-400",
        badge: "bg-emerald-400/10 text-emerald-300",
      },
    };

    return styles[accent] || styles.cyan;
  };

  const highPriority = alerts.filter(
    (alert) =>
      alert.severity === "HIGH" ||
      alert.severity === "CRITICAL"
  ).length;

  const investigationActive =
    Boolean(detectionResult) ||
    Boolean(driftResult) ||
    Boolean(aisResult);

  return (
    <div className="space-y-8">
      {/* Header */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-400">
          Intelligence Monitoring
        </p>

        <div className="mt-2 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Alert Center
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Centralized monitoring of analytical alerts generated
              from satellite, drift and AIS intelligence.
            </p>
          </div>

          <div
            className={`flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold ${
              highPriority > 0
                ? "bg-red-400/10 text-red-400"
                : investigationActive
                ? "bg-amber-400/10 text-amber-300"
                : "bg-white/5 text-slate-500"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                highPriority > 0
                  ? "animate-pulse bg-red-400"
                  : investigationActive
                  ? "bg-amber-400"
                  : "bg-slate-600"
              }`}
            />

            {highPriority > 0
              ? `${highPriority} HIGH PRIORITY`
              : investigationActive
              ? "INVESTIGATION ACTIVE"
              : "STANDBY"}
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#0a1424] p-5">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Active Signals
          </p>

          <p className="mt-2 text-3xl font-black text-white">
            {alerts.length}
          </p>
        </div>

        <div className="rounded-2xl border border-red-400/10 bg-[#0a1424] p-5">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            High Priority
          </p>

          <p className="mt-2 text-3xl font-black text-red-400">
            {highPriority}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/10 bg-[#0a1424] p-5">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Investigation State
          </p>

          <p className="mt-2 text-xl font-black text-cyan-400">
            {investigationActive ? "ACTIVE" : "STANDBY"}
          </p>
        </div>
      </section>

      {/* Alerts */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a1424]">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
            Active Signals
          </p>

          <h3 className="mt-2 text-lg font-bold text-white">
            Investigation Alerts
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Alerts are analytical indicators and require validation
            before operational action.
          </p>
        </div>

        {alerts.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-3xl opacity-50">🔔</div>

            <p className="mt-4 text-sm font-semibold text-slate-400">
              No active alerts
            </p>

            <p className="mt-2 text-xs text-slate-600">
              Alerts will appear after investigation signals become
              available.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-2">
            {alerts.map((alert) => {
              const accent = getAccent(alert.accent);

              return (
                <div
                  key={alert.id}
                  className={`rounded-xl border ${accent.border} ${accent.bg} p-5`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent.icon} text-lg`}
                    >
                      {alert.icon}
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${accent.badge}`}
                    >
                      {alert.severity}
                    </span>
                  </div>

                  <p
                    className={`mt-4 text-[10px] font-bold uppercase tracking-wider ${accent.text}`}
                  >
                    {alert.type} SIGNAL
                  </p>

                  <h4 className="mt-2 text-sm font-bold text-white">
                    {alert.title}
                  </h4>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {alert.description}
                  </p>

                  {alert.vesselName && (
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/5 pt-4">
                      <div>
                        <p className="text-[9px] text-slate-600">
                          Vessel
                        </p>

                        <p className="mt-1 text-xs font-bold text-white">
                          {alert.vesselName}
                        </p>

                        <p className="mt-1 text-[9px] text-slate-600">
                          {alert.vesselId || "N/A"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[9px] text-slate-600">
                          Analytical Score
                        </p>

                        <p
                          className={`mt-1 text-lg font-black ${accent.text}`}
                        >
                          {alert.score != null
                            ? `${alert.score}%`
                            : "--"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col justify-between gap-3 border-t border-white/10 bg-black/10 px-5 py-4 md:flex-row md:items-center">
          <div className="flex items-start gap-2">
            <span className="text-sm">⚠️</span>

            <div>
              <p className="text-[10px] font-semibold text-slate-400">
                Analytical Alert
              </p>

              <p className="mt-0.5 text-[10px] leading-5 text-slate-600">
                Alert signals indicate investigation priority. They
                do not establish legal responsibility or definitive
                causation.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAcknowledged(true)}
            disabled={acknowledged}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-bold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {acknowledged
              ? "✓ Alerts Acknowledged"
              : "Acknowledge Alerts"}
          </button>
        </div>
      </section>
    </div>
  );
};

export default AlertCenter;