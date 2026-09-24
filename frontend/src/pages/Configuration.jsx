import { useState } from "react";

const Configuration = () => {
  const [searchRadius, setSearchRadius] = useState(50);
  const [timeWindow, setTimeWindow] = useState(2);
  const [riskThreshold, setRiskThreshold] = useState(50);
  const [satelliteConfidence, setSatelliteConfidence] = useState(80);

  const [driftMode, setDriftMode] = useState("both");
  const [dataSource, setDataSource] = useState("sentinel1");

  return (
    <div className="space-y-8">
      {/* Header */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400">
          System Configuration
        </p>

        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Investigation Parameters
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Configure analysis parameters for the current investigation
          workflow.
        </p>
      </section>

      {/* Status */}
      <section className="rounded-2xl border border-emerald-400/10 bg-[#0a1424] p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
              Configuration Status
            </p>

            <h3 className="mt-2 text-sm font-bold text-white">
              Investigation parameters ready
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              These controls are presented as the central configuration
              workspace.
            </p>
          </div>

          <span className="w-fit rounded-full bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold text-emerald-400">
            ● READY
          </span>
        </div>
      </section>

      {/* Configuration grid */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* AIS Radius */}
        <div className="rounded-2xl border border-white/10 bg-[#0a1424] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white">
                AIS Search Radius
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Spatial range used for vessel correlation.
              </p>
            </div>

            <span className="rounded-lg bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-400">
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
            className="mt-6 w-full accent-cyan-400"
          />

          <div className="mt-2 flex justify-between text-[9px] text-slate-600">
            <span>10 km</span>
            <span>100 km</span>
          </div>
        </div>

        {/* AIS Time */}
        <div className="rounded-2xl border border-white/10 bg-[#0a1424] p-5">
          <p className="text-sm font-bold text-white">
            AIS Time Window
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Temporal range used for vessel correlation.
          </p>

          <select
            value={timeWindow}
            onChange={(e) =>
              setTimeWindow(Number(e.target.value))
            }
            className="mt-5 w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-xs text-slate-300 outline-none focus:border-cyan-400/40"
          >
            <option value="1">± 1 hour</option>
            <option value="2">± 2 hours</option>
            <option value="6">± 6 hours</option>
            <option value="12">± 12 hours</option>
            <option value="24">± 24 hours</option>
          </select>
        </div>

        {/* Risk threshold */}
        <div className="rounded-2xl border border-white/10 bg-[#0a1424] p-5">
          <p className="text-sm font-bold text-white">
            Risk Threshold
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Minimum analytical probability for higher-priority
            candidates.
          </p>

          <select
            value={riskThreshold}
            onChange={(e) =>
              setRiskThreshold(Number(e.target.value))
            }
            className="mt-5 w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-xs text-slate-300 outline-none focus:border-cyan-400/40"
          >
            <option value="30">30% — Low sensitivity</option>
            <option value="50">50% — Balanced</option>
            <option value="70">70% — High confidence</option>
            <option value="85">85% — Strict</option>
          </select>
        </div>

        {/* Satellite confidence */}
        <div className="rounded-2xl border border-white/10 bg-[#0a1424] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white">
                Satellite Confidence
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Detection confidence display threshold.
              </p>
            </div>

            <span className="rounded-lg bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-400">
              {satelliteConfidence}%
            </span>
          </div>

          <input
            type="range"
            min="50"
            max="99"
            value={satelliteConfidence}
            onChange={(e) =>
              setSatelliteConfidence(Number(e.target.value))
            }
            className="mt-6 w-full accent-cyan-400"
          />
        </div>

        {/* Drift mode */}
        <div className="rounded-2xl border border-white/10 bg-[#0a1424] p-5">
          <p className="text-sm font-bold text-white">
            Drift Analysis Mode
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Select the analysis direction shown in the workspace.
          </p>

          <select
            value={driftMode}
            onChange={(e) => setDriftMode(e.target.value)}
            className="mt-5 w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-xs text-slate-300 outline-none focus:border-cyan-400/40"
          >
            <option value="both">Hindcast + Forecast</option>
            <option value="hindcast">Hindcast Only</option>
            <option value="forecast">Forecast Only</option>
          </select>
        </div>

        {/* Data source */}
        <div className="rounded-2xl border border-white/10 bg-[#0a1424] p-5">
          <p className="text-sm font-bold text-white">
            Satellite Data Source
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Preferred imagery source for the investigation workspace.
          </p>

          <select
            value={dataSource}
            onChange={(e) => setDataSource(e.target.value)}
            className="mt-5 w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-xs text-slate-300 outline-none focus:border-cyan-400/40"
          >
            <option value="sentinel1">Sentinel-1 SAR</option>
            <option value="sentinel2">Sentinel-2 Optical</option>
            <option value="multi">Multi-Sensor</option>
          </select>
        </div>
      </section>

      {/* Current values */}
      <section className="rounded-2xl border border-white/10 bg-[#0a1424] p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
          Current Configuration
        </p>

        <h3 className="mt-2 text-lg font-bold text-white">
          Active Parameters
        </h3>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {[
            ["Radius", `${searchRadius} km`],
            ["Time Window", `± ${timeWindow}h`],
            ["Risk Threshold", `${riskThreshold}%`],
            ["Satellite Confidence", `${satelliteConfidence}%`],
            ["Drift Mode", driftMode],
            ["Data Source", dataSource],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
            >
              <p className="text-[9px] uppercase tracking-wider text-slate-600">
                {label}
              </p>

              <p className="mt-2 break-words text-xs font-bold text-white">
                {value}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Configuration;