import { useEffect, useState } from "react";
import { fromArrayBuffer } from "geotiff";

const SatelliteDetection = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
useEffect(() => {
  const savedResult = sessionStorage.getItem(
    "oilSpillDetectionResult"
  );

  if (savedResult) {
    try {
      setResult(JSON.parse(savedResult));
    } catch (error) {
      console.error(
        "Unable to restore satellite detection result:",
        error
      );
      sessionStorage.removeItem(
        "oilSpillDetectionResult"
      );
    }
  }

  const savedPreview = sessionStorage.getItem(
    "oilSpillSatellitePreview"
  );

  if (savedPreview) {
    setPreviewUrl(savedPreview);
  }
}, []);
  const handleFileChange = async (event) => {
  const file = event.target.files?.[0];

  if (!file) return;

  setSelectedFile(file);
  setResult(null);
  setError("");

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }

  const isTiff =
    file.type === "image/tiff" ||
    file.type === "image/x-tiff" ||
    /\.(tif|tiff)$/i.test(file.name);

  try {
    // JPG / PNG
    if (!isTiff) {
      setPreviewUrl(URL.createObjectURL(file));
      return;
    }

    // TIFF preview
    const buffer = await file.arrayBuffer();

    const tiff = await fromArrayBuffer(buffer);
    const image = await tiff.getImage();

    const width = image.getWidth();
    const height = image.getHeight();

    const raster = await image.readRasters({
      samples: [0],
      interleave: true,
    });

    const values = raster.filter((value) =>
      Number.isFinite(value)
    );

    if (!values.length) {
      throw new Error("No valid SAR pixel values found.");
    }

    const maxSamples = 200000;

    let sampled = values;

    if (values.length > maxSamples) {
      const step = Math.ceil(
        values.length / maxSamples
      );

      sampled = [];

      for (let i = 0; i < values.length; i += step) {
        sampled.push(values[i]);
      }
    }

    sampled.sort((a, b) => a - b);

    const low =
      sampled[Math.floor(sampled.length * 0.02)];

    const high =
      sampled[Math.floor(sampled.length * 0.98)];

    const maxPreviewWidth = 1400;

    const scale = Math.min(
      1,
      maxPreviewWidth / width
    );

    const previewWidth = Math.max(
      1,
      Math.round(width * scale)
    );

    const previewHeight = Math.max(
      1,
      Math.round(height * scale)
    );

    const canvas = document.createElement("canvas");

    canvas.width = previewWidth;
    canvas.height = previewHeight;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Unable to create canvas context.");
    }

    const imageData = ctx.createImageData(
      previewWidth,
      previewHeight
    );

    for (let y = 0; y < previewHeight; y++) {
      const sourceY = Math.min(
        height - 1,
        Math.floor(y / scale)
      );

      for (let x = 0; x < previewWidth; x++) {
        const sourceX = Math.min(
          width - 1,
          Math.floor(x / scale)
        );

        const sourceIndex =
          sourceY * width + sourceX;

        const value = Number(
          raster[sourceIndex]
        );

        let stretched = 0;

        if (Number.isFinite(value)) {
          if (high > low) {
            stretched =
              ((value - low) /
                (high - low)) *
              255;
          }
        }

        stretched = Math.max(
          0,
          Math.min(255, stretched)
        );

        const pixelIndex =
          (y * previewWidth + x) * 4;

        imageData.data[pixelIndex] =
          stretched;

        imageData.data[pixelIndex + 1] =
          stretched;

        imageData.data[pixelIndex + 2] =
          stretched;

        imageData.data[pixelIndex + 3] =
          255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const pngUrl =
      canvas.toDataURL("image/png");

    setPreviewUrl(pngUrl);
  } catch (error) {
    console.error(
      "TIFF preview error:",
      error
    );

    setPreviewUrl("");

    setError(
      "TIFF preview could not be generated, but the satellite file is still selected."
    );
  }
};

  const removeFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError("");
    sessionStorage.removeItem("oilSpillDetectionResult");
  };

  const analyzeImage = async () => {
    if (!selectedFile) {
      setError("Please select a satellite image first.");
      return;
    }

    setAnalyzing(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/satellite/detect`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Satellite detection failed.");
      }

      setResult(data);
      sessionStorage.setItem(
  "oilSpillDetectionResult",
  JSON.stringify(data)
);
      
    } catch (err) {
      console.error("Satellite detection error:", err);
      setError(
        err.message || "Unable to analyze satellite imagery."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const detection = result?.detection;

  return (
    <div className="space-y-8">
      {/* Header */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400">
          Module 01 • Satellite Intelligence
        </p>

        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Satellite Detection
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Upload satellite imagery and analyze the scene for potential
          oil-spill signatures.
        </p>
      </section>

      {/* Main grid */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        {/* Upload / Preview */}
        <div className="rounded-2xl border border-white/10 bg-[#0a1424] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Satellite Input
              </p>

              <h3 className="mt-2 text-lg font-bold text-white">
                Upload Imagery
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Supported formats: JPG, PNG and TIFF.
              </p>
            </div>

            <span className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] text-slate-400">
              SAR / EO
            </span>
          </div>

          {!previewUrl ? (
            <label className="mt-6 flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-cyan-400/20 bg-[#050d19] px-6 text-center transition hover:border-cyan-400/50 hover:bg-cyan-400/[0.03]">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-3xl">
                🛰️
              </div>

              <p className="mt-5 text-sm font-semibold text-white">
                Select satellite image
              </p>

              <p className="mt-2 max-w-sm text-xs leading-5 text-slate-600">
                Choose a SAR or optical satellite image to start
                the detection workflow.
              </p>

              <span className="mt-5 rounded-lg bg-cyan-500 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-cyan-400">
                Browse Files
              </span>

              <input
                type="file"
                accept="image/png,image/jpeg,image/tiff"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="mt-6">
              <div className="overflow-hidden rounded-xl border border-cyan-400/20 bg-[#050d19]">
                <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white">
                      {selectedFile?.name}
                    </p>

                    <p className="mt-1 text-[10px] text-slate-500">
                      {selectedFile
                        ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                        : ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={removeFile}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-[10px] text-slate-400 transition hover:bg-white/10 hover:text-white"
                  >
                    Remove
                  </button>
                </div>

                <div className="flex min-h-[320px] items-center justify-center bg-black/20 p-4">
                  <img
                    src={previewUrl}
                    alt="Selected satellite imagery"
                    className="max-h-[340px] w-full rounded-lg object-contain"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={analyzeImage}
                disabled={analyzing}
                className="mt-4 w-full rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {analyzing
                  ? "Analyzing Satellite Imagery..."
                  : "Analyze Oil Spill →"}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-xs text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Analysis summary */}
        <div className="rounded-2xl border border-white/10 bg-[#0a1424] p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
            Detection Output
          </p>

          <h3 className="mt-2 text-lg font-bold text-white">
            Analysis Summary
          </h3>

          {!detection ? (
            <div className="mt-6 flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-white/5 bg-[#050d19] text-center">
              <div className="text-3xl opacity-60">◌</div>

              <p className="mt-4 text-sm font-semibold text-slate-400">
                Awaiting analysis
              </p>

              <p className="mt-2 max-w-xs text-xs leading-5 text-slate-600">
                Upload satellite imagery and run detection to view
                analytical results here.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.03] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      Detection Complete
                    </p>

                    <h4 className="mt-2 text-lg font-bold text-white">
                      {detection.detected
                        ? "Potential Oil Spill Detected"
                        : "No Oil Spill Detected"}
                    </h4>
                  </div>

                  <span className="rounded-full bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-300">
                    {(
                      Number(detection.probabilities?.oil ?? 0) * 100
                    ).toFixed(2)}
                    %
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="text-[10px] text-slate-500">
                    Classification
                  </p>

                  <p className="mt-2 text-sm font-bold text-white">
                    {detection.classification ?? "N/A"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="text-[10px] text-slate-500">
                    Oil Probability
                  </p>

                  <p className="mt-2 text-sm font-bold text-cyan-400">
                    {(
                      Number(detection.probabilities?.oil ?? 0) * 100
                    ).toFixed(2)}
                    %
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="text-[10px] text-slate-500">
                    Image Coverage
                  </p>

                  <p className="mt-2 text-sm font-bold text-white">
                    {detection.geometry?.areaPercentage ?? "--"}%
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="text-[10px] text-slate-500">
                    Orientation
                  </p>

                  <p className="mt-2 text-sm font-bold text-white">
                    {detection.geometry?.orientationDegrees ?? "--"}°
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/[0.03] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  Next Step
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Detection results can be used as the starting point
                  for drift/origin analysis.
                </p>
                <button
  type="button"
  onClick={() => {
    window.location.href = "/drift";
  }}
  className="mt-4 w-full rounded-xl border border-blue-400/20 bg-blue-400/10 px-4 py-3 text-xs font-bold text-blue-300 transition hover:bg-blue-400/15"
>
  Continue to Drift Analysis →
</button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default SatelliteDetection;