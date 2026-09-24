import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import "./App.css";
import "leaflet/dist/leaflet.css";
import MapView from "./MapView";
import { fromArrayBuffer } from "geotiff";
function AppContent() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const [error, setError] = useState("");

  const [driftResult, setDriftResult] = useState(null);
  const [driftLoading, setDriftLoading] = useState(false);
  const [driftError, setDriftError] = useState("");

  const [aisResult, setAisResult] = useState(null);
  const [investigations, setInvestigations] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
const [historyLoading, setHistoryLoading] = useState(false);
const [historyError, setHistoryError] = useState("");
  const [aisSearchRadius, setAisSearchRadius] = useState(50);
  const [aisTimeWindow, setAisTimeWindow] = useState(2);
  const [riskThreshold, setRiskThreshold] = useState(50);
  const [aisLoading, setAisLoading] = useState(false);
  const [aisError, setAisError] = useState("");
const [alertAcknowledged, setAlertAcknowledged] = useState(false);
  const [liveAisVessels, setLiveAisVessels] =
    useState([]);
console.log("APP COMPONENT RENDERING FOR LIVE AIS");
  useEffect(() => {
    console.log("LIVE AIS EFFECT STARTED");
    let cancelled = false;

    const fetchLiveAIS = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/ais/live"
        );

        if (!response.ok) {
          throw new Error(
            `Live AIS request failed: ${response.status}`
          );
        }

        const data = await response.json();

        if (cancelled) {
          return;
        }

        const vessels =
          Array.isArray(data.vessels)
            ? data.vessels
            : [];

        setLiveAisVessels(vessels);

        console.log(
          "LIVE AIS FROM BACKEND:",
          {
            count: vessels.length,
            vessels,
          }
        );
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Live AIS fetch error:",
            error
          );
        }
      }
    };

    fetchLiveAIS();

    const intervalId = setInterval(
      fetchLiveAIS,
      5000
    );

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

useEffect(() => {
  console.log("🔥 HISTORY EFFECT STARTED");

  fetch("http://127.0.0.1:5000/api/investigations")
    .then((response) => {
      console.log("🔥 HISTORY RESPONSE STATUS:", response.status);
      return response.json();
    })
    .then((data) => {
      console.log("🔥 HISTORY DATA:", data);

      setInvestigations(data.investigations || []);
    })
    .catch((error) => {
      console.error("🔥 HISTORY FETCH ERROR:", error);
      setHistoryError(error.message);
    });
}, []);
const handleFileChange = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setSelectedFile(file);
  setDetectionResult(null);
  setDriftResult(null);
  setAisResult(null);
  setError("");
  setDriftError("");
  setAisError("");

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }

  const isTiff =
    file.type === "image/tiff" ||
    file.type === "image/x-tiff" ||
    /\.(tif|tiff)$/i.test(file.name);

  try {
    // Normal PNG / JPG
    if (!isTiff) {
      setPreviewUrl(URL.createObjectURL(file));
      return;
    }

    // --------------------------------------------------
    // Read Sentinel-1 Float32 GeoTIFF
    // --------------------------------------------------

    const buffer = await file.arrayBuffer();

    const tiff = await fromArrayBuffer(buffer);
    const image = await tiff.getImage();

    const width = image.getWidth();
    const height = image.getHeight();

    const raster = await image.readRasters({
      samples: [0],
      interleave: true,
    });

    // --------------------------------------------------
    // Get valid SAR values
    // --------------------------------------------------

    const values = raster.filter(
      (value) => Number.isFinite(value)
    );

    if (!values.length) {
      throw new Error("No valid SAR pixel values found.");
    }

    // --------------------------------------------------
    // Calculate 2nd and 98th percentile
    // using a sampled subset to reduce memory usage
    // --------------------------------------------------

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

    console.log("SAR PREVIEW RANGE:", {
      width,
      height,
      low,
      high,
    });

    // --------------------------------------------------
    // Create smaller browser preview
    // --------------------------------------------------

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

    // --------------------------------------------------
    // Contrast stretch SAR values
    // --------------------------------------------------

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

        imageData.data[pixelIndex] = stretched;
        imageData.data[pixelIndex + 1] = stretched;
        imageData.data[pixelIndex + 2] = stretched;
        imageData.data[pixelIndex + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const pngUrl = canvas.toDataURL(
      "image/png"
    );

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
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setSelectedFile(null);
    setPreviewUrl(null);
    setDetectionResult(null);
    setDriftResult(null);
    setAisResult(null);
    setError("");
    setDriftError("");
    setAisError("");
  };
const analyzeSatelliteImage = async () => {
  if (!selectedFile) {
    setError("Please select a satellite image first.");
    return;
  }

  setAnalyzing(true);
  setError("");
  setDetectionResult(null);
  setDriftResult(null);
  setAisResult(null);
  setDriftError("");
  setAisError("");

  try {
    const formData = new FormData();
    formData.append("file", selectedFile);

    const response = await fetch(
      "http://localhost:5000/api/satellite/detect",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Detection failed");
    }

    console.log("REAL CNN DETECTION RESULT:", data);

    const mlResult = data.detection || data;

    const detected = Boolean(mlResult.detected);

    const oilProbability = Number(
      mlResult.probabilities?.oil ?? 0
    );

    const noOilProbability = Number(
      mlResult.probabilities?.noOil ?? 0
    );

    const normalizedResult = {
      ...data,

      detection: {
        ...mlResult,

        detected,

        classification:
          mlResult.classification ||
          (detected ? "oil_spill" : "no_oil"),

        // This is always the oil probability.
        oilProbability,

        // Keep predicted-class confidence separately.
        modelConfidence: Number(
          mlResult.confidence ?? 0
        ),

        probabilities: {
          noOil: noOilProbability,
          oil: oilProbability,
        },

        model: mlResult.model || null,

        geometry: mlResult.geometry || {
          available: false,
        },

        geospatial: mlResult.geospatial || {
          available: false,
        },

        areaKm2: null,

        shape: {
          lengthKm: null,
          widthKm: null,
          orientationDegrees: null,
        },

        centroid: null,
      },
    };

    console.log("NORMALIZED DETECTION STATE:", {
      detected: normalizedResult.detection.detected,
      classification:
        normalizedResult.detection.classification,
      oilProbability:
        normalizedResult.detection.oilProbability,
      noOilProbability:
        normalizedResult.detection.probabilities.noOil,
      modelConfidence:
        normalizedResult.detection.modelConfidence,
    });
console.log(
  "FINAL DETECTED VALUE:",
  normalizedResult.detection.detected
);
    setDetectionResult(normalizedResult);
  } catch (err) {
    console.error("SATELLITE DETECTION ERROR:", err);

    setError(
      err.message || "Unable to analyze satellite image."
    );
  } finally {
    setAnalyzing(false);
  }
};
 const analyzeDrift = async () => {
console.log(
  "SATELLITE GEOSPATIAL DATA FOR DRIFT:",
  detectionResult?.detection?.geospatial
);
  // Real Sentinel-1 SAR candidate
  // Candidate 1 geolocation derived from the Sentinel-1
const latitude =
  detectionResult?.detection?.geospatial?.spillCentroid?.latitude;

const longitude =
  detectionResult?.detection?.geospatial?.spillCentroid?.longitude;
  if (
  latitude == null ||
  longitude == null
) {
  setDriftError(
    "Satellite geolocation is unavailable."
  );
  return;
}
  // The TIFF filename identifies the scene date,
// but the supplied TIFF metadata does not contain
// the exact satellite acquisition time.

const sceneDate = "2018-09-26";
const originTime = null;

  setDriftLoading(true);
  setDriftError("");
  setDriftResult(null);

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
          sceneDate,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Drift analysis failed"
      );
    }

    setDriftResult(data);

    console.log(
      "DRIFT ANALYSIS FROM SENTINEL-1 CANDIDATE:",
      data
    );
  } catch (error) {
    console.error(error);
    setDriftError(
      "Unable to analyze spill drift."
    );
  } finally {
    setDriftLoading(false);
  }
};

 const analyzeAIS = async () => {
  if (!driftResult?.driftAnalysis?.origin) {
    setAisError("Please analyze drift before running AIS correlation.");
    return;
  }

  const {
    latitude,
    longitude,
    originTime,
  } = driftResult.driftAnalysis.origin;

  setAisLoading(true);
  setAisError("");
  setAisResult(null);

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
          searchRadiusKm: Number(aisSearchRadius),
          timeWindowHours: Number(aisTimeWindow),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "AIS correlation failed"
      );
    }

    const vessels = data.vessels || [];

    const filteredVessels = vessels.filter(
      (vessel) =>
        Number(vessel.suspectProbability || 0) >=
        Number(riskThreshold)
    );

    setAisResult({
      ...data,
      vessels: filteredVessels,
    });

    console.log(
      "AIS CORRELATION FROM DYNAMIC DRIFT ORIGIN:",
      {
        latitude,
        longitude,
        originTime,
        searchRadiusKm: Number(aisSearchRadius),
        timeWindowHours: Number(aisTimeWindow),
        totalVessels: vessels.length,
        filteredVessels: filteredVessels.length,
        result: data,
      }
    );
  } catch (error) {
    console.error("AIS correlation error:", error);

    setAisError(
      error.message || "Unable to analyze AIS correlation."
    );
  } finally {
    setAisLoading(false);
  }
};

 const newInvestigation = () => {
  removeFile();
};
const saveInvestigation = async () => {
  if (!detectionResult) {
    alert("Please complete satellite detection first.");
    return;
  }

  try {
    console.log("SAVE AIS DEBUG:", {
  vesselCount: aisResult?.vessels?.length,
  topVessel: aisResult?.vessels?.[0],
  trackPointCount: aisResult?.vessels?.[0]?.track?.length,
  track: aisResult?.vessels?.[0]?.track,
});
   const payload = {
  investigationId: `INV-${Date.now()}`,
  title: "Oil Spill Investigation",
  sceneDate: "2018-09-26",
      satellite: detectionResult,
      drift: driftResult || null,
      ais: aisResult || null,

      risk: topVessel
        ? {
            vesselName: topVessel.vesselName,
            vesselId: topVessel.vesselId,
            suspectProbability:
              topVessel.suspectProbability,
            riskLevel:
              topVessel.riskLevel,
            distanceKm:
              topVessel.distanceKm,
            trajectoryAlignment:
              topVessel.trajectoryAlignment,
            aisGapMinutes:
              topVessel.aisGapMinutes,
            behaviourScore:
              topVessel.behaviourScore,
            evidenceCoverage:
              topVessel.evidenceCoverage,
          }
        : null,

      status: {
        satellite: Boolean(detectionResult),
        drift: Boolean(driftResult),
        ais: Boolean(aisResult),
        risk: Boolean(topVessel),
      },
    };
const requestBody = JSON.stringify(payload);

console.log(
  "SAVE PAYLOAD SIZE:",
  (new Blob([requestBody]).size / 1024 / 1024).toFixed(2),
  "MB"
);
   const response = await fetch(
  "http://127.0.0.1:5000/api/investigations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
       
        body: requestBody,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to save investigation"
      );
    }

    console.log("INVESTIGATION SAVED:", data);

    alert(
      data.investigation?.investigationId
        ? `Investigation saved successfully: ${data.investigation.investigationId}`
        : "Investigation saved successfully"
    );
  } catch (error) {
    console.error("SAVE INVESTIGATION ERROR:", error);

    alert(
      error.message ||
        "Unable to save investigation"
    );
  }
};

const generateInvestigationReport = () => {
  if (!detectionResult) {
    alert("Please complete satellite detection first.");
    return;
  }
 

  const detection = detectionResult.detection;
  const geometry = detection?.geometry;
  const drift = driftResult?.driftAnalysis;
  const vessels = aisResult?.vessels || [];

  const top = vessels.length > 0 ? vessels[0] : null;

  const formatIST = (isoTime) => {
  if (
    isoTime === null ||
    isoTime === undefined ||
    isoTime === ""
  ) {
    return "Not available";
  }

  const date = new Date(isoTime);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return `${date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  })}, ${date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  })} IST`;
};

  const detectionConfidence =
    Number(
      detection?.confidence ??
        detection?.probabilities?.oil ??
        0
    ) * 100;

  const areaPercentage =
    geometry?.areaPercentage != null
      ? Number(geometry.areaPercentage)
      : null;

  const lengthPixels =
    geometry?.lengthPixels ??
    geometry?.length ??
    null;

  const widthPixels =
    geometry?.widthPixels ??
    geometry?.width ??
    null;

  const orientationDegrees =
    geometry?.orientationDegrees != null
      ? Number(geometry.orientationDegrees)
      : null;

  const sarCandidateLatitude = 17.588738;
  const sarCandidateLongitude = 73.149264;

  const vesselRows = vessels
    .map(
      (vessel, index) => `
        <tr>
          <td>${index + 1}</td>

          <td>
            <strong>${vessel.vesselName ?? "Unknown Vessel"}</strong><br />
            <small>${vessel.vesselId ?? "N/A"}</small>
          </td>

          <td>${vessel.vesselType ?? "N/A"}</td>

          <td>${vessel.distanceKm ?? "--"} km</td>

          <td>${vessel.timeDifferenceMinutes ?? "--"} min</td>

          <td>${Math.round(
            vessel.trajectoryAlignment ?? 0
          )}%</td>

          <td>${vessel.aisGapMinutes ?? "--"} min</td>

          <td>
            <strong>
              ${vessel.suspectProbability ?? "--"}%
            </strong>
          </td>

          <td>${vessel.riskLevel ?? "N/A"}</td>
        </tr>
      `
    )
    .join("");

  const evidenceSignals =
    top?.riskFactors?.length > 0
      ? top.riskFactors
          .map((factor) => `<li>${factor}</li>`)
          .join("")
      : `
          <li>
            High spatial proximity
            (${top?.distanceKm ?? "--"} km)
          </li>

          <li>
            Time correlation
            (${top?.timeDifferenceMinutes ?? "--"} min)
          </li>

          <li>
            Trajectory alignment
            (${Math.round(top?.trajectoryAlignment ?? 0)}%)
          </li>

          <li>
            AIS transmission gap
            (${top?.aisGapMinutes ?? "--"} min)
          </li>
        `;

  const generatedTime = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

  const reportWindow = window.open(
    "",
    "_blank",
    "width=1100,height=800"
  );

  if (!reportWindow) {
    alert("Please allow pop-ups to generate the report.");
    return;
  }

  reportWindow.document.write(`
    <!DOCTYPE html>

    <html>

      <head>

        <title>
          Oil Spill Investigation Report
        </title>

        <style>

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 40px;
            font-family:
              Arial,
              Helvetica,
              sans-serif;

            background: #f4f7fb;
            color: #172033;
          }

          .report {
            max-width: 1050px;
            margin: auto;
            background: white;
            padding: 42px;

            box-shadow:
              0 8px 30px
              rgba(0,0,0,0.08);
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;

            border-bottom: 3px solid #0e7490;

            padding-bottom: 22px;
            margin-bottom: 30px;
          }

          .title {
            font-size: 28px;
            font-weight: 800;
            color: #0f172a;
          }

          .subtitle {
            margin-top: 7px;
            color: #64748b;
            font-size: 13px;
          }

          .badge {
            background: #e0f2fe;
            color: #0369a1;

            padding: 8px 12px;
            border-radius: 20px;

            font-size: 11px;
            font-weight: 700;
          }

          h2 {
            margin-top: 32px;
            margin-bottom: 15px;

            font-size: 17px;
            color: #0f172a;

            border-left: 4px solid #0891b2;

            padding-left: 10px;
          }

          .grid {
            display: grid;

            grid-template-columns:
              repeat(4, 1fr);

            gap: 12px;
          }

          .card {
            border:
              1px solid #e2e8f0;

            border-radius: 8px;

            padding: 14px;

            background: #f8fafc;
          }

          .label {
            font-size: 10px;

            color: #64748b;

            text-transform: uppercase;

            font-weight: 700;
          }

          .value {
            margin-top: 6px;

            font-size: 18px;

            font-weight: 800;

            color: #0f172a;
          }

          .small-note {
            margin-top: 6px;

            font-size: 10px;

            line-height: 1.5;

            color: #64748b;
          }

          .geo-box {
            margin-top: 14px;

            border:
              1px solid #bae6fd;

            background: #f0f9ff;

            border-radius: 8px;

            padding: 15px;
          }

          .geo-title {
            font-size: 11px;

            font-weight: 800;

            color: #0369a1;

            text-transform: uppercase;

            margin-bottom: 8px;
          }

          .geo-value {
            font-size: 14px;

            font-weight: 800;

            color: #0f172a;
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
            border-bottom:
              1px solid #e2e8f0;

            padding: 10px 8px;
          }

          tr:nth-child(even) {
            background: #f8fafc;
          }

          .top-suspect {
            border:
              2px solid #dc2626;

            background: #fff7f7;

            border-radius: 10px;

            padding: 20px;
          }

          .risk {
            color: #dc2626;

            font-weight: 800;
          }

          ul {
            padding-left: 20px;
          }

          li {
            margin-bottom: 8px;

            color: #475569;

            font-size: 12px;
          }

          .disclaimer {
            margin-top: 35px;

            padding: 15px;

            background: #fff7ed;

            border:
              1px solid #fed7aa;

            border-radius: 8px;

            color: #9a3412;

            font-size: 11px;

            line-height: 1.6;
          }

          .method-note {
            margin-top: 15px;

            padding: 14px;

            background: #f8fafc;

            border:
              1px solid #e2e8f0;

            border-radius: 8px;

            color: #475569;

            font-size: 11px;

            line-height: 1.6;
          }

          .footer {
            margin-top: 30px;

            padding-top: 15px;

            border-top:
              1px solid #e2e8f0;

            font-size: 10px;

            color: #94a3b8;

            display: flex;

            justify-content: space-between;
          }

          .print-btn {
            position: fixed;

            top: 20px;
            right: 20px;

            background: #0891b2;

            color: white;

            border: none;

            border-radius: 7px;

            padding: 11px 18px;

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

            .print-btn {
              display: none;
            }

          }

          @media (max-width: 800px) {

            body {
              padding: 15px;
            }

            .report {
              padding: 20px;
            }

            .grid {
              grid-template-columns:
                repeat(2, 1fr);
            }

          }

        </style>

      </head>

      <body>

        <button
          class="print-btn"
          onclick="window.print()"
        >
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


          <h2>
            Executive Summary
          </h2>

          <div class="grid">

            <div class="card">

              <div class="label">
                Detection Confidence
              </div>

              <div class="value">
                ${detectionConfidence.toFixed(2)}%
              </div>

            </div>


            <div class="card">

              <div class="label">
                Image Coverage
              </div>

              <div class="value">
                ${
                  areaPercentage != null
                    ? `${areaPercentage.toFixed(2)}%`
                    : "--"
                }
              </div>

              <div class="small-note">
                Percentage of the analyzed SAR chip
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
                ${top?.suspectProbability ?? "--"}%
              </div>

            </div>

          </div>


          <h2>
            01 • Satellite Detection
          </h2>

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
                Image Coverage
              </div>

              <div class="value">
                ${
                  areaPercentage != null
                    ? `${areaPercentage.toFixed(2)}%`
                    : "--"
                }
              </div>

            </div>


            <div class="card">

              <div class="label">
                Detected Length
              </div>

              <div class="value">
                ${
                  lengthPixels != null
                    ? `${Number(lengthPixels).toFixed(2)} px`
                    : "--"
                }
              </div>

            </div>


            <div class="card">

              <div class="label">
                Detected Width
              </div>

              <div class="value">
                ${
                  widthPixels != null
                    ? `${Number(widthPixels).toFixed(2)} px`
                    : "--"
                }
              </div>

            </div>

          </div>


          <div class="card" style="margin-top:12px;">

            <div class="label">
              Orientation
            </div>

            <div class="value">
              ${
                orientationDegrees != null
                  ? `${orientationDegrees.toFixed(2)}°`
                  : "--"
              }
            </div>

            <div class="small-note">
              Orientation measured in image coordinates.
            </div>

          </div>


          <div class="geo-box">

            <div class="geo-title">
              Sentinel-1 Geospatial Candidate
            </div>

            <div class="geo-value">
              ${sarCandidateLatitude.toFixed(4)},
              ${sarCandidateLongitude.toFixed(4)}
            </div>

            <div class="small-note">
              Approximate geographic location of the
              dark-slick candidate detected in the real
              Sentinel-1 GRD scene. This location is used
              as the starting point for drift analysis.
            </div>

          </div>


          <div class="method-note">

            <strong>
              Measurement note:
            </strong>

            The uploaded ML input is a non-georeferenced
            SAR image chip. Therefore, physical spill area
            in km² and dimensions in km are not inferred
            from pixel measurements. Geospatial coordinates
            are provided separately from the Sentinel-1
            candidate analysis.

          </div>


          ${
            drift
              ? `

                <h2>
                  02 • Drift / Origin Analysis
                </h2>

                <div class="grid">

                  <div class="card">

                    <div class="label">
                      Probable Origin
                    </div>

                    <div class="value">
                      ${drift.origin.latitude.toFixed(4)},
                      ${drift.origin.longitude.toFixed(4)}
                    </div>

                    <div class="small-note">
                      Estimated origin region
                    </div>

                  </div>

<div class="card">

  <div class="label">
    Origin Time
  </div>

  <div class="value">
  ${
    drift?.originTime === null ||
    drift?.originTime === undefined ||
    drift?.originTime === "" ||
    drift?.originTime === 0 ||
    drift?.originTime === "0" ||
    drift?.originTime === "1970-01-01T00:00:00.000Z"
      ? "Not available"
      : formatIST(drift.originTime)
  }
</div>

  <div class="small-note">
    Exact satellite acquisition time is unavailable
    in the supplied TIFF metadata.
  </div>

</div>
                  <div class="card">

                    <div class="label">
                      Hindcast Confidence
                    </div>

                    <div class="value">
                      ${(
                        Number(drift.confidence ?? 0) * 100
                      ).toFixed(0)}%
                    </div>

                  </div>


                  <div class="card">

                    <div class="label">
                      Model
                    </div>

                    <div class="value"
                      style="font-size:14px;"
                    >
                      ${
                        drift.modelInfo?.method ??
                        "Surface drift model"
                      }
                    </div>

                  </div>

                </div>


                <div
                  class="card"
                  style="margin-top:12px;"
                >

                  <strong>
                    Environmental Conditions
                  </strong>

                  <p>
                    Wind:
                    ${
                      drift.environmentalConditions
                        ?.windSpeedKnots ?? "--"
                    } kn /
                    ${
                      drift.environmentalConditions
                        ?.windDirection ?? "--"
                    }°
                  </p>

                  <p>
                    Current:
                    ${
                      drift.environmentalConditions
                        ?.currentSpeedKnots ?? "--"
                    } kn /
                    ${
                      drift.environmentalConditions
                        ?.currentDirection ?? "--"
                    }°
                  </p>

                </div>

              `
              : ""
          }


          ${
            top
              ? `

                <h2>
                  Highest Ranked Vessel
                </h2>

                <div class="top-suspect">

                  <h3>
                    ${top.vesselName}
                  </h3>

                  <p>
                    ${top.vesselId} •
                    ${top.vesselType}
                  </p>

                  <p>
                    <strong>
                      Analytical Suspicion Score:
                    </strong>

                    ${top.suspectProbability}%
                  </p>

                  <p class="risk">
                    ${top.riskLevel} RISK
                  </p>

                  <p>
                    <strong>
                      Distance:
                    </strong>

                    ${top.distanceKm} km
                  </p>

                  <p>
                    <strong>
                      Time Difference:
                    </strong>

                    ${top.timeDifferenceMinutes} min
                  </p>

                  <p>
                    <strong>
                      Trajectory Alignment:
                    </strong>

                    ${Math.round(
                      top.trajectoryAlignment ?? 0
                    )}%
                  </p>

                  <p>
                    <strong>
                      AIS Gap:
                    </strong>

                    ${top.aisGapMinutes} min
                  </p>

                </div>


                <h2>
                  Evidence Signals
                </h2>

                <ul>
                  ${evidenceSignals}
                </ul>

              `
              : ""
          }


          ${
            vessels.length > 0
              ? `

                <h2>
                  03 • AIS Vessel Correlation
                </h2>

                <table>

                  <thead>

                    <tr>

                      <th>Rank</th>
                      <th>Vessel</th>
                      <th>Type</th>
                      <th>Distance</th>
                      <th>Time</th>
                      <th>Trajectory</th>
                      <th>AIS Gap</th>
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


          <h2>
            04 • Vessel Risk Assessment
          </h2>

          <div class="card">

            ${
              top
                ? `
                  <div class="value">
                    ${top.vesselName}
                  </div>

                  <p>
                    Highest ranked candidate with
                    <strong>
                      ${top.suspectProbability}%
                    </strong>
                    analytical suspicion probability.
                  </p>

                  <p>
                    Risk classification:
                    <strong class="risk">
                      ${top.riskLevel}
                    </strong>
                  </p>
                `
                : `
                  <p>
                    Vessel risk assessment is pending
                    AIS correlation.
                  </p>
                `
            }

          </div>


          <div class="disclaimer">

            <strong>
              Important Analytical Disclaimer:
            </strong>

            <br />

            Vessel rankings represent analytical
            suspicion/probability based on available
            satellite, drift and AIS signals.

            They do not establish legal responsibility,
            guilt or definitive causation.

            Probable origin represents an analytical
            region rather than a guaranteed exact source.

            Results should be validated using authoritative
            satellite products, environmental observations
            and verified AIS records before operational or
            legal action.

          </div>


          <div class="footer">

            <span>
              Oil Spill Intelligence • SIH 2026
            </span>

            <span>
              Generated: ${generatedTime} IST
            </span>

          </div>

        </div>

      </body>

    </html>
  `);

  reportWindow.document.close();
};
  
const topVessel = aisResult?.vessels?.[0];
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* ================= TOP BAR ================= */}
      <header className="h-16 border-b border-white/10 bg-[#07111f]">
        <div className="flex h-full items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-lg">
              🛰️
            </div>

            <div>
              <h1 className="text-sm font-bold tracking-wide">
                OIL SPILL INTELLIGENCE
              </h1>
              <p className="text-[10px] text-slate-500">
                Maritime Geo-Intelligence Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden text-right sm:block">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Mission
              </p>
              <p className="text-xs font-semibold text-slate-300">
                SIH 2026 • SPACE TECHNOLOGY
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-emerald-300">
                SYSTEM ONLINE
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ================= BODY ================= */}
      <div className="flex min-h-[calc(100vh-64px)]">
        {/* ================= SIDEBAR ================= */}
        <aside className="hidden w-60 shrink-0 border-r border-white/10 bg-[#050d19] lg:block">
          <div className="p-5">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
              Investigation
            </p>

            <nav className="space-y-1">
              <button className="flex w-full items-center gap-3 rounded-lg border border-cyan-400/10 bg-cyan-400/10 px-4 py-3 text-left text-sm font-semibold text-cyan-300">
                <span>◉</span>
                Overview
              </button>

             <button
  onClick={() =>
    document
      .getElementById("satellite-module")
      ?.scrollIntoView({ behavior: "smooth" })
  }
  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
>
  <span>🛰️</span>
  Satellite Detection
</button>

              <button
                onClick={analyzeDrift}
                disabled={!detectionResult || driftLoading}
                className="mt-2 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>🌊</span>
                Drift Analysis
              </button>

              <button
                onClick={analyzeAIS}
                disabled={!driftResult || aisLoading}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>🚢</span>
                AIS Correlation
              </button>

              <button
                onClick={() =>
                  document
                    .getElementById("vessel-ranking")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                disabled={!aisResult}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>🎯</span>
                Vessel Ranking
              </button>
                        </nav>

            <div className="mt-1">
              <button
                onClick={() =>
                  document
                    .getElementById("alert-center")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                disabled={!detectionResult}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>🚨</span>
                Alert Center
              </button>
            </div>
<button
  onClick={() => {
    setShowHistory(true);

    setTimeout(() => {
      document
        .getElementById("investigation-history")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }}
  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
>
  <span>🕘</span>
  Investigation History
</button>


            <div className="my-6 border-t border-white/5" />

            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
              System
            </p>

            <nav className="space-y-1">
              <button
                onClick={() =>
                  document
                    .getElementById("investigation-report")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <span>📊</span>
                Reports
              </button>

              <button
  onClick={() =>
    document
      .getElementById("configuration")
      ?.scrollIntoView({ behavior: "smooth" })
  }
  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
>
  <span>⚙️</span>
  Configuration
</button>
            </nav>
          </div>

          <div className="absolute bottom-0 hidden w-60 border-t border-white/10 bg-[#050d19] p-4 lg:block">
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-600">
                Analysis Engine
              </p>

              <div className="mt-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-slate-400">
                  Operational
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* ================= MAIN CONTENT ================= */}
        <main className="min-w-0 flex-1 overflow-hidden">
          <div className="mx-auto max-w-[1500px] px-6 py-8 md:px-10 md:py-10 xl:px-12 xl:py-12">
            {/* ================= PAGE TITLE ================= */}
            <section className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                  Maritime Intelligence Center
                </p>

                <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Oil Spill Investigation
                </h2>

                <p className="mt-2 max-w-2xl text-sm text-slate-500">
                  Detect potential oil spills, reconstruct drift
                  movement and correlate vessel activity using
                  satellite and AIS intelligence.
                </p>
              </div>

              <button
                onClick={newInvestigation}
                className="w-fit rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-bold transition hover:bg-cyan-400"
              >
                + New Investigation
              </button>
            </section>

            {/* ================= INTELLIGENCE SUMMARY ================= */}
            <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-[#0a1424] p-6 transition hover:border-cyan-400/30 hover:bg-[#0d192b]">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/10 text-xl">
                    🛰️
                  </div>
                  <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                    READY
                  </span>
                </div>

                <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Module 01
                </p>
                <h3 className="mt-1 text-lg font-bold">
                  Satellite Detection
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  SAR / EO imagery analysis
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0a1424] p-5 transition hover:border-cyan-400/30 hover:bg-[#0d192b]">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-400/10 bg-blue-400/10 text-xl">
                    🌊
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      driftResult
                        ? "bg-emerald-400/10 text-emerald-400"
                        : "bg-white/5 text-slate-500"
                    }`}
                  >
                    {driftResult ? "READY" : "STANDBY"}
                  </span>
                </div>

                <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Module 02
                </p>
                <h3 className="mt-1 text-lg font-bold">
                  Drift Analysis
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Hindcast & forward prediction
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0a1424] p-5 transition hover:border-cyan-400/30 hover:bg-[#0d192b]">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-purple-400/10 bg-purple-400/10 text-xl">
                    🚢
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      aisResult
                        ? "bg-emerald-400/10 text-emerald-400"
                        : "bg-white/5 text-slate-500"
                    }`}
                  >
                    {aisResult ? "READY" : "STANDBY"}
                  </span>
                </div>

                <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Module 03
                </p>
                <h3 className="mt-1 text-lg font-bold">
                  AIS Correlation
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Vessel traffic reconstruction
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0a1424] p-5 transition hover:border-cyan-400/30 hover:bg-[#0d192b]">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/10 bg-amber-400/10 text-xl">
                    🎯
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      topVessel
                        ? "bg-red-400/10 text-red-400"
                        : "bg-white/5 text-slate-500"
                    }`}
                  >
                    {topVessel ? "ACTIVE" : "STANDBY"}
                  </span>
                </div>

                <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Module 04
                </p>
                <h3 className="mt-1 text-lg font-bold">
                  Vessel Risk Scoring
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Proximity & behavioural analysis
                </p>
              </div>
            </section>

            {/* ================= WORKSPACE ================= */}
            <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
              {/* ================= SATELLITE UPLOAD ================= */}
              <div
                id="satellite-module"
                className="rounded-2xl border border-white/10 bg-[#0a1424] p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                      Satellite Input
                    </p>

                    <h3 className="mt-2 text-xl font-bold">
                      Upload Imagery
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Start an investigation using SAR or optical
                      satellite imagery.
                    </p>
                  </div>

                  <div className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-slate-500">
                    JPG • PNG • TIFF
                  </div>
                </div>

                {!previewUrl && (
                  <label className="mt-6 flex min-h-[210px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-cyan-400/20 bg-[#050d19] transition hover:border-cyan-400/50 hover:bg-cyan-400/[0.03]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-2xl">
                      🛰️
                    </div>

                    <p className="mt-4 text-sm font-semibold">
                      Select satellite image
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      Choose SAR or optical imagery
                    </p>

                    <span className="mt-4 rounded-md bg-cyan-500 px-4 py-2 text-xs font-bold text-white">
                      Browse Files
                    </span>

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/tiff"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}

                {previewUrl && selectedFile && (
                  <div className="mt-6">
                    <div className="relative overflow-hidden rounded-xl border border-cyan-400/20 bg-[#050d19]">
                      <img
                        src={previewUrl}
                        alt="Selected satellite imagery"
                        className="h-[260px] w-full object-contain"
                      />

                      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-black/75 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">
                            {selectedFile.name}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-400">
                            {(selectedFile.size / 1024 / 1024).toFixed(
                              2
                            )}{" "}
                            MB
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={removeFile}
                          className="ml-4 rounded-md border border-white/10 px-3 py-1.5 text-[10px] text-slate-400 transition hover:bg-white/10 hover:text-white"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={analyzeSatelliteImage}
                      disabled={analyzing}
                      className="mt-4 w-full rounded-lg bg-cyan-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {analyzing
                        ? "Analyzing Satellite Imagery..."
                        : "Analyze Oil Spill →"}
                    </button>
                  </div>
                )}

                {error && (
                  <div className="mt-4 rounded-lg border border-red-400/20 bg-red-400/5 px-4 py-3 text-xs text-red-300">
                    {error}
                  </div>
                )}

                {detectionResult?.detection && (
                  <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-5">
                    <div className="flex items-start justify-between gap-4">
                    <div>
  <p
    className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
      detectionResult.detection?.detected
        ? "text-cyan-400"
        : "text-emerald-400"
    }`}
  >
    Detection Complete
  </p>

  <h4 className="mt-1 text-lg font-bold">
    {detectionResult.detection?.detected
      ? "Potential Oil Spill Detected"
      : "No Oil Spill Detected"}
  </h4>
</div>

<span
  className={`rounded-full px-3 py-1 text-xs font-bold ${
    detectionResult.detection?.detected
      ? "bg-cyan-400/10 text-cyan-400"
      : "bg-emerald-400/10 text-emerald-400"
  }`}
>
  {(
    Number(
      detectionResult.detection?.probabilities?.oil ?? 0
    ) * 100
  ).toFixed(2)}
  %
</span>
                    </div>

              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
  <div className="rounded-lg border border-white/5 bg-black/10 p-3">
    <p className="text-[10px] text-slate-500">
      Spill Area
    </p>

    <p className="mt-1 text-lg font-bold">
      {detectionResult.detection.geometry?.areaPercentage ?? "--"}%
    </p>

    <p className="mt-1 text-[9px] text-slate-500">
      of image
    </p>
  </div>

  <div className="rounded-lg border border-white/5 bg-black/10 p-3">
    <p className="text-[10px] text-slate-500">
      Length
    </p>

    <p className="mt-1 text-lg font-bold">
      {detectionResult.detection.geometry?.lengthPixels ?? "--"}
    </p>

    <p className="mt-1 text-[9px] text-slate-500">
      pixels
    </p>
  </div>

  <div className="rounded-lg border border-white/5 bg-black/10 p-3">
    <p className="text-[10px] text-slate-500">
      Width
    </p>

    <p className="mt-1 text-lg font-bold">
      {detectionResult.detection.geometry?.widthPixels ?? "--"}
    </p>

    <p className="mt-1 text-[9px] text-slate-500">
      pixels
    </p>
  </div>

  <div className="rounded-lg border border-white/5 bg-black/10 p-3">
    <p className="text-[10px] text-slate-500">
      Orientation
    </p>

    <p className="mt-1 text-lg font-bold">
      {detectionResult.detection.geometry?.orientationDegrees ?? "--"}°
    </p>

    <p className="mt-1 text-[9px] text-slate-500">
      image orientation
    </p>
  </div>
</div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={analyzeDrift}
                       disabled={
  driftLoading ||
  !detectionResult?.detection?.detected
}
                        className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {driftLoading
                          ? "Analyzing Drift..."
                          : "Run Drift Analysis"}
                      </button>

                      <button
                        type="button"
                        onClick={analyzeAIS}
                        disabled={!driftResult || aisLoading}
                        className="rounded-lg bg-purple-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {aisLoading
                          ? "Correlating AIS..."
                          : "Run AIS Correlation"}
                      </button>
                    </div>

                    {driftError && (
                      <p className="mt-3 text-xs text-red-400">
                        {driftError}
                      </p>
                    )}

                    {driftResult && (
                      <div className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-blue-400">
                            Drift Analysis Ready
                          </p>
                          <span className="rounded-full bg-blue-400/10 px-2 py-1 text-[10px] font-bold text-blue-300">
  READY
</span>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                          <div>
                            <p className="text-[10px] text-slate-500">
                              Probable Origin
                            </p>
                            <p className="mt-1 font-semibold text-white">
                              {driftResult.driftAnalysis.origin.latitude.toFixed(
                                4
                              )}
                              ,{" "}
                              {driftResult.driftAnalysis.origin.longitude.toFixed(
                                4
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] text-slate-500">
                              Origin Time
                            </p>
                            <p className="mt-1 font-semibold text-white">
                              {driftResult.driftAnalysis.originTime}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] text-slate-500">
                              Wind / Current
                            </p>
                            <p className="mt-1 font-semibold text-white">
                              {driftResult.driftAnalysis.environmentalConditions?.windSpeedKnots ??
                                "--"}{" "}
                              kn /{" "}
                              {driftResult.driftAnalysis.environmentalConditions?.currentSpeedKnots ??
                                "--"}{" "}
                              kn
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ================= INVESTIGATION STATUS ================= */}
              <div className="rounded-xl border border-white/10 bg-[#0a1424] p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                  Investigation
                </p>

                <h3 className="mt-2 text-xl font-bold">
                  Analysis Status
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Current investigation pipeline
                </p>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/10 text-xs text-emerald-400">
                      01
                    </div>

                    <div className="flex-1">
                      <p className="text-xs font-semibold text-white">
                        Satellite Detection
                      </p>
                      <div className="mt-1 h-1 rounded-full bg-white/5">
                        {detectionResult && (
                          <div className="h-1 w-full rounded-full bg-emerald-400" />
                        )}
                      </div>
                    </div>

                    <span className="text-[10px] text-emerald-400">
                      {detectionResult ? "READY" : "WAITING"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${
                        driftResult
                          ? "bg-emerald-400/10 text-emerald-400"
                          : "bg-white/5 text-slate-500"
                      }`}
                    >
                      02
                    </div>

                    <div className="flex-1">
                      <p
                        className={`text-xs font-semibold ${
                          driftResult ? "text-white" : "text-slate-400"
                        }`}
                      >
                        Drift Analysis
                      </p>

                      <div className="mt-1 h-1 rounded-full bg-white/5">
                        {driftResult && (
                          <div className="h-1 w-full rounded-full bg-emerald-400" />
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] ${
                        driftResult
                          ? "text-emerald-400"
                          : "text-slate-600"
                      }`}
                    >
                      {driftResult ? "READY" : "WAITING"}
                    </span>
                  </div>
<div className="flex items-center gap-3">
  <div
    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
      topVessel
        ? topVessel.riskLevel === "HIGH"
          ? "bg-red-400/10 text-red-400"
          : topVessel.riskLevel === "MEDIUM"
          ? "bg-amber-400/10 text-amber-400"
          : "bg-emerald-400/10 text-emerald-400"
        : "bg-white/5 text-slate-500"
    }`}
  >
    04
  </div>

  <div className="flex-1">
    <div className="flex items-center justify-between">
      <p
        className={`text-xs font-semibold ${
          topVessel ? "text-white" : "text-slate-400"
        }`}
      >
        Vessel Risk Scoring
      </p>

      {topVessel && (
        <span
          className={`text-[10px] font-bold ${
            topVessel.riskLevel === "HIGH"
              ? "text-red-400"
              : topVessel.riskLevel === "MEDIUM"
              ? "text-amber-400"
              : "text-emerald-400"
          }`}
        >
          {topVessel.suspectProbability}%
        </span>
      )}
    </div>

    <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/5">
      {topVessel && (
        <div
          className={`h-1 rounded-full transition-all duration-500 ${
            topVessel.riskLevel === "HIGH"
              ? "bg-red-400"
              : topVessel.riskLevel === "MEDIUM"
              ? "bg-amber-400"
              : "bg-emerald-400"
          }`}
          style={{
            width: `${topVessel.suspectProbability}%`,
          }}
        />
      )}
    </div>
  </div>

  <span
    className={`text-[10px] font-bold ${
      topVessel
        ? topVessel.riskLevel === "HIGH"
          ? "text-red-400"
          : topVessel.riskLevel === "MEDIUM"
          ? "text-amber-400"
          : "text-emerald-400"
        : "text-slate-600"
    }`}
  >
    {topVessel ? topVessel.riskLevel : "WAITING"}
  </span>
</div>
                </div>
              </div>
            </section>

            {/* ================= MAP ================= */}
            <section className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-[#0a1424]">
              <div className="flex flex-col justify-between gap-3 border-b border-white/10 px-5 py-4 md:flex-row md:items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                    Geo-Intelligence
                  </p>

                  <h3 className="mt-1 text-lg font-bold">
                    Maritime Monitoring Map
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] text-slate-400">
                    Satellite
                  </span>

                  <span className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] text-slate-400">
                    Vessels
                  </span>

                  <span className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] text-slate-400">
                    Drift
                  </span>

                  <button
                    onClick={analyzeAIS}
                    disabled={!driftResult || aisLoading}
                    className="rounded-md bg-purple-600 px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {aisLoading
                      ? "Correlating..."
                      : "Run AIS Correlation"}
                  </button>
                </div>
              </div>

              {aisError && (
                <p className="border-b border-red-400/10 bg-red-400/5 px-5 py-3 text-xs text-red-400">
                  {aisError}
                </p>
              )}

              <div className="h-[500px]">
              <MapView
  detectionResult={detectionResult}
  driftResult={driftResult}
  aisResult={aisResult}
  liveAisVessels={liveAisVessels}
/>
              </div>
            </section>

            {/* ================= AIS RESULTS ================= */}
            {aisResult?.vessels?.length > 0 && (
              <section
                id="vessel-ranking"
                className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-[#0a1424]"
              >
                <div className="border-b border-white/10 px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">
                    Module 03 / 04
                  </p>

                  <div className="mt-1 flex flex-col justify-between gap-2 md:flex-row md:items-center">
                    <div>
                      <h3 className="text-lg font-bold">
                        AIS Vessel Correlation
                      </h3>
                      <p className="text-xs text-slate-500">
                        Ranked vessel activity around the probable
                        spill origin.
                      </p>
                    </div>

                    <div className="rounded-full bg-purple-400/10 px-3 py-1 text-[10px] font-bold text-purple-300">
                      {aisResult.vesselCount ??
                        aisResult.vessels.length}{" "}
                      CANDIDATES
                    </div>
                  </div>
                </div>

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
                      {aisResult.vessels.map((vessel, index) => (
                        <tr
                          key={vessel.vesselId}
                          className="border-b border-white/5 transition hover:bg-white/[0.03]"
                        >
                          <td className="px-5 py-4">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-xs font-bold text-slate-300">
                              #{index + 1}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-xs font-bold text-white">
                              {vessel.vesselName}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-600">
                              {vessel.vesselId}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-xs text-slate-400">
                            {vessel.vesselType}
                          </td>

                          <td className="px-5 py-4 text-xs font-semibold text-white">
                            {vessel.distanceKm} km
                          </td>

                          <td className="px-5 py-4 text-xs text-slate-300">
                          {topVessel.timeDifferenceMinutes != null
  ? `${topVessel.timeDifferenceMinutes} min`
  : "Not available"}
                          </td>

                          <td className="px-5 py-4 text-xs text-slate-300">
                         {vessel.trajectoryAlignment != null
  ? `${Math.round(vessel.trajectoryAlignment)}%`
  : "N/A"}
                          </td>

                          <td className="px-5 py-4 text-xs text-slate-300">
                            {vessel.aisGapMinutes != null
  ? `${vessel.aisGapMinutes} min`
  : "N/A"}
                          </td>

                          <td className="px-5 py-4">
                            <span className="text-sm font-black text-white">
                              {vessel.suspectProbability}%
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
                              {vessel.riskLevel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ================= TOP SUSPECT ANALYSIS ================= */}
                {topVessel && (
                  <div className="border-t border-white/10 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          Top Suspect Analysis
                        </h3>
                        <p className="text-[10px] text-slate-500">
                          Weighted evidence contributing to analytical suspicion score
                        </p>
                      </div>

                      <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-[10px] font-bold text-cyan-400">
                        RANK #1
                      </span>
                    </div>

                    {(() => {
                      const factors = [
                        {
                          label: "Spatial Proximity",
                          value:
                            topVessel.proximityScore ??
                            0,
                        },
                        {
                          label: "Trajectory Alignment",
                      value:
  (topVessel.trajectoryAlignment ?? 0) > 1
    ? topVessel.trajectoryAlignment
    : (topVessel.trajectoryAlignment ?? 0) * 100,
                        },
                        {
                          label: "Time Correlation",
                          value:
                            topVessel.timeMatchScore ?? 0,
                        },
                        {
                          label: "Behavioural Anomaly",
                          value:
                            topVessel.behaviourScore ?? 0,
                        },
                      ];
                      return (
                        <>
                          <div className="mb-4 rounded-lg border border-white/5 bg-slate-950/50 p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-bold text-white">
                                  {topVessel.vesselName}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  {topVessel.vesselId} •{" "}
                                  {topVessel.vesselType}
                                </p>
                              </div>

                              <div className="text-right">
                                <p className="text-xl font-black text-white">
                                  {topVessel.suspectProbability}%
                                </p>

                                <p
                                  className={`text-[10px] font-bold ${
                                    topVessel.riskLevel === "HIGH"
                                      ? "text-red-400"
                                      : topVessel.riskLevel ===
                                        "MEDIUM"
                                      ? "text-amber-400"
                                      : "text-emerald-400"
                                  }`}
                                >
                                  {topVessel.riskLevel} RISK
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {factors.map((factor) => (
                              <div
                                key={factor.label}
                                className="rounded-lg border border-white/5 bg-slate-950/40 p-3"
                              >
                                <div className="mb-2 flex items-center justify-between">
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    {factor.label}
                                  </span>

                                  <span className="text-xs font-bold text-white">
                                    {Math.round(
                                      Math.min(
                                        factor.value,
                                        100
                                      )
                                    )}
                                    %
                                  </span>
                                </div>

                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                                  <div
                                    className="h-full rounded-full bg-cyan-400 transition-all"
                                    style={{
                                      width: `${Math.min(
                                        Math.max(
                                          factor.value,
                                          0
                                        ),
                                        100
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-lg bg-slate-950/50 p-2">
                              <p className="text-sm font-bold text-white">
                                {topVessel.distanceKm} km
                              </p>
                              <p className="text-[9px] text-slate-500">
                                Distance
                              </p>
                            </div>

                            <div className="rounded-lg bg-slate-950/50 p-2">
                              <p className="text-sm font-bold text-white">
                                {
                                  topVessel.timeDifferenceMinutes
                                }{" "}
                                min
                              </p>
                              <p className="text-[9px] text-slate-500">
                                Time Difference
                              </p>
                            </div>

                            <div className="rounded-lg bg-slate-950/50 p-2">
                              <p className="text-sm font-bold text-white">
                                {topVessel.aisGapMinutes} min
                              </p>
                              <p className="text-[9px] text-slate-500">
                                AIS Gap
                              </p>
                            </div>
                          </div>

                          {topVessel.riskFactors?.length > 0 && (
                            <div className="mt-4 rounded-lg border border-white/5 bg-slate-950/40 p-3">
                              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Evidence Signals
                              </p>

                              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                {topVessel.riskFactors.map(
                                  (factor, index) => (
                                    <div
                                      key={`${factor}-${index}`}
                                      className="flex items-start gap-2 text-[10px] text-slate-400"
                                    >
                                      <span className="mt-0.5 text-cyan-400">
                                        •
                                      </span>
                                      <span>{factor}</span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </section>
            )}
{/* ================= ALERT CENTER ================= */}
{(detectionResult || driftResult || aisResult) && (
  <section
    id="alert-center"
    className="mt-6 overflow-hidden rounded-xl border border-red-400/20 bg-[#0a1424]"
  >
    {/* Header */}
    <div className="border-b border-white/10 bg-red-400/[0.03] px-5 py-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
            Intelligence Alert Center
          </p>

          <h3 className="mt-1 text-lg font-bold text-white">
            Active Investigation Alerts
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Automated alerts generated from satellite, drift and AIS
            intelligence signals.
          </p>
        </div>

        <span className="flex w-fit items-center gap-2 rounded-full bg-red-400/10 px-3 py-1.5 text-[10px] font-bold text-red-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />

          {topVessel &&
topVessel.suspectProbability >= riskThreshold &&
topVessel.riskLevel === "HIGH"
  ? "HIGH PRIORITY"
  : driftResult
  ? "INVESTIGATION ACTIVE"
  : detectionResult?.detection?.detected
  ? "MONITORING"
  : "STANDBY"}
        </span>
      </div>
    </div>

    {/* Alert Cards */}
    <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-3">

      {/* ================= SATELLITE ALERT ================= */}
      {detectionResult && (
        <div
          className={`rounded-lg border p-4 ${
            detectionResult.detection?.detected
              ? "border-cyan-400/10 bg-cyan-400/[0.03]"
              : "border-emerald-400/10 bg-emerald-400/[0.03]"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                detectionResult.detection?.detected
                  ? "bg-cyan-400/10"
                  : "bg-emerald-400/10"
              }`}
            >
              🛰️
            </div>

            <span
              className={`rounded-full px-2 py-1 text-[9px] font-bold ${
                detectionResult.detection?.detected
                  ? "bg-cyan-400/10 text-cyan-400"
                  : "bg-emerald-400/10 text-emerald-400"
              }`}
            >
              {detectionResult.detection?.detected
                ? "DETECTED"
                : "NO SPILL"}
            </span>
          </div>

          <p className="mt-4 text-xs font-bold text-white">
            {detectionResult.detection?.detected
              ? "Potential Oil Spill Detected"
              : "No Oil Spill Detected"}
          </p>

          <p className="mt-1 text-[10px] leading-5 text-slate-500">
            {detectionResult.detection?.detected
              ? "Satellite SAR analysis identified a potential surface anomaly requiring further investigation."
              : "Satellite SAR analysis did not identify a significant oil-spill signature in the submitted image."}
          </p>

          <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
            <span className="text-[9px] text-slate-600">
  Oil Probability
</span>
           <span
  className={`text-xs font-bold ${
    detectionResult.detection?.detected
      ? "text-cyan-400"
      : "text-emerald-400"
  }`}
>
  {(
    Number(
      detectionResult.detection?.probabilities?.oil ?? 0
    ) * 100
  ).toFixed(2)}
  %
</span>
          </div>
        </div>
      )}

      {/* ================= DRIFT ALERT ================= */}
      {driftResult && (
        <div className="rounded-lg border border-blue-400/10 bg-blue-400/[0.03] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-400/10">
              🌊
            </div>

            <span className="rounded-full bg-blue-400/10 px-2 py-1 text-[9px] font-bold text-blue-400">
              HINDCAST READY
            </span>
          </div>

          <p className="mt-4 text-xs font-bold text-white">
            Probable Spill Origin Estimated
          </p>

          <p className="mt-1 text-[10px] leading-5 text-slate-500">
           Drift hindcasting estimated a probable origin region for further vessel correlation.
          </p>

          <div className="mt-3 border-t border-white/5 pt-3">
            <p className="text-[9px] text-slate-600">
              Probable Origin
            </p>

            <p className="mt-1 text-xs font-bold text-blue-300">
              {driftResult.driftAnalysis.origin.latitude.toFixed(4)}
              ,{" "}
              {driftResult.driftAnalysis.origin.longitude.toFixed(4)}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[9px] text-slate-600">
              Confidence
            </span>

            <span className="text-xs font-bold text-blue-400">
              {(
                Number(
                  driftResult.driftAnalysis.confidence ?? 0
                ) * 100
              ).toFixed(0)}
              %
            </span>
          </div>
        </div>
      )}

      {/* ================= VESSEL ALERT ================= */}
     {/* ================= VESSEL ALERT ================= */}
{aisResult?.alerts?.length > 0 &&
  aisResult.alerts.map((alert) => (
    <div
      key={alert.alertId}
      className="rounded-lg border border-red-400/20 bg-red-400/[0.04] p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-400/10">
          🚨
        </div>

        <span className="rounded-full bg-red-400/10 px-2 py-1 text-[9px] font-bold text-red-400">
          {alert.severity} RISK
        </span>
      </div>

      <p className="mt-4 text-xs font-bold text-white">
        Vessel Correlation Alert
      </p>

      <p className="mt-1 text-[10px] leading-5 text-slate-500">
        {alert.message}
      </p>

      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
        <div>
          <p className="text-[9px] text-slate-600">
            Highest Ranked Vessel
          </p>

          <p className="mt-1 text-xs font-bold text-white">
            {alert.vesselName}
          </p>

          <p className="mt-1 text-[9px] text-slate-600">
            {alert.vesselId}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[9px] text-slate-600">
            Analytical Score
          </p>

          <p className="mt-1 text-sm font-black text-red-400">
            {alert.suspectScore}%
          </p>

          <p className="mt-1 text-[8px] text-slate-600">
            Threshold: {riskThreshold}%
          </p>
        </div>
      </div>
    </div>
  ))}
    </div>

    {/* ================= ACTION BAR ================= */}
    <div className="flex flex-col justify-between gap-3 border-t border-white/10 bg-black/10 px-5 py-4 md:flex-row md:items-center">
      <div className="flex items-start gap-2">
        <span className="text-sm">⚠️</span>

        <div>
          <p className="text-[10px] font-semibold text-slate-400">
            Analytical Alert
          </p>

          <p className="mt-0.5 text-[10px] text-slate-600">
            Alerts indicate investigation priority and require
            validation before operational or legal action.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAlertAcknowledged(true)}
        disabled={alertAcknowledged}
        className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-bold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {alertAcknowledged
          ? "✓ Alert Acknowledged"
          : "Acknowledge Alert"}
      </button>
    </div>
  </section>
)}
{/* ================= CONFIGURATION ================= */}
<section
  id="configuration"
  className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-[#0a1424]"
>
  <div className="border-b border-white/10 bg-white/[0.02] px-5 py-4">
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
      System Configuration
    </p>

    <h3 className="mt-1 text-lg font-bold text-white">
      Investigation Parameters
    </h3>

    <p className="mt-1 text-xs text-slate-500">
      Configure detection, drift analysis and AIS correlation parameters.
    </p>
  </div>

  <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 lg:grid-cols-3">

    {/* AIS Search Radius */}
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <label className="text-xs font-semibold text-slate-300">
        AIS Search Radius
      </label>

      <div className="mt-3 flex items-center gap-3">
       <input
  type="range"
  min="10"
  max="100"
  value={aisSearchRadius}
  onChange={(e) => setAisSearchRadius(Number(e.target.value))}
  className="w-full accent-cyan-400"
/>
        <span className="w-14 rounded bg-cyan-400/10 px-2 py-1 text-center text-xs font-bold text-cyan-400">
           {aisSearchRadius} km
        </span>
      </div>
    </div>

    {/* AIS Time Window */}
<div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
  <label className="text-xs font-semibold text-slate-300">
    AIS Time Window
  </label>

  <select
    value={aisTimeWindow}
    onChange={(e) => setAisTimeWindow(Number(e.target.value))}
    className="mt-3 w-full rounded-lg border border-white/10 bg-[#07111f] px-3 py-2 text-xs text-slate-300 outline-none focus:border-cyan-400/40"
  >
    <option value="1">± 1 hour</option>
    <option value="2">± 2 hours</option>
    <option value="6">± 6 hours</option>
    <option value="12">± 12 hours</option>
    <option value="24">± 24 hours</option>
  </select>

  <p className="mt-2 text-[9px] text-slate-600">
    Current window: ± {aisTimeWindow} hour
    {aisTimeWindow !== 1 ? "s" : ""}
  </p>
</div>

   {/* Risk Threshold */}
<div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
  <label className="text-xs font-semibold text-slate-300">
    Risk Threshold
  </label>

  <select
    value={riskThreshold}
    onChange={(e) => setRiskThreshold(Number(e.target.value))}
    className="mt-3 w-full rounded-lg border border-white/10 bg-[#07111f] px-3 py-2 text-xs text-slate-300 outline-none focus:border-cyan-400/40"
  >
    <option value="30">30% — Low sensitivity</option>
    <option value="50">50% — Balanced</option>
    <option value="70">70% — High confidence</option>
    <option value="85">85% — Strict</option>
  </select>

  <p className="mt-2 text-[9px] text-slate-600">
    Vessels below {riskThreshold}% will be treated as lower-priority
    candidates.
  </p>
</div>

    {/* Satellite Confidence */}
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <label className="text-xs font-semibold text-slate-300">
        Satellite Confidence
      </label>

      <div className="mt-3 flex items-center gap-3">
        <input
          type="range"
          min="50"
          max="99"
          defaultValue="80"
          className="w-full accent-cyan-400"
        />

        <span className="w-14 rounded bg-cyan-400/10 px-2 py-1 text-center text-xs font-bold text-cyan-400">
          80%
        </span>
      </div>
    </div>

    {/* Drift Mode */}
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <label className="text-xs font-semibold text-slate-300">
        Drift Analysis Mode
      </label>

      <select
        defaultValue="both"
        className="mt-3 w-full rounded-lg border border-white/10 bg-[#07111f] px-3 py-2 text-xs text-slate-300 outline-none focus:border-cyan-400/40"
      >
        <option value="both">Hindcast + Forecast</option>
        <option value="hindcast">Hindcast Only</option>
        <option value="forecast">Forecast Only</option>
      </select>
    </div>

    {/* Data Source */}
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <label className="text-xs font-semibold text-slate-300">
        Satellite Data Source
      </label>

      <select
        defaultValue="sentinel1"
        className="mt-3 w-full rounded-lg border border-white/10 bg-[#07111f] px-3 py-2 text-xs text-slate-300 outline-none focus:border-cyan-400/40"
      >
        <option value="sentinel1">Sentinel-1 SAR</option>
        <option value="sentinel2">Sentinel-2 Optical</option>
        <option value="multi">Multi-Sensor</option>
      </select>
    </div>

  </div>

  <div className="border-t border-white/10 bg-white/[0.015] px-5 py-4">
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
      <div>
        <p className="text-xs font-semibold text-white">
          Configuration Status
        </p>

        <p className="mt-1 text-[11px] text-slate-500">
          Parameters are ready for the next investigation run.
        </p>
      </div>

      <span className="w-fit rounded-full bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold text-emerald-400">
        ● READY
      </span>
    </div>
  </div>
</section>

{showHistory && (
  <section
    id="investigation-history"
    className="mb-8 rounded-xl border border-white/10 bg-[#0a1424] p-6"
  >


  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
        Investigation Archive
      </p>

      <h3 className="mt-2 text-xl font-bold text-white">
        Investigation History
      </h3>

      <p className="mt-1 text-xs text-slate-500">
        Previously saved oil-spill investigations
      </p>
    </div>

    <div className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 text-xs font-semibold text-cyan-300">
      {investigations.length} Saved
    </div>
  </div>

  {historyLoading && (
    <div className="mt-6 rounded-lg border border-white/5 bg-white/[0.02] p-5 text-center text-sm text-slate-400">
      Loading investigation history...
    </div>
  )}

  {historyError && (
    <div className="mt-6 rounded-lg border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300">
      {historyError}
    </div>
  )}

  {!historyLoading &&
    !historyError &&
    investigations.length === 0 && (
      <div className="mt-6 rounded-lg border border-white/5 bg-white/[0.02] p-6 text-center">
        <p className="text-sm font-semibold text-slate-300">
          No saved investigations
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Completed investigations will appear here.
        </p>
      </div>
    )}

  {!historyLoading &&
    !historyError &&
    investigations.length > 0 && (
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {investigations.map((investigation) => (
          <div
            key={investigation._id}
            className="rounded-xl border border-white/10 bg-[#07111f] p-5 transition hover:border-cyan-400/30"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-cyan-300">
                  {investigation.investigationId}
                </p>

                <h4 className="mt-1 text-sm font-semibold text-white">
                  Oil Spill Investigation
                </h4>
              </div>

              <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                {investigation.status || "completed"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-600">
                  Created
                </p>

                <p className="mt-1 text-xs text-slate-300">
                  {investigation.createdAt
                    ? new Date(
                        investigation.createdAt
                      ).toLocaleString()
                    : "Not available"}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-600">
                  Updated
                </p>

                <p className="mt-1 text-xs text-slate-300">
                  {investigation.updatedAt
                    ? new Date(
                        investigation.updatedAt
                      ).toLocaleString()
                    : "Not available"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-white/[0.03] p-3">
                <p className="text-[10px] text-slate-600">
                  Satellite
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-200">
                  {investigation.satellite
                    ? "Available"
                    : "N/A"}
                </p>
              </div>

              <div className="rounded-lg bg-white/[0.03] p-3">
                <p className="text-[10px] text-slate-600">
                  Drift
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-200">
                  {investigation.drift
                    ? "Available"
                    : "N/A"}
                </p>
              </div>

              <div className="rounded-lg bg-white/[0.03] p-3">
                <p className="text-[10px] text-slate-600">
                  AIS
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-200">
                  {investigation.ais
                    ? "Available"
                    : "N/A"}
                </p>
              </div>
             <button
  type="button"
  onClick={() => {
    console.log(
      "SELECTED INVESTIGATION:",
      investigation
    );

    setDetectionResult(investigation.satellite || null);
    setDriftResult(investigation.drift || null);
    console.log("RESTORED AIS:", investigation.ais);
    setAisResult(investigation.ais || null);

    document
      .getElementById("investigation-report")
      ?.scrollIntoView({ behavior: "smooth" });
  }}
  className="mt-4 w-full rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-4 py-2.5 text-xs font-bold text-cyan-300 transition hover:bg-cyan-400/10"
>
  View Investigation
</button>
            </div>
          </div>
        ))}
      </div>
    )}
</section>

  )}
{/* ================= INVESTIGATION REPORT ================= */}
<section
  id="investigation-report"
  className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-[#0a1424]"
>
  {/* Header */}
  <div className="border-b border-white/10 bg-cyan-400/[0.02] px-5 py-5">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
          Investigation Report
        </p>

        <h3 className="mt-1 text-xl font-bold text-white">
          Evidence & Intelligence Summary
        </h3>

        <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
          Consolidated analytical findings from satellite detection,
          drift analysis and AIS vessel correlation.
        </p>
      </div>

     <div className="flex flex-wrap gap-2">
  <button
    type="button"
    onClick={saveInvestigation}
    disabled={!detectionResult}
    className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40"
  >
    💾 Save Investigation
  </button>

  <button
    type="button"
    onClick={generateInvestigationReport}
    disabled={!detectionResult}
    className="rounded-lg bg-cyan-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
  >
    📄 Generate Investigation Report
  </button>
</div>
    </div>

    {/* Module Status */}
    <div className="mt-5 flex flex-wrap gap-2">
      <span className="rounded-full border border-cyan-400/10 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-bold text-cyan-300">
        🛰️ Satellite: {detectionResult ? "ANALYZED" : "PENDING"}
      </span>

      <span className="rounded-full border border-blue-400/10 bg-blue-400/10 px-3 py-1.5 text-[10px] font-bold text-blue-300">
        🌊 Drift: {driftResult ? "ANALYZED" : "PENDING"}
      </span>

      <span className="rounded-full border border-purple-400/10 bg-purple-400/10 px-3 py-1.5 text-[10px] font-bold text-purple-300">
        🚢 AIS: {aisResult ? "CORRELATED" : "PENDING"}
      </span>

      <span className="rounded-full border border-red-400/10 bg-red-400/10 px-3 py-1.5 text-[10px] font-bold text-red-300">
        🎯 Risk: {topVessel ? topVessel.riskLevel : "PENDING"}
      </span>
    </div>
  </div>

  {/* Report Body */}
  <div className="p-5">

    {/* ================= DETECTION SUMMARY ================= */}
    {detectionResult && (
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
          <div className="rounded-lg border border-white/5 bg-slate-950/40 p-4">
            <p className="text-[9px] uppercase tracking-wider text-slate-600">
              Classification
            </p>

            <p
              className={`mt-2 text-sm font-bold ${
                detectionResult.detection?.detected
                  ? "text-red-400"
                  : "text-emerald-400"
              }`}
            >
              {detectionResult.detection?.detected
                ? "Potential Oil Spill"
                : "No Oil Spill"}
            </p>
          </div>

          <div className="rounded-lg border border-white/5 bg-slate-950/40 p-4">
            <p className="text-[9px] uppercase tracking-wider text-slate-600">
              Confidence
            </p>

            <p className="mt-2 text-sm font-bold text-cyan-400">
              {(
                Number(
                  detectionResult.detection?.confidence ??
                    detectionResult.detection?.probabilities?.oil ??
                    0
                ) * 100
              ).toFixed(2)}
              %
            </p>
          </div>

          <div className="rounded-lg border border-white/5 bg-slate-950/40 p-4">
            <p className="text-[9px] uppercase tracking-wider text-slate-600">
              Spill Area
            </p>

            <p className="mt-2 text-sm font-bold text-white">
              {detectionResult.detection?.geometry?.areaPercentage != null
                ? `${detectionResult.detection.geometry.areaPercentage.toFixed(
                    2
                  )}%`
                : "N/A"}
            </p>

            <p className="mt-1 text-[9px] text-slate-600">
              Image coverage
            </p>
          </div>

          <div className="rounded-lg border border-white/5 bg-slate-950/40 p-4">
            <p className="text-[9px] uppercase tracking-wider text-slate-600">
              Orientation
            </p>

            <p className="mt-2 text-sm font-bold text-white">
              {detectionResult.detection?.geometry
                ?.orientationDegrees != null
                ? `${detectionResult.detection.geometry.orientationDegrees.toFixed(
                    2
                  )}°`
                : "N/A"}
            </p>

            <p className="mt-1 text-[9px] text-slate-600">
              Image orientation
            </p>
          </div>
        </div>
      </div>
    )}

    {/* ================= DRIFT SUMMARY ================= */}
    {driftResult && (
      <div className="mt-4 rounded-xl border border-blue-400/10 bg-blue-400/[0.02] p-5">
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
          <div className="rounded-lg border border-white/5 bg-slate-950/40 p-4">
            <p className="text-[9px] uppercase tracking-wider text-slate-600">
              Probable Origin
            </p>

            <p className="mt-2 text-sm font-bold text-blue-300">
              {driftResult.driftAnalysis.origin.latitude.toFixed(4)}
              ,{" "}
              {driftResult.driftAnalysis.origin.longitude.toFixed(4)}
            </p>

            <p className="mt-1 text-[9px] text-slate-600">
              Estimated origin region
            </p>
          </div>

         <div className="rounded-lg border border-white/5 bg-slate-950/40 p-4">
  <p className="text-[9px] uppercase tracking-wider text-slate-600">
    Origin Time
  </p>

  <p className="mt-2 text-sm font-bold text-white">
    {driftResult?.driftAnalysis?.originTime
      ? new Date(
          driftResult.driftAnalysis.originTime
        ).toLocaleString()
      : "Not available"}
  </p>

  <div className="small-note">
    Exact satellite acquisition time is unavailable
    in the supplied TIFF metadata.
  </div>
</div>

          <div className="rounded-lg border border-white/5 bg-slate-950/40 p-4">
            <p className="text-[9px] uppercase tracking-wider text-slate-600">
              Hindcast Confidence
            </p>

            <p className="mt-2 text-sm font-bold text-blue-400">
              {(
                Number(
                  driftResult.driftAnalysis.confidence ?? 0
                ) * 100
              ).toFixed(0)}
              %
            </p>

            <p className="mt-1 text-[9px] text-slate-600">
              Model confidence
            </p>
          </div>
        </div>

        {/* Environmental Conditions */}
        <div className="mt-4 rounded-lg border border-blue-400/10 bg-blue-400/[0.03] p-4">
          <p className="text-[9px] font-bold uppercase tracking-wider text-blue-400">
            Environmental Conditions
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <p className="text-[9px] text-slate-600">
                Wind Speed
              </p>

              <p className="mt-1 text-xs font-bold text-white">
                {driftResult.driftAnalysis.environmentalConditions
                  ?.windSpeedKnots ?? "N/A"}{" "}
                kn
              </p>
            </div>

            <div>
              <p className="text-[9px] text-slate-600">
                Wind Direction
              </p>

              <p className="mt-1 text-xs font-bold text-white">
                {driftResult.driftAnalysis.environmentalConditions
                  ?.windDirection ?? "N/A"}°
              </p>
            </div>

            <div>
              <p className="text-[9px] text-slate-600">
                Current Speed
              </p>

              <p className="mt-1 text-xs font-bold text-white">
                {driftResult.driftAnalysis.environmentalConditions
                  ?.currentSpeedKnots ?? "N/A"}{" "}
                kn
              </p>
            </div>

            <div>
              <p className="text-[9px] text-slate-600">
                Current Direction
              </p>

              <p className="mt-1 text-xs font-bold text-white">
                {driftResult.driftAnalysis.environmentalConditions
                  ?.currentDirection ?? "N/A"}°
              </p>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ================= AIS SUMMARY ================= */}
    {aisResult && (
      <div className="mt-4 rounded-xl border border-purple-400/10 bg-purple-400/[0.02] p-5">
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
          <div className="rounded-lg border border-white/5 bg-slate-950/40 p-4">
            <p className="text-[9px] uppercase tracking-wider text-slate-600">
          Prioritized Vessels
            </p>

            <p className="mt-2 text-xl font-black text-purple-400">
              {aisResult.vessels?.length ?? 0}
            </p>

            <p className="mt-1 text-[9px] text-slate-600">
              Priority candidates from AIS correlation
            </p>
          </div>

          {topVessel && (
            <>
              <div className="rounded-lg border border-red-400/10 bg-red-400/[0.03] p-4">
                <p className="text-[9px] uppercase tracking-wider text-slate-600">
                  Highest Ranked Vessel
                </p>

                <p className="mt-2 text-sm font-bold text-white">
                  {topVessel.vesselName}
                </p>

                <p className="mt-1 text-[9px] text-slate-600">
                  {topVessel.vesselId}
                </p>
              </div>

              <div className="rounded-lg border border-red-400/10 bg-red-400/[0.03] p-4">
                <p className="text-[9px] uppercase tracking-wider text-slate-600">
                  Analytical Suspicion Score
                </p>

                <p
                  className={`mt-2 text-xl font-black ${
                    topVessel.riskLevel === "HIGH"
                      ? "text-red-400"
                      : topVessel.riskLevel === "MEDIUM"
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                >
                  {topVessel.suspectProbability}%
                </p>

                <p className="mt-1 text-[9px] text-slate-600">
                  {topVessel.riskLevel} investigation priority
                </p>
              </div>
            </>
          )}
        </div>

        {/* Evidence */}
        {topVessel && (
          <div className="mt-4 rounded-lg border border-white/5 bg-slate-950/30 p-4">
            <p className="text-[9px] font-bold uppercase tracking-wider text-purple-400">
              Correlation Evidence
            </p>

            <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-[9px] text-slate-600">
                  Distance
                </p>

                <p className="mt-1 text-xs font-bold text-white">
                  {topVessel.distanceKm} km
                </p>
              </div>

              <div>
                <p className="text-[9px] text-slate-600">
                  Time Match
                </p>

                <p className="mt-1 text-xs font-bold text-white">
                  {topVessel.timeDifferenceMinutes} min
                </p>
              </div>

              <div>
                <p className="text-[9px] text-slate-600">
                  Trajectory
                </p>

                <p className="mt-1 text-xs font-bold text-white">
                  {topVessel.trajectoryAlignment}%
                </p>
              </div>

              <div>
                <p className="text-[9px] text-slate-600">
                  AIS Gap
                </p>

                <p className="mt-1 text-xs font-bold text-white">
                  {topVessel.aisGapMinutes} min
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    )}

    {/* ================= INVESTIGATION CONCLUSION ================= */}
    {detectionResult && (
      <div className="mt-4 rounded-xl border border-amber-400/10 bg-amber-400/[0.02] p-5">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/10">
            ⚠️
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Investigation Assessment
            </p>

           <p className="mt-2 text-xs leading-5 text-slate-400">
  {detectionResult.detection?.detected
    ? "The current satellite evidence indicates a potential oil-spill event. Further drift analysis and vessel correlation can be used to trace the probable origin and prioritize nearby vessels for investigation."
    : "The current satellite evidence does not indicate a significant oil-spill signature in the submitted image. Drift and vessel correlation should not be treated as confirmed spill evidence unless supported by additional satellite and environmental observations."}
</p>

            <p className="mt-3 text-[10px] leading-5 text-slate-600">
              This system provides analytical decision support only.
              Probable origin estimates and vessel rankings should be
              validated against authoritative satellite products,
              environmental observations and verified AIS records
              before operational or legal action.
            </p>
          </div>
        </div>
      </div>
    )}

    {/* ================= EMPTY STATE ================= */}
    {!detectionResult && !driftResult && !aisResult && (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-slate-950/20 px-6 py-12 text-center">
        <div className="text-3xl">📋</div>

        <p className="mt-3 text-sm font-bold text-white">
          Investigation Report Pending
        </p>

        <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
          Run satellite detection first. Subsequent drift and AIS
          analysis will automatically enrich this investigation
          report.
        </p>
      </div>
    )}
  </div>
</section>




            {/* ================= VESSEL RISK EVIDENCE ================= */}
{topVessel && (
  <div className="mt-5 rounded-2xl border border-white/10 bg-[#0a1424] p-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
          Risk Evidence
        </p>

        <h3 className="mt-2 text-lg font-bold">
          Vessel Risk Assessment
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          Evidence supporting the current vessel ranking
        </p>
      </div>

      <div className="text-left sm:text-right">
        <p className="text-sm font-bold text-white">
          {topVessel.vesselName}
        </p>

        <p className="mt-1 text-[10px] text-slate-500">
          {topVessel.vesselId}
        </p>
      </div>
    </div>

    {/* Probability */}
    <div className="mt-6 rounded-xl border border-red-400/10 bg-red-400/5 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Analytical Suspicion Score
          </p>

          <p className="mt-1 text-3xl font-black text-red-400">
            {topVessel.suspectProbability}%
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${
            topVessel.riskLevel === "HIGH"
              ? "bg-red-400/10 text-red-400"
              : topVessel.riskLevel === "MEDIUM"
              ? "bg-amber-400/10 text-amber-400"
              : "bg-emerald-400/10 text-emerald-400"
          }`}
        >
          {topVessel.riskLevel}
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            topVessel.riskLevel === "HIGH"
              ? "bg-red-400"
              : topVessel.riskLevel === "MEDIUM"
              ? "bg-amber-400"
              : "bg-emerald-400"
          }`}
          style={{
            width: `${topVessel.suspectProbability}%`,
          }}
        />
      </div>
    </div>

    {/* Evidence Grid */}
    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          Distance
        </p>

        <p className="mt-2 text-lg font-bold text-white">
          {topVessel.distanceKm} km
        </p>

        <p className="mt-1 text-[10px] text-slate-600">
          From probable origin
        </p>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          Time Match
        </p>

        <p className="mt-2 text-lg font-bold text-white">
          {topVessel.timeDifferenceMinutes} min
        </p>

        <p className="mt-1 text-[10px] text-slate-600">
          Temporal correlation
        </p>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          Trajectory Alignment
        </p>

        <p className="mt-2 text-lg font-bold text-white">
          {topVessel.trajectoryAlignment}%
        </p>

        <p className="mt-1 text-[10px] text-slate-600">
          Route similarity
        </p>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          AIS Gap
        </p>

        <p className="mt-2 text-lg font-bold text-white">
          {topVessel.aisGapMinutes} min
        </p>

        <p className="mt-1 text-[10px] text-slate-600">
          Signal continuity
        </p>
      </div>
    </div>

    {/* Investigation Interpretation */}
    <div className="mt-5 rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-4">
      <div className="flex gap-3">
        <span className="text-lg">🔎</span>

        <div>
          <p className="text-xs font-bold text-cyan-300">
            Investigation Interpretation
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-400">
           This vessel is ranked using available spatial proximity, trajectory alignment and AIS behavioural/continuity evidence. Exact temporal correlation is unavailable because the satellite acquisition timestamp is not available in 
           the supplied TIFF metadata.
          </p>
        </div>
      </div>
    </div>
  </div>
)}

            {/* ================= DISCLAIMER ================= */}
            <div className="mt-4 flex items-start gap-2 text-[10px] leading-5 text-slate-600">
              <span>ⓘ</span>
              <span>
                Vessel rankings represent analytical
                suspicion/probability based on available signals
                and do not establish legal responsibility or
                guilt.
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppContent;
