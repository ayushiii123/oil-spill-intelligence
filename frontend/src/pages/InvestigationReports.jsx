import { useEffect, useState } from "react";

const InvestigationReports = () => {
  const [detectionResult, setDetectionResult] = useState(null);
  const [driftResult, setDriftResult] = useState(null);
  const [aisResult, setAisResult] = useState(null);

  useEffect(() => {
    try {
      const detection = sessionStorage.getItem(
        "oilSpillDetectionResult"
      );

      const drift = sessionStorage.getItem(
        "oilSpillDriftResult"
      );

      const ais = sessionStorage.getItem(
        "oilSpillAISResult"
      );

      if (detection) {
        setDetectionResult(JSON.parse(detection));
      }

      if (drift) {
        setDriftResult(JSON.parse(drift));
      }

      if (ais) {
        setAisResult(JSON.parse(ais));
      }
    } catch (error) {
      console.error("Unable to restore report data:", error);
    }
  }, []);

  const detection = detectionResult?.detection;
  const drift = driftResult?.driftAnalysis;
  const topVessel = aisResult?.vessels?.[0];
  const vessels = aisResult?.vessels || [];

  const moduleStatus = {
    satellite: Boolean(detectionResult),
    drift: Boolean(driftResult),
    ais: Boolean(aisResult),
    risk: Boolean(topVessel),
  };

  const analyzedCount = Object.values(moduleStatus).filter(Boolean)
    .length;

  const generateReport = () => {
    if (!detectionResult) {
      alert("Complete Satellite Detection before generating a report.");
      return;
    }

    const reportWindow = window.open(
      "",
      "_blank",
      "width=1100,height=800"
    );

    if (!reportWindow) {
      alert("Please allow pop-ups to generate the report.");
      return;
    }

    const detectionConfidence = (
      Number(
        detection?.confidence ??
          detection?.probabilities?.oil ??
          0
      ) * 100
    ).toFixed(2);

    const origin =
      drift?.origin
        ? `${Number(drift.origin.latitude).toFixed(4)}, ${Number(
            drift.origin.longitude
          ).toFixed(4)}`
        : "Not available";

    const vesselRows = vessels
      .map(
        (vessel, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${vessel.vesselName ?? "Unknown Vessel"}</td>
            <td>${vessel.vesselType ?? "N/A"}</td>
            <td>${vessel.distanceKm ?? "--"} km</td>
            <td>${vessel.timeDifferenceMinutes ?? "--"} min</td>
            <td>${
              vessel.trajectoryAlignment != null
                ? `${Math.round(vessel.trajectoryAlignment)}%`
                : "--"
            }</td>
            <td>${
              vessel.suspectProbability ?? "--"
            }%</td>
            <td>${vessel.riskLevel ?? "N/A"}</td>
          </tr>
        `
      )
      .join("");

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Oil Spill Investigation Report</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 32px;
              font-family: Arial, Helvetica, sans-serif;
              background: #f3f6fa;
              color: #172033;
            }

            .report {
              max-width: 1050px;
              margin: auto;
              background: white;
              padding: 38px;
              box-shadow: 0 8px 30px rgba(0,0,0,0.08);
            }

            .header {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              padding-bottom: 20px;
              border-bottom: 3px solid #0891b2;
            }

            .title {
              font-size: 28px;
              font-weight: 800;
            }

            .subtitle {
              margin-top: 6px;
              color: #64748b;
              font-size: 13px;
            }

            .badge {
              height: fit-content;
              padding: 8px 12px;
              border-radius: 20px;
              background: #e0f2fe;
              color: #0369a1;
              font-size: 11px;
              font-weight: 700;
            }

            h2 {
              margin-top: 30px;
              margin-bottom: 14px;
              font-size: 17px;
            }

            .grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
            }

            .card {
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 14px;
              background: #f8fafc;
            }

            .label {
              color: #64748b;
              font-size: 10px;
              text-transform: uppercase;
              font-weight: 700;
            }

            .value {
              margin-top: 7px;
              font-size: 18px;
              font-weight: 800;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 11px;
            }

            th {
              background: #0f172a;
              color: white;
              padding: 10px 8px;
              text-align: left;
            }

            td {
              border-bottom: 1px solid #e2e8f0;
              padding: 10px 8px;
            }

            .note {
              margin-top: 20px;
              padding: 14px;
              border-radius: 8px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              color: #475569;
              font-size: 11px;
              line-height: 1.6;
            }

            .disclaimer {
              margin-top: 28px;
              padding: 15px;
              border-radius: 8px;
              background: #fff7ed;
              border: 1px solid #fed7aa;
              color: #9a3412;
              font-size: 11px;
              line-height: 1.6;
            }

            .print {
              position: fixed;
              top: 18px;
              right: 18px;
              border: none;
              border-radius: 7px;
              padding: 10px 16px;
              background: #0891b2;
              color: white;
              font-weight: 700;
              cursor: pointer;
            }

            @media print {
              body {
                padding: 0;
                background: white;
              }

              .report {
                box-shadow: none;
                max-width: none;
              }

              .print {
                display: none;
              }
            }

            @media (max-width: 800px) {
              body {
                padding: 12px;
              }

              .report {
                padding: 20px;
              }

              .grid {
                grid-template-columns: repeat(2, 1fr);
              }
            }
          </style>
        </head>

        <body>
          <button class="print" onclick="window.print()">
            Print / Save PDF
          </button>

          <div class="report">
            <div class="header">
              <div>
                <div class="title">
                  🛰️ Oil Spill Investigation Report
                </div>

                <div class="subtitle">
                  Maritime Geo-Intelligence Platform • SIH 2026
                </div>
              </div>

              <div class="badge">
                INVESTIGATION ANALYSIS
              </div>
            </div>

            <h2>Executive Summary</h2>

            <div class="grid">
              <div class="card">
                <div class="label">
                  Detection Confidence
                </div>

                <div class="value">
                  ${detectionConfidence}%
                </div>
              </div>

              <div class="card">
                <div class="label">
                  Modules Analyzed
                </div>

                <div class="value">
                  ${analyzedCount}/4
                </div>
              </div>

              <div class="card">
                <div class="label">
                  Candidate Vessels
                </div>

                <div class="value">
                  ${vessels.length}
                </div>
              </div>

              <div class="card">
                <div class="label">
                  Top Probability
                </div>

                <div class="value">
                  ${topVessel?.suspectProbability ?? "--"}%
                </div>
              </div>
            </div>

            <h2>01 • Satellite Detection</h2>

            <div class="grid">
              <div class="card">
                <div class="label">
                  Classification
                </div>

                <div class="value">
                  ${
                    detection?.detected
                      ? "Potential Oil Spill"
                      : "No Oil Spill"
                  }
                </div>
              </div>

              <div class="card">
                <div class="label">
                  Oil Probability
                </div>

                <div class="value">
                  ${(
                    Number(
                      detection?.probabilities?.oil ?? 0
                    ) * 100
                  ).toFixed(2)}%
                </div>
              </div>

              <div class="card">
                <div class="label">
                  Image Coverage
                </div>

                <div class="value">
                  ${
                    detection?.geometry?.areaPercentage != null
                      ? `${Number(
                          detection.geometry.areaPercentage
                        ).toFixed(2)}%`
                      : "--"
                  }
                </div>
              </div>

              <div class="card">
                <div class="label">
                  Orientation
                </div>

                <div class="value">
                  ${
                    detection?.geometry?.orientationDegrees != null
                      ? `${Number(
                          detection.geometry.orientationDegrees
                        ).toFixed(2)}°`
                      : "--"
                  }
                </div>
              </div>
            </div>

            ${
              drift
                ? `
                  <h2>02 • Drift / Origin Analysis</h2>

                  <div class="grid">
                    <div class="card">
                      <div class="label">
                        Probable Origin
                      </div>

                      <div class="value">
                        ${origin}
                      </div>
                    </div>

                    <div class="card">
                      <div class="label">
                        Confidence
                      </div>

                      <div class="value">
                        ${(
                          Number(drift.confidence ?? 0) * 100
                        ).toFixed(0)}%
                      </div>
                    </div>

                    <div class="card">
                      <div class="label">
                        Wind Speed
                      </div>

                      <div class="value">
                        ${
                          drift.environmentalConditions
                            ?.windSpeedKnots ?? "--"
                        } kn
                      </div>
                    </div>

                    <div class="card">
                      <div class="label">
                        Current Speed
                      </div>

                      <div class="value">
                        ${
                          drift.environmentalConditions
                            ?.currentSpeedKnots ?? "--"
                        } kn
                      </div>
                    </div>
                  </div>
                `
                : ""
            }

            ${
              topVessel
                ? `
                  <h2>03 • AIS Vessel Correlation</h2>

                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Vessel</th>
                        <th>Type</th>
                        <th>Distance</th>
                        <th>Time</th>
                        <th>Trajectory</th>
                        <th>Probability</th>
                        <th>Risk</th>
                      </tr>
                    </thead>

                    <tbody>
                      ${vesselRows}
                    </tbody>
                  </table>
                `
                : ""
            }

            ${
              topVessel
                ? `
                  <h2>04 • Vessel Risk Assessment</h2>

                  <div class="note">
                    <strong>
                      Highest Ranked Candidate:
                    </strong>

                    ${topVessel.vesselName ?? "Unknown Vessel"}
                    (${topVessel.vesselId ?? "N/A"})

                    <br /><br />

                    Analytical suspicion probability:
                    <strong>
                      ${topVessel.suspectProbability ?? "--"}%
                    </strong>

                    <br />

                    Risk classification:
                    <strong>
                      ${topVessel.riskLevel ?? "N/A"}
                    </strong>
                  </div>
                `
                : ""
            }

            <div class="disclaimer">
              <strong>
                Important Analytical Disclaimer:
              </strong>

              <br /><br />

              Vessel rankings represent analytical
              suspicion/probability based on available satellite,
              drift and AIS signals. They do not establish legal
              responsibility, guilt or definitive causation.

              Probable origin represents an analytical region rather
              than a guaranteed exact source. Results should be
              validated using authoritative datasets and expert
              investigation.
            </div>
          </div>
        </body>
      </html>
    `);

    reportWindow.document.close();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400">
          Investigation Documentation
        </p>

        <div className="mt-2 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Investigation Reports
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Consolidated evidence and intelligence findings from
              the current investigation.
            </p>
          </div>

          <button
            type="button"
            onClick={generateReport}
            disabled={!detectionResult}
            className="w-fit rounded-xl bg-cyan-500 px-5 py-3 text-xs font-bold text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            📄 Generate Investigation Report
          </button>
        </div>
      </section>

      {/* Status */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          {
            label: "Satellite",
            ready: moduleStatus.satellite,
            icon: "🛰️",
          },
          {
            label: "Drift",
            ready: moduleStatus.drift,
            icon: "🌊",
          },
          {
            label: "AIS",
            ready: moduleStatus.ais,
            icon: "🚢",
          },
          {
            label: "Risk",
            ready: moduleStatus.risk,
            icon: "🎯",
          },
        ].map((module) => (
          <div
            key={module.label}
            className="rounded-xl border border-white/10 bg-[#0a1424] p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">
                {module.icon}
              </span>

              <span
                className={`rounded-full px-2 py-1 text-[9px] font-bold ${
                  module.ready
                    ? "bg-emerald-400/10 text-emerald-400"
                    : "bg-white/5 text-slate-600"
                }`}
              >
                {module.ready ? "READY" : "PENDING"}
              </span>
            </div>

            <p className="mt-4 text-xs font-bold text-white">
              {module.label}
            </p>
          </div>
        ))}
      </section>

      {/* Preview */}
      <section className="rounded-2xl border border-white/10 bg-[#0a1424] p-6">
        <div className="border-b border-white/10 pb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
            Report Preview
          </p>

          <h3 className="mt-2 text-lg font-bold text-white">
            Evidence & Intelligence Summary
          </h3>
        </div>

        {!detectionResult ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
            <div className="text-4xl opacity-50">📄</div>

            <p className="mt-4 text-sm font-semibold text-slate-400">
              No investigation data available
            </p>

            <p className="mt-2 max-w-sm text-xs leading-5 text-slate-600">
              Complete Satellite Detection first. The report will
              automatically include available drift, AIS and risk
              findings.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {/* Satellite */}
            <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/[0.02] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/10">
                  🛰️
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                    01 • Satellite Intelligence
                  </p>

                  <h4 className="mt-1 text-sm font-bold text-white">
                    Oil Spill Detection
                  </h4>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-lg bg-white/[0.02] p-4">
                  <p className="text-[9px] text-slate-600">
                    Classification
                  </p>

                  <p className="mt-2 text-sm font-bold text-white">
                    {detection?.detected
                      ? "Potential Oil Spill"
                      : "No Oil Spill"}
                  </p>
                </div>

                <div className="rounded-lg bg-white/[0.02] p-4">
                  <p className="text-[9px] text-slate-600">
                    Confidence
                  </p>

                  <p className="mt-2 text-sm font-bold text-cyan-400">
                    {(
                      Number(
                        detection?.confidence ??
                          detection?.probabilities?.oil ??
                          0
                      ) * 100
                    ).toFixed(2)}
                    %
                  </p>
                </div>

                <div className="rounded-lg bg-white/[0.02] p-4">
                  <p className="text-[9px] text-slate-600">
                    Coverage
                  </p>

                  <p className="mt-2 text-sm font-bold text-white">
                    {detection?.geometry?.areaPercentage ?? "--"}%
                  </p>
                </div>

                <div className="rounded-lg bg-white/[0.02] p-4">
                  <p className="text-[9px] text-slate-600">
                    Orientation
                  </p>

                  <p className="mt-2 text-sm font-bold text-white">
                    {detection?.geometry
                      ?.orientationDegrees != null
                      ? `${detection.geometry.orientationDegrees}°`
                      : "--"}
                  </p>
                </div>
              </div>
            </div>

            {/* Drift */}
            {drift && (
              <div className="rounded-xl border border-blue-400/10 bg-blue-400/[0.02] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-400/10">
                    🌊
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                      02 • Ocean Intelligence
                    </p>

                    <h4 className="mt-1 text-sm font-bold text-white">
                      Drift & Origin Analysis
                    </h4>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-lg bg-white/[0.02] p-4">
                    <p className="text-[9px] text-slate-600">
                      Probable Origin
                    </p>

                    <p className="mt-2 text-sm font-bold text-blue-300">
                      {Number(
                        drift.origin.latitude
                      ).toFixed(4)}
                      ,{" "}
                      {Number(
                        drift.origin.longitude
                      ).toFixed(4)}
                    </p>
                  </div>

                  <div className="rounded-lg bg-white/[0.02] p-4">
                    <p className="text-[9px] text-slate-600">
                      Confidence
                    </p>

                    <p className="mt-2 text-sm font-bold text-blue-400">
                      {(
                        Number(drift.confidence ?? 0) * 100
                      ).toFixed(0)}
                      %
                    </p>
                  </div>

                  <div className="rounded-lg bg-white/[0.02] p-4">
                    <p className="text-[9px] text-slate-600">
                      Wind / Current
                    </p>

                    <p className="mt-2 text-sm font-bold text-white">
                      {drift.environmentalConditions
                        ?.windSpeedKnots ?? "--"}{" "}
                      kn /
                      {drift.environmentalConditions
                        ?.currentSpeedKnots ?? "--"}{" "}
                      kn
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* AIS */}
            {aisResult && (
              <div className="rounded-xl border border-purple-400/10 bg-purple-400/[0.02] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-400/10">
                    🚢
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                      03 • Maritime Intelligence
                    </p>

                    <h4 className="mt-1 text-sm font-bold text-white">
                      AIS Vessel Correlation
                    </h4>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-lg bg-white/[0.02] p-4">
                    <p className="text-[9px] text-slate-600">
                      Candidates
                    </p>

                    <p className="mt-2 text-xl font-black text-purple-400">
                      {vessels.length}
                    </p>
                  </div>

                  <div className="rounded-lg bg-white/[0.02] p-4">
                    <p className="text-[9px] text-slate-600">
                      Top Vessel
                    </p>

                    <p className="mt-2 text-sm font-bold text-white">
                      {topVessel?.vesselName ?? "N/A"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-white/[0.02] p-4">
                    <p className="text-[9px] text-slate-600">
                      Top Probability
                    </p>

                    <p className="mt-2 text-xl font-black text-red-400">
                      {topVessel?.suspectProbability ?? "--"}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="flex items-start gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-[10px] leading-5 text-slate-600">
        <span>ⓘ</span>

        <span>
          Vessel rankings represent analytical suspicion/probability
          based on available signals and do not establish legal
          responsibility, guilt or definitive causation.
        </span>
      </div>
    </div>
  );
};

export default InvestigationReports;