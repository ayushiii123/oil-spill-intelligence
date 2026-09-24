import {
  MapContainer,
  TileLayer,
  Circle,
  Marker,
  Popup,
  CircleMarker,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useMemo, useEffect, Fragment } from "react";

// ======================================================
// DEFAULT LEAFLET MARKER
// ======================================================

const markerIcon = new L.Icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// ======================================================
// PROBABLE ORIGIN ICON
// ======================================================

const originIcon = L.divIcon({
  className: "",
  html: `
    <div
      style="
        width: 22px;
        height: 22px;
        background: #dc2626;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 18px #dc2626;
      "
    ></div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -12],
});

// ======================================================
// SPILL DETECTION ICON
// ======================================================

const spillIcon = L.divIcon({
  className: "",
  html: `
    <div
      style="
        width: 26px;
        height: 26px;
        background: #2563eb;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow:
          0 0 0 6px rgba(37, 99, 235, 0.18),
          0 0 20px rgba(37, 99, 235, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        font-weight: 800;
      "
    >
      ●
    </div>
  `,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -16],
});

// ======================================================
// HISTORICAL AIS VESSEL ICON
// HIGH = RED
// MEDIUM = ORANGE
// LOW = GREEN
// ======================================================

const createVesselIcon = (
  riskLevel,
  course = 0
) => {
  let background = "#22c55e";

  if (riskLevel === "HIGH") {
    background = "#ef4444";
  } else if (riskLevel === "MEDIUM") {
    background = "#f59e0b";
  }

  const safeCourse =
    typeof course === "number" &&
    Number.isFinite(course)
      ? course
      : 0;

  return L.divIcon({
    className: "",
    html: `
      <div
        style="
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${safeCourse}deg);
          filter: drop-shadow(0 0 7px ${background});
        "
      >
        <div
          style="
            width: 0;
            height: 0;
            border-left: 7px solid transparent;
            border-right: 7px solid transparent;
            border-bottom: 22px solid ${background};
            position: relative;
          "
        >
          <div
            style="
              position: absolute;
              width: 8px;
              height: 8px;
              background: white;
              border-radius: 50%;
              left: -4px;
              top: 8px;
            "
          ></div>
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
};

// ======================================================
// LIVE AIS ICON
// CYAN = LIVE
// ======================================================

const createLiveAisIcon = (course = 0) => {
  const safeCourse =
    typeof course === "number" &&
    Number.isFinite(course)
      ? course
      : 0;

  return L.divIcon({
    className: "",
    html: `
      <div
        style="
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${safeCourse}deg);
          filter:
            drop-shadow(0 0 6px #22d3ee)
            drop-shadow(0 0 14px rgba(34,211,238,0.65));
        "
      >
        <div
          style="
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-bottom: 25px solid #22d3ee;
            position: relative;
          "
        >
          <div
            style="
              position: absolute;
              width: 9px;
              height: 9px;
              background: white;
              border-radius: 50%;
              left: -4.5px;
              top: 9px;
              box-shadow: 0 0 7px #22d3ee;
            "
          ></div>
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20],
  });
};

// ======================================================
// FORMAT AIS TIMESTAMP
// ======================================================

const formatLiveTime = (timestamp) => {
  if (!timestamp) {
    return "N/A";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Kolkata",
  });
};

// ======================================================
// MAP FIT
// ======================================================

function FitMapToInvestigation({
  positions,
}) {
  const map = useMap();

  if (positions.length > 1) {
    map.fitBounds(positions, {
      padding: [40, 40],
    });
  } else if (positions.length === 1) {
    map.setView(positions[0], 9);
  }

  return null;
}

// ======================================================
// MAP VIEW
// ======================================================

function MapView({
  detectionResult,
  driftResult,
  aisResult,
  liveAisVessels = [],
}) {
  console.log(
    "DRIFT RESULT IN MAP:",
    driftResult
  );

 console.log("AIS TRACK DEBUG:", {
  vesselCount: aisResult?.vessels?.length,
  topVessel: aisResult?.vessels?.[0]?.vesselName,
  trackPointCount:
    aisResult?.vessels?.[0]?.trackPointCount,
  track:
    aisResult?.vessels?.[0]?.track,
  trajectoryAlignment:
    aisResult?.vessels?.[0]?.trajectoryAlignment,
  aisGapMinutes:
    aisResult?.vessels?.[0]?.aisGapMinutes,
});

  console.log(
    "LIVE AIS VESSELS IN MAP:",
    liveAisVessels
  );

  // ====================================================
  // DATA
  // ====================================================

  const detection =
    detectionResult?.detection;

  const drift =
    driftResult?.driftAnalysis;

  const vessels =
    aisResult?.vessels || [];

  // ====================================================
  // REFERENCE / DETECTION LOCATION
  // ====================================================

  const referenceLatitude =
    detection?.geospatial?.spillCentroid?.latitude ??
    null;

  const referenceLongitude =
    detection?.geospatial?.spillCentroid?.longitude ??
    null;

  const hasReferenceLocation =
    Number.isFinite(referenceLatitude) &&
    Number.isFinite(referenceLongitude);

  // ====================================================
  // PROBABLE ORIGIN
  // ====================================================
const origin = drift?.origin;

const hasOrigin =
  typeof origin?.latitude === "number" &&
  typeof origin?.longitude === "number";

// ====================================================
// HINDCAST
// ====================================================

const hindcastPositions = Array.isArray(
  drift?.hindcast
)
  ? drift.hindcast
      .filter(
        (point) =>
          typeof point?.latitude === "number" &&
          typeof point?.longitude === "number"
      )
      .map((point) => [
        point.latitude,
        point.longitude,
      ])
  : [];

// ====================================================
// FORECAST
// ====================================================

const forecastPositions = Array.isArray(
  drift?.forecast
)
  ? drift.forecast
      .filter(
        (point) =>
          typeof point?.latitude === "number" &&
          typeof point?.longitude === "number"
      )
      .map((point) => [
        point.latitude,
        point.longitude,
      ])
  : [];
  

  // ====================================================
  // HISTORICAL AIS POSITIONS
  // ====================================================

  const vesselPositions =
    vessels
      .filter(
        (vessel) =>
          typeof vessel.latitude === "number" &&
          typeof vessel.longitude === "number"
      )
      .map((vessel) => [
        vessel.latitude,
        vessel.longitude,
      ]);

  // ====================================================
  // LIVE AIS VALID POSITIONS
  // ====================================================

  const validLiveAisVessels =
    liveAisVessels.filter(
      (vessel) =>
        typeof vessel.latitude === "number" &&
        typeof vessel.longitude === "number"
    );

  // ====================================================
  // IMPORTANT:
  // Live AIS is NOT included in map auto-fit.
  // Otherwise the wide live test box can zoom the
  // investigation map away from the spill area.
  // ====================================================

  const allInvestigationPositions = [
    ...(hasOrigin
      ? [[
          origin.latitude,
          origin.longitude,
        ]]
      : []),

    ...hindcastPositions,
    ...forecastPositions,
    ...vesselPositions,

    ...(hasReferenceLocation
      ? [[
          referenceLatitude,
          referenceLongitude,
        ]]
      : []),
  ];

  // ====================================================
  // MAP CENTER
  // ====================================================

  const initialCenter = hasOrigin
    ? [
        origin.latitude,
        origin.longitude,
      ]
    : hasReferenceLocation
      ? [
          referenceLatitude,
          referenceLongitude,
        ]
      : [20, 78];

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="h-full w-full overflow-hidden rounded-xl">
      <MapContainer
        center={initialCenter}
        zoom={hasOrigin ? 9 : 4}
        scrollWheelZoom={true}
        style={{
          height: "100%",
          width: "100%",
        }}
      >
        {/* ==================================================
            BASE MAP
        ================================================== */}

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* ==================================================
            MAP LEGEND
        ================================================== */}

        <div
          className="
            absolute
            bottom-5
            right-5
            z-[1000]
            rounded-xl
            border
            border-white/10
            bg-slate-950/90
            p-4
            shadow-xl
            backdrop-blur
          "
        >
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Investigation Layers
          </p>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-600 shadow-[0_0_8px_#dc2626]" />
              <span className="text-xs text-slate-200">
                Probable Origin
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="text-xs text-slate-200">
                Sentinel-1 SAR Candidate
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-0.5 w-5 border-t-2 border-dashed border-slate-300" />
              <span className="text-xs text-slate-200">
                Hindcast
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-0.5 w-5 border-t-2 border-blue-500" />
              <span className="text-xs text-slate-200">
                Forecast
              </span>
            </div>

            <div className="mt-2 border-t border-white/10 pt-2">
              <p className="mb-2 text-[10px] font-bold uppercase text-slate-500">
                Vessel Risk
              </p>

              <p className="mb-2 text-[9px] text-slate-500">
                Historical AIS • arrow = course
              </p>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <span className="text-xs text-slate-300">
                    HIGH
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span className="text-xs text-slate-300">
                    MEDIUM
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  <span className="text-xs text-slate-300">
                    LOW
                  </span>
                </div>

                <div className="flex items-center gap-2 border-t border-white/10 pt-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                  <span className="text-xs text-cyan-300">
                    LIVE AIS
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================
            LIVE AIS STATUS BADGE
        ================================================== */}

        <div
          className="
            absolute
            left-5
            top-5
            z-[1000]
            flex
            items-center
            gap-2
            rounded-full
            border
            border-cyan-400/20
            bg-slate-950/90
            px-3
            py-2
            text-[10px]
            font-bold
            uppercase
            tracking-wider
            text-cyan-300
            shadow-lg
            backdrop-blur
          "
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
          Live AIS
          <span className="text-slate-500">
            {validLiveAisVessels.length}
          </span>
        </div>

        {/* ==================================================
            AUTOMATIC MAP FOCUS
        ================================================== */}

        {allInvestigationPositions.length > 0 && (
          <FitMapToInvestigation
            positions={
              allInvestigationPositions
            }
          />
        )}

        {/* ==================================================
            REFERENCE LOCATION
        ================================================== */}

        {hasReferenceLocation && (
          <>
            <Marker
              position={[
                referenceLatitude,
                referenceLongitude,
              ]}
              icon={spillIcon}
            >
              <Popup>
                <strong>
                  Sentinel-1 SAR Candidate
                </strong>

                <br />

                Latitude:{" "}
                {referenceLatitude.toFixed(4)}

                <br />

                Longitude:{" "}
                {referenceLongitude.toFixed(4)}

                <br />

                <span style={{ color: "#64748b" }}>
                  Approximate geolocation of a
                  dark-slick candidate detected in
                  the real Sentinel-1 GRD scene.
                </span>
              </Popup>
            </Marker>

            <Circle
              center={[
                referenceLatitude,
                referenceLongitude,
              ]}
              radius={5000}
              pathOptions={{
                fillOpacity: 0.12,
                weight: 1,
              }}
            />
          </>
        )}

        {/* ==================================================
            PROBABLE SPILL ORIGIN
        ================================================== */}

        {hasOrigin && (
          <Marker
            position={[
              origin.latitude,
              origin.longitude,
            ]}
            icon={originIcon}
          >
            <Popup>
              <strong>
                Probable Spill Origin
              </strong>

              <br />

              Latitude:{" "}
              {origin.latitude.toFixed(4)}

              <br />

              Longitude:{" "}
              {origin.longitude.toFixed(4)}

              <br />

              Confidence:{" "}
              {Math.round(
                (drift?.confidence || 0) * 100
              )}
              %

              <br />

              Origin Time:{" "}
              {drift?.originTime || "Not available"}
            </Popup>
          </Marker>
        )}

        {/* ==================================================
            OIL SPILL DETECTION ZONE
        ================================================== */}

        {detection?.detected &&
          hasReferenceLocation && (
            <Circle
              center={[
                referenceLatitude,
                referenceLongitude,
              ]}
              radius={8000}
              pathOptions={{
                fillOpacity: 0.08,
                weight: 2,
                dashArray: "6 6",
              }}
            >
              <Popup>
                <strong>
                  Satellite Oil Spill Detection
                </strong>

                <br />

                Classification:{" "}
                {detection.classification ||
                  "Potential Oil Spill"}

                <br />

                Confidence:{" "}
                {typeof detection.confidence ===
                "number"
                  ? `${(
                      detection.confidence * 100
                    ).toFixed(2)}%`
                  : "N/A"}

                <br />

                <span style={{ color: "#64748b" }}>
                  Candidate zone shown around the
                  approximate Sentinel-1 SAR detection
                  coordinate.
                </span>
              </Popup>
            </Circle>
          )}

        {/* ==================================================
            HINDCAST PATH
        ================================================== */}

        {hindcastPositions.length > 1 && (
          <Polyline
            positions={hindcastPositions}
            pathOptions={{
              weight: 4,
              dashArray: "8 8",
              opacity: 0.9,
            }}
          />
        )}

        {/* ==================================================
            FORECAST PATH
        ================================================== */}

        {forecastPositions.length > 1 && (
          <Polyline
            positions={forecastPositions}
            pathOptions={{
              weight: 4,
              opacity: 0.9,
            }}
          />
        )}

        {/* ==================================================
            HISTORICAL AIS VESSELS
        ================================================== */}

        {vessels.map((vessel, index) => {
          const validPosition =
            typeof vessel.latitude === "number" &&
            typeof vessel.longitude === "number";

          if (!validPosition) {
            return null;
          }

          return (
            <Marker
              key={
                vessel.vesselId ||
                vessel.mmsi ||
                `historical-${index}`
              }
              position={[
                vessel.latitude,
                vessel.longitude,
              ]}
              icon={createVesselIcon(
                vessel.riskLevel,
                vessel.course
              )}
            >
              <Popup>
                <strong>
                  {vessel.vesselName ||
                    `MMSI ${vessel.mmsi}`}
                </strong>

                <br />

                <span
                  style={{
                    color: "#64748b",
                  }}
                >
                  HISTORICAL AIS
                </span>

                <br />

                MMSI:{" "}
                {vessel.mmsi || "N/A"}

                <br />

                Type:{" "}
                {vessel.vesselType || "Unknown"}

                <br />

                Distance:{" "}
                {vessel.distanceKm != null
                  ? `${vessel.distanceKm} km`
                  : "N/A"}

                <br />

                Time Match:{" "}
                {vessel.timeDifferenceMinutes !=
                null
                  ? `${vessel.timeDifferenceMinutes} min`
                  : "N/A"}

                <br />

                Trajectory Alignment:{" "}
                {vessel.trajectoryAlignment !=
                null
                  ? `${Math.round(
                      vessel.trajectoryAlignment
                    )}%`
                  : "N/A"}

                <br />

                AIS Gap:{" "}
                {vessel.aisGapMinutes != null
                  ? `${vessel.aisGapMinutes} min`
                  : "N/A"}

                <br />

                Suspect Probability:{" "}
                <strong>
                  {vessel.suspectProbability ??
                    "N/A"}
                  %
                </strong>

                <br />

                Risk Level:{" "}
                <strong>
                  {vessel.riskLevel ||
                    "N/A"}
                </strong>
              </Popup>
            </Marker>
          );
        })}
        {/* ==================================================
            HISTORICAL AIS TRACKS
        ================================================== */}

        {vessels.map((vessel, index) => {
          const track = Array.isArray(vessel.track)
            ? vessel.track
                .filter(
                  (point) =>
                    typeof point?.latitude === "number" &&
                    typeof point?.longitude === "number"
                )
                .map((point) => [
                  point.latitude,
                  point.longitude,
                ])
            : [];

          if (track.length < 2) {
            return null;
          }

          const isTopSuspect = index === 0;

          let trackColor = "#64748b";

          if (vessel.riskLevel === "HIGH") {
            trackColor = "#ef4444";
          } else if (
            vessel.riskLevel === "MEDIUM"
          ) {
            trackColor = "#f59e0b";
          } else if (
            vessel.riskLevel === "LOW"
          ) {
            trackColor = "#22c55e";
          }

          return (
           <Fragment
  key={`track-${vessel.vesselId || vessel.mmsi || index}`}
>
              <Polyline
                positions={track}
                pathOptions={{
                  color: isTopSuspect
                    ? "#f97316"
                    : trackColor,

                  weight: isTopSuspect
                    ? 5
                    : 2.5,

                  opacity: isTopSuspect
                    ? 0.95
                    : 0.60,

                  dashArray: isTopSuspect
                    ? undefined
                    : "6 6",
                }}
              >
                <Popup>
                  <strong>
                    {vessel.vesselName ||
                      `MMSI ${vessel.mmsi}`}
                  </strong>

                  <br />

                  <span
                    style={{
                      color: "#64748b",
                    }}
                  >
                    HISTORICAL AIS TRACK
                  </span>

                  <br />

                  MMSI:{" "}
                  {vessel.mmsi || "N/A"}

                  <br />

                  Track Points:{" "}
                  {vessel.trackPointCount ??
                    track.length}

                  <br />

                  Distance:{" "}
                  {vessel.distanceKm != null
                    ? `${vessel.distanceKm} km`
                    : "N/A"}

                  <br />

                  Trajectory Alignment:{" "}
                  {vessel.trajectoryAlignment !=
                  null
                    ? `${Math.round(
                        vessel.trajectoryAlignment
                      )}%`
                    : "N/A"}

                  <br />

                  AIS Gap:{" "}
                  {vessel.aisGapMinutes !=
                  null
                    ? `${vessel.aisGapMinutes} min`
                    : "N/A"}

                  <br />

                  Analytical Suspicion Score:{" "}
                  <strong>
                    {vessel.suspectProbability ??
                      "N/A"}
                    %
                  </strong>

                  <br />

                  Risk Level:{" "}
                  <strong>
                    {vessel.riskLevel ||
                      "N/A"}
                  </strong>
                </Popup>
              </Polyline>

              {/* Highlight start of reconstructed track */}
              <CircleMarker
                center={track[0]}
                radius={isTopSuspect ? 5 : 3}
                pathOptions={{
                  color: isTopSuspect
                    ? "#f97316"
                    : trackColor,
                  fillColor: isTopSuspect
                    ? "#f97316"
                    : trackColor,
                  fillOpacity: 0.9,
                  weight: 1,
                }}
              />

              {/* Highlight latest/end point */}
              <CircleMarker
                center={
                  track[track.length - 1]
                }
                radius={isTopSuspect ? 6 : 4}
                pathOptions={{
                  color: "#ffffff",
                  fillColor: isTopSuspect
                    ? "#f97316"
                    : trackColor,
                  fillOpacity: 1,
                  weight: 2,
                }}
              />
            </Fragment>
          );
        })}
        {/* ==================================================
            LIVE AIS VESSELS
        ================================================== */}

        {validLiveAisVessels.map(
          (vessel) => (
            <Marker
              key={`live-${vessel.mmsi}`}
              position={[
                vessel.latitude,
                vessel.longitude,
              ]}
              icon={createLiveAisIcon(
                vessel.course
              )}
            >
              <Popup>
                <strong>
                  {vessel.vesselName ||
                    "Unknown Vessel"}
                </strong>

                <br />

                <span
                  style={{
                    color: "#06b6d4",
                    fontWeight: 700,
                  }}
                >
                  LIVE AIS
                </span>

                <br />

                MMSI:{" "}
                {vessel.mmsi ?? "N/A"}

                <br />

                Latitude:{" "}
                {vessel.latitude.toFixed(5)}

                <br />

                Longitude:{" "}
                {vessel.longitude.toFixed(5)}

                <br />

                Speed:{" "}
                {vessel.speedKnots != null
                  ? `${vessel.speedKnots} kn`
                  : "N/A"}

                <br />

                Course:{" "}
                {vessel.course != null
                  ? `${vessel.course}°`
                  : "N/A"}

                <br />

                Heading:{" "}
                {vessel.heading != null
                  ? `${vessel.heading}°`
                  : "N/A"}

                <br />

                Last AIS Update:
                <br />

                {formatLiveTime(
                  vessel.timestamp
                )}
              </Popup>
            </Marker>
          )
        )}
      </MapContainer>
    </div>
  );
}

export default MapView;