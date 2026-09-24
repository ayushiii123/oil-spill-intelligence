import { useEffect, useState } from "react";

const DriftAnalysis = () => {
  const [detectionResult, setDetectionResult] = useState(null);
  const [driftResult, setDriftResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedDetection = sessionStorage.getItem(
      "oilSpillDetectionResult"
    );

    if (!savedDetection) return;

    try {
      setDetectionResult(JSON.parse(savedDetection));
    } catch (err) {
      console.error("Unable to restore detection result:", err);
    }
  }, []);

  useEffect(() => {
    const savedDrift = sessionStorage.getItem(
      "oilSpillDriftResult"
    );

    if (!savedDrift) return;

    try {
      setDriftResult(JSON.parse(savedDrift));
    } catch (err) {
      console.error("Unable to restore drift result:", err);
      sessionStorage.removeItem("oilSpillDriftResult");
    }
  }, []);

  const analyzeDrift = async () => {
    const latitude =
      detectionResult?.detection?.geospatial?.spillCentroid
        ?.latitude;

    const longitude =
      detectionResult?.detection?.geospatial?.spillCentroid
        ?.longitude;

    if (latitude == null || longitude == null) {
      setError(
        "Satellite geolocation is unavailable for drift analysis."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/drift/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            latitude,
            longitude,
            originTime: null,
            sceneDate: "2018-09-26",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Drift analysis failed."
        );
      }

      setDriftResult(data);

      sessionStorage.setItem(
        "oilSpillDriftResult",
        JSON.stringify(data)
      );
    } catch (err) {
      console.error("Drift analysis error:", err);

      setError(
        err.message || "Unable to analyze spill drift."
      );
    } finally {
      setLoading(false);
    }
  };

  const detection = detectionResult?.detection;
  const drift = driftResult?.driftAnalysis;

  return (
    <div className="space-y-8">
      {/* Header */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-400">
          Module 02 • Ocean Intelligence
        </p>

        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Drift Analysis
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Reconstruct probable spill origin and analyze surface
          movement using available environmental signals.
        </p>
      </section>

      {/* Dependency status */}
      <section className="rounded-2xl border border-white/10 bg-[#0a1424] p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Analysis Dependency
            </p>

            <h3 className="mt-2 text-sm font-bold text-white">
              Satellite Detection
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Drift analysis requires a valid satellite geospatial
              candidate.
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-3 py-1.5 text-[10px] font-bold ${
              detection
                ? "bg-emerald-400/10 text-emerald-400"
                : "bg-white/5 text-slate-500"
            }`}
          >
            {detection ? "DETECTION AVAILABLE" : "WAITING FOR DETECTION"}
          </span>
        </div>
      </section>

      {/* Main */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.85fr_1.4fr]">
        {/* Origin input */}
        <div className="rounded-2xl border border-white/10 bg-[#0a1424] p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
            Spill Candidate
          </p>

          <h3 className="mt-2 text-lg font-bold text-white">
            Geospatial Origin Input
          </h3>

          {!detection ? (
            <div className="mt-6 rounded-xl border border-dashed border-white/10 bg-[#050d19] p-6 text-center">
              <div className="text-3xl opacity-60">🛰️</div>

              <p className="mt-4 text-sm font-semibold text-slate-400">
                Satellite result required
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-600">
                Run Satellite Detection first. Its geospatial
                candidate will be used here automatically.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                  Spill Candidate
                </p>

                <p className="mt-2 text-xl font-black text-white">
                  {detection.geospatial?.spillCentroid
                    ? `${Number(
                        detection.geospatial.spillCentroid.latitude
                      ).toFixed(4)}, ${Number(
                        detection.geospatial.spillCentroid.longitude
                      ).toFixed(4)}`
                    : "Unavailable"}
                </p>

                <p className="mt-2 text-[10px] leading-5 text-slate-500">
                  Candidate coordinates supplied by the satellite
                  analysis pipeline.
                </p>
              </div>

              <button
                type="button"
                onClick={analyzeDrift}
                disabled={loading || !detection?.geospatial?.spillCentroid}
                className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Analyzing Drift..."
                  : "Run Drift Analysis →"}
              </button>

              {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-xs text-red-300">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Output */}
        <div className="rounded-2xl border border-white/10 bg-[#0a1424] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
                Ocean Analysis
              </p>

              <h3 className="mt-2 text-lg font-bold text-white">
                Drift & Origin Results
              </h3>
            </div>

            {drift && (
              <span className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold text-emerald-400">
                READY
              </span>
            )}
          </div>

          {!drift ? (
            <div className="mt-6 flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-white/5 bg-[#050d19] text-center">
              <div className="text-3xl opacity-60">🌊</div>

              <p className="mt-4 text-sm font-semibold text-slate-400">
                Awaiting drift analysis
              </p>

              <p className="mt-2 max-w-sm text-xs leading-5 text-slate-600">
                Run the analysis to view probable origin,
                confidence and environmental conditions.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {/* Primary metrics */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="text-[10px] text-slate-500">
                    Probable Origin
                  </p>

                  <p className="mt-2 text-sm font-bold text-blue-300">
                    {drift.origin?.latitude?.toFixed(4)},{" "}
                    {drift.origin?.longitude?.toFixed(4)}
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="text-[10px] text-slate-500">
                    Confidence
                  </p>

                  <p className="mt-2 text-xl font-black text-blue-400">
                    {(
                      Number(drift.confidence ?? 0) * 100
                    ).toFixed(0)}
                    %
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="text-[10px] text-slate-500">
                    Model
                  </p>

                  <p className="mt-2 text-xs font-bold text-white">
                    {drift.modelInfo?.method ??
                      "Surface drift model"}
                  </p>
                </div>
              </div>

              {/* Environmental conditions */}
              <div className="rounded-xl border border-blue-400/10 bg-blue-400/[0.03] p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  Environmental Conditions
                </p>

                <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-[10px] text-slate-600">
                      Wind Speed
                    </p>

                    <p className="mt-1 text-sm font-bold text-white">
                      {drift.environmentalConditions
                        ?.windSpeedKnots ?? "--"}{" "}
                      kn
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-600">
                      Wind Direction
                    </p>

                    <p className="mt-1 text-sm font-bold text-white">
                      {drift.environmentalConditions
                        ?.windDirection ?? "--"}°
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-600">
                      Current Speed
                    </p>

                    <p className="mt-1 text-sm font-bold text-white">
                      {drift.environmentalConditions
                        ?.currentSpeedKnots ?? "--"}{" "}
                      kn
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-600">
                      Current Direction
                    </p>

                    <p className="mt-1 text-sm font-bold text-white">
                      {drift.environmentalConditions
                        ?.currentDirection ?? "--"}°
                    </p>
                  </div>
                </div>
              </div>

              {/* Method note */}
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <p className="text-xs font-semibold text-white">
                  Analysis Status
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Probable origin and environmental conditions are
                  available for the next AIS correlation stage.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DriftAnalysis;