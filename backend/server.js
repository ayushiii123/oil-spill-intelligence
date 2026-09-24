const dns = require("dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");
const Investigation = require("./models/Investigation");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const mongoose = require("mongoose");

require("dotenv").config();
const app = express();
const WebSocket = require("ws");

const AISSTREAM_URL =
  "wss://stream.aisstream.io/v0/stream";

const liveAisVessels = new Map();

function startLiveAIS() {
  const apiKey =
    process.env.AISSTREAM_API_KEY;

  if (!apiKey) {
    console.error(
      "AISSTREAM_API_KEY is missing from .env"
    );
    return;
  }

  const socket = new WebSocket(
    AISSTREAM_URL,
    {
      perMessageDeflate: true,
    }
  );

  socket.on("open", () => {
    console.log(
      "Live AIS WebSocket connected"
    );

    const subscription = {
      APIKey: apiKey,

      BoundingBoxes: [
        [
          [27.0, -92.0],
          [31.5, -85.0],
        ],
      ],

      FilterMessageTypes: [
        "PositionReport",
      ],
    };

    socket.send(
      JSON.stringify(subscription)
    );

    console.log(
      "Live AIS subscription sent"
    );
  });

  socket.on("message", (data) => {
    try {
      const event = JSON.parse(
        Buffer.isBuffer(data)
          ? data.toString("utf8")
          : data.toString()
      );

      if (
        event.MessageType !==
        "PositionReport"
      ) {
        return;
      }

      const meta =
        event.MetaData || {};

      const position =
        event.Message?.PositionReport || {};

      const vessel = {
        mmsi:
          meta.MMSI ??
          position.UserID ??
          null,

        vesselName:
          (
            meta.ShipName ||
            "Unknown"
          ).trim(),

        latitude:
          meta.Latitude ??
          position.Latitude ??
          null,

        longitude:
          meta.Longitude ??
          position.Longitude ??
          null,

        speedKnots:
          position.Sog ?? null,

        course:
          position.Cog ?? null,

        heading:
          position.TrueHeading === 511
            ? null
            : position.TrueHeading,

        timestamp:
          meta.time_utc ?? null,
      };

      if (
        vessel.mmsi &&
        vessel.latitude != null &&
        vessel.longitude != null
      ) {
        liveAisVessels.set(
          vessel.mmsi,
          vessel
        );
      }

    } catch (error) {
      console.error(
        "Live AIS message error:",
        error.message
      );
    }
  });

  socket.on("error", (error) => {
    console.error(
      "Live AIS WebSocket error:",
      error.message
    );
  });

  socket.on("close", () => {
    console.log(
      "Live AIS WebSocket closed"
    );
  });
}

startLiveAIS();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.get("/api/ais/live", (req, res) => {
  res.json({
    success: true,
    source: "aisstream-live",
    count: liveAisVessels.size,
    vessels: Array.from(liveAisVessels.values()),
  });
});
mongoose
  .connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB_NAME,
  })
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });
const upload = multer({
  storage: multer.memoryStorage(),
});
// ============================================================
// ROOT
// ============================================================

app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "oil-spill-intelligence-backend",
  });
});


// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
  });
});


// ============================================================
// INVESTIGATION STATUS
// ============================================================

app.get("/api/investigation", (req, res) => {
  res.json({
    investigationId: "INV-001",
    status: "ready",

    message:
      "Oil spill investigation pipeline is ready",

    modules: {
      satelliteDetection: "ready",
      driftAnalysis: "ready",
      aisCorrelation: "ready",
      vesselRiskScoring: "ready",
    },
  });
});


// ============================================================
// SATELLITE DETECTION
// ============================================================


app.post(
  "/api/satellite/detect",
  upload.single("file"),
  async (req, res) => {
    try {
      console.log("UPLOAD FILE:", req.file);
console.log("UPLOAD BODY:", req.body);
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Satellite image file is required.",
        });
      }

      const mlFormData = new FormData();

      const imageBlob = new Blob(
        [req.file.buffer],
        {
          type: req.file.mimetype,
        }
      );

      mlFormData.append(
        "file",
        imageBlob,
        req.file.originalname
      );

      const response = await fetch(
  `${process.env.ML_SERVICE_URL || "http://127.0.0.1:8000"}/detect`,
        {
          method: "POST",
          body: mlFormData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          message: "ML detection failed.",
          detection: data,
        });
      }

      res.json({
        success: true,
        source: "fastapi-ml-service",
        detection: data,
      });
    } catch (error) {
      console.error("ML service error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to connect to ML service.",
        error: error.message,
      });
    }
  }
);

// ============================================================
// DRIFT ANALYSIS
// ============================================================

app.post("/api/drift/analyze", async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      originTime = null,
      sceneDate = null,
    } = req.body;

    if (
      latitude == null ||
      longitude == null
    ) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required.",
      });
    }

    if (!sceneDate) {
      return res.status(400).json({
        success: false,
        message: "Scene date is required.",
      });
    }

    /*
      Exact Sentinel-1 acquisition time is currently unavailable
      in the supplied TIFF metadata.

      Therefore we use the historical environmental conditions
      for the complete scene date rather than inventing a timestamp.
    */

    const weatherUrl =
      "https://archive-api.open-meteo.com/v1/archive" +
      `?latitude=${encodeURIComponent(latitude)}` +
      `&longitude=${encodeURIComponent(longitude)}` +
      `&hourly=wind_speed_10m,wind_direction_10m` +
      `&start_date=${encodeURIComponent(sceneDate)}` +
      `&end_date=${encodeURIComponent(sceneDate)}` +
      `&timezone=GMT` +
      `&wind_speed_unit=kn` +
      `&models=era5`;

    const marineUrl =
      "https://marine-api.open-meteo.com/v1/marine" +
      `?latitude=${encodeURIComponent(latitude)}` +
      `&longitude=${encodeURIComponent(longitude)}` +
      `&hourly=ocean_current_velocity,ocean_current_direction` +
      `&start_date=${encodeURIComponent(sceneDate)}` +
      `&end_date=${encodeURIComponent(sceneDate)}` +
      `&timezone=GMT` +
      `&cell_selection=sea` +
      `&models=era5_ocean`;

    const [weatherResponse, marineResponse] =
      await Promise.all([
        fetch(weatherUrl),
        fetch(marineUrl),
      ]);

    if (!weatherResponse.ok) {
      throw new Error(
        `Historical weather API failed: ${weatherResponse.status}`
      );
    }

    if (!marineResponse.ok) {
      throw new Error(
        `Historical marine API failed: ${marineResponse.status}`
      );
    }

    const weatherData =
      await weatherResponse.json();

    const marineData =
      await marineResponse.json();

    const windSpeeds =
      weatherData?.hourly?.wind_speed_10m || [];

    const windDirections =
      weatherData?.hourly?.wind_direction_10m || [];

    const currentSpeedsKmh =
      marineData?.hourly?.ocean_current_velocity || [];

    const currentDirections =
      marineData?.hourly?.ocean_current_direction || [];

    const validWindSpeeds =
      windSpeeds.filter(
        (value) =>
          Number.isFinite(Number(value))
      );

    const validWindDirections =
      windDirections.filter(
        (value) =>
          Number.isFinite(Number(value))
      );

    const validCurrentSpeeds =
      currentSpeedsKmh.filter(
        (value) =>
          Number.isFinite(Number(value))
      );

    const validCurrentDirections =
      currentDirections.filter(
        (value) =>
          Number.isFinite(Number(value))
      );

    if (
      !validWindSpeeds.length ||
      !validWindDirections.length
    ) {
      throw new Error(
        "No historical wind data available for the scene date."
      );
    }

    if (
      !validCurrentSpeeds.length ||
      !validCurrentDirections.length
    ) {
      throw new Error(
        "No historical ocean-current data available for the scene date."
      );
    }

    /*
      Use daily averages because exact satellite acquisition
      time is unavailable.
    */

    const average = (values) =>
      values.reduce(
        (sum, value) =>
          sum + Number(value),
        0
      ) / values.length;

    const windSpeedKnots =
      average(validWindSpeeds);

    const windDirection =
      average(validWindDirections);

    /*
      Marine API returns current velocity in km/h.
      Convert to knots.
    */
    const currentSpeedKnots =
      average(validCurrentSpeeds) / 1.852;

    const currentDirection =
      average(validCurrentDirections);

    /*
      Keep the existing analytical drift structure,
      but drive it from real historical environmental data.
    */

    const windDriftFraction = 0.03;

    const windDriftKnots =
      windSpeedKnots *
      windDriftFraction;

    const toRadians = (degrees) =>
      (degrees * Math.PI) / 180;

    const toDegrees = (radians) =>
      (radians * 180) / Math.PI;

    const vectorFromSpeedDirection = (
      speed,
      direction
    ) => {
      const rad =
        toRadians(direction);

      return {
        east:
          speed * Math.sin(rad),
        north:
          speed * Math.cos(rad),
      };
    };

    const vectorMagnitude =
      (vector) =>
        Math.sqrt(
          vector.east * vector.east +
          vector.north * vector.north
        );

    const vectorDirection =
      (vector) =>
        (
          (
            toDegrees(
              Math.atan2(
                vector.east,
                vector.north
              )
            ) + 360
          ) % 360
        );

    const windVector =
      vectorFromSpeedDirection(
        windDriftKnots,
        windDirection
      );

    const currentVector =
      vectorFromSpeedDirection(
        currentSpeedKnots,
        currentDirection
      );

    const combinedVector = {
      east:
        windVector.east +
        currentVector.east,

      north:
        windVector.north +
        currentVector.north,
    };

    const combinedSpeedKnots =
      vectorMagnitude(
        combinedVector
      );

    const combinedDirection =
      vectorDirection(
        combinedVector
      );

    /*
      Six-hour analytical approximation.
      This remains an approximation, but environmental
      inputs are now real historical reanalysis values.
    */

    const hindcastHours = 6;
    const forecastHours = 6;

    const knotsToKmPerHour =
      1.852;

    const combinedSpeedKmH =
      combinedSpeedKnots *
      knotsToKmPerHour;

    const distance6hKm =
      combinedSpeedKmH *
      hindcastHours;

    const destinationPoint = (
      lat,
      lon,
      distanceKm,
      bearingDegrees
    ) => {
      const earthRadiusKm =
        6371;

      const bearing =
        toRadians(
          bearingDegrees
        );

      const lat1 =
        toRadians(lat);

      const lon1 =
        toRadians(lon);

      const angularDistance =
        distanceKm /
        earthRadiusKm;

      const lat2 =
        Math.asin(
          Math.sin(lat1) *
            Math.cos(
              angularDistance
            ) +
            Math.cos(lat1) *
              Math.sin(
                angularDistance
              ) *
              Math.cos(bearing)
        );

      const lon2 =
        lon1 +
        Math.atan2(
          Math.sin(bearing) *
            Math.sin(
              angularDistance
            ) *
            Math.cos(lat1),
          Math.cos(
            angularDistance
          ) -
            Math.sin(lat1) *
              Math.sin(lat2)
        );

      return {
        latitude:
          toDegrees(lat2),

        longitude:
          toDegrees(lon2),
      };
    };

    const probableOrigin =
      destinationPoint(
        latitude,
        longitude,
        -distance6hKm,
        combinedDirection
      );

    const forecastEnd =
      destinationPoint(
        latitude,
        longitude,
        distance6hKm,
        combinedDirection
      );

    res.json({
      success: true,
      status: "ready",
      source:
        "historical-open-meteo-environmental-drift-model",

      driftAnalysis: {
        origin: probableOrigin,

        originTime:
          originTime ?? null,

        sceneDate,

        hindcast: {
          hours: hindcastHours,
          distanceKm:
            Number(
              distance6hKm.toFixed(2)
            ),
          directionDegrees:
            Number(
              combinedDirection.toFixed(1)
            ),
        },

        forecast: {
          hours: forecastHours,
          distanceKm:
            Number(
              distance6hKm.toFixed(2)
            ),
          directionDegrees:
            Number(
              combinedDirection.toFixed(1)
            ),

          endpoint:
            forecastEnd,
        },

        environmentalConditions: {
          windSpeedKnots:
            Number(
              windSpeedKnots.toFixed(2)
            ),

          windDirection:
            Number(
              windDirection.toFixed(1)
            ),

          currentSpeedKnots:
            Number(
              currentSpeedKnots.toFixed(2)
            ),

          currentDirection:
            Number(
              currentDirection.toFixed(1)
            ),

          combinedSurfaceSpeedKnots:
            Number(
              combinedSpeedKnots.toFixed(2)
            ),

          combinedSurfaceDirection:
            Number(
              combinedDirection.toFixed(1)
            ),
        },

        confidence: 0.78,

        modelInfo: {
          method:
            "Historical wind + ocean-current vector with surface-drift approximation",

          weatherSource:
            "Open-Meteo Historical Weather API / ERA5",

          marineSource:
            "Open-Meteo Marine API / ERA5-Ocean",

          environmentalDataType:
            "Historical reanalysis",

          limitation:
            "Exact satellite acquisition time is unavailable, so environmental conditions are aggregated over the scene date. Drift remains an analytical approximation and is not a full ocean circulation model.",
        },
      },
    });
  } catch (error) {
    console.error(
      "DRIFT ANALYSIS ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to analyze spill drift.",
    });
  }
});

// ============================================================
// AIS CORRELATION + TRACK RECONSTRUCTION
// ============================================================

app.post("/api/ais/correlate", (req, res) => {
  try {
    const {
      latitude = 18.52,
      longitude = 72.85,

      // IMPORTANT:
      // Exact satellite acquisition time is not available
      // from the supplied TIFF metadata.
      originTime = null,

      searchRadiusKm = 50,
      timeWindowHours = 2,
    } = req.body;

    console.log("AIS REQUEST BODY:", req.body);

    const effectiveLatitude = Number(latitude);
    const effectiveLongitude = Number(longitude);

    const effectiveSearchRadiusKm =
      Number.isFinite(Number(searchRadiusKm))
        ? Number(searchRadiusKm)
        : 50;

    const effectiveTimeWindowHours =
      Number.isFinite(Number(timeWindowHours))
        ? Number(timeWindowHours)
        : 2;

    console.log(
      "AIS RECEIVED RADIUS:",
      effectiveSearchRadiusKm
    );

    console.log(
      "AIS TIME WINDOW:",
      `±${effectiveTimeWindowHours} hours`
    );

    // =========================================================
    // NOAA AIS DATA
    // =========================================================

    const fs = require("fs");
    const path = require("path");

    const aisFilePath = path.join(
      __dirname,
      "data",
      "noaa_ais_2018_09_26_gulf.jsonl"
    );

    let aisRecords = [];

    try {
      const aisText = fs.readFileSync(
        aisFilePath,
        "utf8"
      );

      const lines = aisText
        .split(/\r?\n/)
        .filter(Boolean);

      for (const line of lines) {
        try {
          const record = JSON.parse(line);

          if (!record.mmsi) {
            continue;
          }

          const lat = Number(record.latitude);
          const lon = Number(record.longitude);

          if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lon)
          ) {
            continue;
          }

          aisRecords.push({
            ...record,
            latitude: lat,
            longitude: lon,
          });
        } catch (parseError) {
          // Ignore malformed JSONL rows
        }
      }

      console.log(
        "NOAA AIS RECORDS LOADED:",
        aisRecords.length
      );
    } catch (error) {
      console.error(
        "NOAA AIS DATA LOAD ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load NOAA historical AIS dataset",
      });
    }

    // =========================================================
    // HELPERS
    // =========================================================

    const calculateDistanceKm = (
      lat1,
      lon1,
      lat2,
      lon2
    ) => {
      const earthRadius = 6371;

      const toRadians = (value) =>
        (value * Math.PI) / 180;

      const dLat = toRadians(
        lat2 - lat1
      );

      const dLon = toRadians(
        lon2 - lon1
      );

      const a =
        Math.sin(dLat / 2) *
          Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
          Math.cos(toRadians(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);

      const c =
        2 *
        Math.atan2(
          Math.sqrt(a),
          Math.sqrt(1 - a)
        );

      return earthRadius * c;
    };

    const calculateBearing = (
      lat1,
      lon1,
      lat2,
      lon2
    ) => {
      const toRadians = (value) =>
        (value * Math.PI) / 180;

      const toDegrees = (value) =>
        (value * 180) / Math.PI;

      const p1 = toRadians(lat1);
      const p2 = toRadians(lat2);
      const deltaLon =
        toRadians(lon2 - lon1);

      const y =
        Math.sin(deltaLon) *
        Math.cos(p2);

      const x =
        Math.cos(p1) *
          Math.sin(p2) -
        Math.sin(p1) *
          Math.cos(p2) *
          Math.cos(deltaLon);

      const bearing =
        toDegrees(
          Math.atan2(y, x)
        );

      return (
        bearing + 360
      ) % 360;
    };

    const smallestAngleDifference = (
      a,
      b
    ) => {
      const difference =
        Math.abs(a - b) % 360;

      return difference > 180
        ? 360 - difference
        : difference;
    };

    const parseRecordTime = (record) => {
      if (!record) {
        return null;
      }

      const rawTime =
        record.baseDateTime ||
        record.timestamp ||
        record.time;

      if (!rawTime) {
        return null;
      }

      const timestamp =
        new Date(rawTime).getTime();

      return Number.isFinite(timestamp)
        ? timestamp
        : null;
    };

    const distanceScore = (
      distanceKm
    ) => {
      if (distanceKm <= 5) return 1.0;
      if (distanceKm <= 10) return 0.85;
      if (distanceKm <= 20) return 0.65;
      if (distanceKm <= 40) return 0.40;

      return 0.15;
    };

    // =========================================================
    // GROUP COMPLETE AIS TRACKS BY MMSI
    // =========================================================

    const vesselTracks = new Map();

    for (const record of aisRecords) {
      const mmsi = String(record.mmsi);

      if (!vesselTracks.has(mmsi)) {
        vesselTracks.set(
          mmsi,
          []
        );
      }

      vesselTracks
        .get(mmsi)
        .push(record);
    }

    // Sort every vessel track chronologically
    for (const [
      mmsi,
      track
    ] of vesselTracks.entries()) {
      track.sort((a, b) => {
        const timeA =
          parseRecordTime(a);

        const timeB =
          parseRecordTime(b);

        if (
          timeA === null &&
          timeB === null
        ) {
          return 0;
        }

        if (timeA === null) {
          return 1;
        }

        if (timeB === null) {
          return -1;
        }

        return timeA - timeB;
      });
    }

    console.log(
      "UNIQUE NOAA MMSI TRACKS:",
      vesselTracks.size
    );

    // =========================================================
    // FIND CLOSEST OBSERVATION PER VESSEL
    // =========================================================

    const vesselCandidates = [];

    for (const [
      mmsi,
      track
    ] of vesselTracks.entries()) {
      if (!track.length) {
        continue;
      }

      let closestRecord = null;
      let closestDistanceKm = Infinity;
      let closestIndex = -1;

      for (
        let index = 0;
        index < track.length;
        index++
      ) {
        const record = track[index];

        const distanceKm =
          calculateDistanceKm(
            effectiveLatitude,
            effectiveLongitude,
            record.latitude,
            record.longitude
          );

        if (
          distanceKm <
          closestDistanceKm
        ) {
          closestDistanceKm =
            distanceKm;

          closestRecord =
            record;

          closestIndex =
            index;
        }
      }

      if (
        !closestRecord ||
        !Number.isFinite(
          closestDistanceKm
        )
      ) {
        continue;
      }

      if (
        closestDistanceKm >
        effectiveSearchRadiusKm
      ) {
        continue;
      }

      vesselCandidates.push({
        mmsi,
        track,
        closestRecord,
        closestIndex,
        distanceKm:
          closestDistanceKm,
      });
    }

    console.log(
      "NOAA AIS CANDIDATES WITHIN RADIUS:",
      vesselCandidates.length
    );

    // =========================================================
    // TRACK ANALYSIS
    // =========================================================

    const rankedVessels =
      vesselCandidates.map(
        (candidate) => {
          const {
            mmsi,
            track,
            closestRecord,
            closestIndex,
            distanceKm,
          } = candidate;

          // ---------------------------------------------------
          // Track window around the closest spatial observation
          // ---------------------------------------------------

          const trackWindowMs =
            effectiveTimeWindowHours *
            60 *
            60 *
            1000;

          const closestTime =
            parseRecordTime(
              closestRecord
            );

          let reconstructedTrack =
            [];

          if (
            closestTime !== null
          ) {
            reconstructedTrack =
              track.filter(
                (point) => {
                  const pointTime =
                    parseRecordTime(
                      point
                    );

                  if (
                    pointTime === null
                  ) {
                    return true;
                  }

                  return (
                    Math.abs(
                      pointTime -
                        closestTime
                    ) <=
                    trackWindowMs
                  );
                }
              );
          } else {
            // No valid timestamp in AIS data.
            // Use a small number of surrounding observations.
            const startIndex =
              Math.max(
                0,
                closestIndex - 5
              );

            const endIndex =
              Math.min(
                track.length,
                closestIndex + 6
              );

            reconstructedTrack =
              track.slice(
                startIndex,
                endIndex
              );
          }

          // Ensure track is chronologically sorted
          reconstructedTrack.sort(
            (a, b) => {
              const timeA =
                parseRecordTime(a);

              const timeB =
                parseRecordTime(b);

              if (
                timeA === null ||
                timeB === null
              ) {
                return 0;
              }

              return timeA - timeB;
            }
          );

          // ---------------------------------------------------
          // Convert track into lightweight frontend objects
          // ---------------------------------------------------

          const trackForResponse =
            reconstructedTrack
              .map(
                (point) => ({
                  latitude:
                    Number(
                      point.latitude
                    ),

                  longitude:
                    Number(
                      point.longitude
                    ),

                  speedKnots:
                    point.sog !== null &&
                    point.sog !== undefined
                      ? Number(
                          point.sog
                        )
                      : null,

                  course:
                    point.cog !== null &&
                    point.cog !== undefined
                      ? Number(
                          point.cog
                        )
                      : null,

                  heading:
                    point.heading !== null &&
                    point.heading !== undefined
                      ? Number(
                          point.heading
                        )
                      : null,

                  timestamp:
                    point.baseDateTime ||
                    point.timestamp ||
                    null,
                })
              )
              .filter(
                (point) =>
                  Number.isFinite(
                    point.latitude
                  ) &&
                  Number.isFinite(
                    point.longitude
                  )
              );

          // ---------------------------------------------------
          // AIS GAP ANALYSIS
          // ---------------------------------------------------

          let maxGapMinutes =
            null;

          let averageGapMinutes =
            null;

          const timestampedTrack =
            reconstructedTrack
              .map(
                (point) => ({
                  point,
                  timestamp:
                    parseRecordTime(
                      point
                    ),
                })
              )
              .filter(
                (item) =>
                  item.timestamp !==
                  null
              );

          if (
            timestampedTrack.length >=
            2
          ) {
            const gaps = [];

            for (
              let i = 1;
              i <
              timestampedTrack.length;
              i++
            ) {
              const diffMinutes =
                (
                  timestampedTrack[i]
                    .timestamp -
                  timestampedTrack[i - 1]
                    .timestamp
                ) /
                (60 * 1000);

              if (
                Number.isFinite(
                  diffMinutes
                ) &&
                diffMinutes >= 0
              ) {
                gaps.push(
                  diffMinutes
                );
              }
            }

            if (gaps.length) {
              maxGapMinutes =
                Math.max(...gaps);

              averageGapMinutes =
                gaps.reduce(
                  (sum, value) =>
                    sum + value,
                  0
                ) /
                gaps.length;
            }
          }

          // ---------------------------------------------------
          // COURSE / TURNING BEHAVIOUR
          // ---------------------------------------------------

          let maxCourseDeviation =
            null;

          let averageCourseDeviation =
            null;

          const courseDeviations =
            [];

          for (
            let i = 1;
            i <
            timestampedTrack.length - 1;
            i++
          ) {
            const previous =
              timestampedTrack[i - 1]
                .point;

            const current =
              timestampedTrack[i]
                .point;

            const next =
              timestampedTrack[i + 1]
                .point;

            const bearingIn =
              calculateBearing(
                Number(
                  previous.latitude
                ),
                Number(
                  previous.longitude
                ),
                Number(
                  current.latitude
                ),
                Number(
                  current.longitude
                )
              );

            const bearingOut =
              calculateBearing(
                Number(
                  current.latitude
                ),
                Number(
                  current.longitude
                ),
                Number(
                  next.latitude
                ),
                Number(
                  next.longitude
                )
              );

            const deviation =
              smallestAngleDifference(
                bearingIn,
                bearingOut
              );

            if (
              Number.isFinite(
                deviation
              )
            ) {
              courseDeviations.push(
                deviation
              );
            }
          }

          if (
            courseDeviations.length
          ) {
            maxCourseDeviation =
              Math.max(
                ...courseDeviations
              );

            averageCourseDeviation =
              courseDeviations.reduce(
                (
                  sum,
                  value
                ) =>
                  sum + value,
                0
              ) /
              courseDeviations.length;
          }

          // ---------------------------------------------------
          // TRAJECTORY ALIGNMENT
          //
          // Compare vessel travel direction with the bearing
          // from vessel location toward the investigation point.
          // ---------------------------------------------------

          let trajectoryAlignment =
            null;

          if (
            reconstructedTrack.length >=
            2
          ) {
            let currentTrackIndex =
              reconstructedTrack.findIndex(
                (point) =>
                  point ===
                  closestRecord
              );

            if (
              currentTrackIndex < 0
            ) {
              currentTrackIndex =
                Math.floor(
                  reconstructedTrack.length /
                    2
                );
            }

            let currentPoint =
              reconstructedTrack[
                currentTrackIndex
              ];

            let nextPoint =
              reconstructedTrack[
                currentTrackIndex + 1
              ];

            let previousPoint =
              reconstructedTrack[
                currentTrackIndex - 1
              ];

            let movementBearing =
              null;

            if (
              nextPoint
            ) {
              movementBearing =
                calculateBearing(
                  Number(
                    currentPoint.latitude
                  ),
                  Number(
                    currentPoint.longitude
                  ),
                  Number(
                    nextPoint.latitude
                  ),
                  Number(
                    nextPoint.longitude
                  )
                );
            } else if (
              previousPoint
            ) {
              movementBearing =
                calculateBearing(
                  Number(
                    previousPoint.latitude
                  ),
                  Number(
                    previousPoint.longitude
                  ),
                  Number(
                    currentPoint.latitude
                  ),
                  Number(
                    currentPoint.longitude
                  )
                );
            }

            if (
              movementBearing !==
                null &&
              Number.isFinite(
                movementBearing
              )
            ) {
              const bearingToInvestigation =
                calculateBearing(
                  Number(
                    currentPoint.latitude
                  ),
                  Number(
                    currentPoint.longitude
                  ),
                  effectiveLatitude,
                  effectiveLongitude
                );

              const alignmentAngle =
                smallestAngleDifference(
                  movementBearing,
                  bearingToInvestigation
                );

              trajectoryAlignment =
                Math.max(
                  0,
                  Math.min(
                    100,
                    100 -
                      (
                        alignmentAngle /
                        180
                      ) *
                        100
                  )
                );
            }
          }

          // ---------------------------------------------------
          // BEHAVIOURAL SCORE
          //
          // Larger gap + stronger course change = stronger
          // anomaly indicator.
          //
          // This is an analytical indicator, NOT proof of
          // suspicious behaviour.
          // ---------------------------------------------------

          let behaviourScore =
            null;

          if (
            maxGapMinutes !== null ||
            maxCourseDeviation !== null
          ) {
            const gapComponent =
              maxGapMinutes !== null
                ? Math.min(
                    maxGapMinutes /
                      60,
                    1
                  )
                : 0;

            const turnComponent =
              maxCourseDeviation !== null
                ? Math.min(
                    maxCourseDeviation /
                      90,
                    1
                  )
                : 0;

            const availableComponents =
              [
                maxGapMinutes !== null,
                maxCourseDeviation !== null,
              ].filter(
                Boolean
              ).length;

            if (
              availableComponents >
              0
            ) {
              behaviourScore =
                (
                  gapComponent *
                    0.45 +
                  turnComponent *
                    0.55
                ) * 100;
            }
          }

          // ---------------------------------------------------
          // PROXIMITY SCORE
          // ---------------------------------------------------

          const proximity =
            distanceScore(
              distanceKm
            );

          // ---------------------------------------------------
          // TIME EVIDENCE
          //
          // Exact satellite acquisition time is unavailable.
          // Therefore do not fabricate time evidence.
          // ---------------------------------------------------

          const timeDifferenceMinutes =
            null;

          const hasTimeEvidence =
            false;

          // ---------------------------------------------------
          // AVAILABLE SIGNALS
          // ---------------------------------------------------

          const hasTrajectoryEvidence =
            Number.isFinite(
              trajectoryAlignment
            );

          const hasBehaviourEvidence =
            Number.isFinite(
              behaviourScore
            );

          const baseWeights = {
            proximity: 60,
            time: 20,
            trajectory: 15,
            behaviour: 5,
          };

          const availableEvidenceWeight =
            baseWeights.proximity +
            (
              hasTimeEvidence
                ? baseWeights.time
                : 0
            ) +
            (
              hasTrajectoryEvidence
                ? baseWeights.trajectory
                : 0
            ) +
            (
              hasBehaviourEvidence
                ? baseWeights.behaviour
                : 0
            );

          const normalizedProximityWeight =
            baseWeights.proximity /
            availableEvidenceWeight;

          const normalizedTimeWeight =
            hasTimeEvidence
              ? baseWeights.time /
                availableEvidenceWeight
              : 0;

          const normalizedTrajectoryWeight =
            hasTrajectoryEvidence
              ? baseWeights.trajectory /
                availableEvidenceWeight
              : 0;

          const normalizedBehaviourWeight =
            hasBehaviourEvidence
              ? baseWeights.behaviour /
                availableEvidenceWeight
              : 0;

          // ---------------------------------------------------
          // EVIDENCE SCORE
          // ---------------------------------------------------

          const evidenceScore =
            proximity *
              normalizedProximityWeight +

            (
              hasTimeEvidence
                ? 1
                : 0
            ) *
              normalizedTimeWeight +

            (
              hasTrajectoryEvidence
                ? (
                    Number(
                      trajectoryAlignment
                    ) / 100
                  )
                : 0
            ) *
              normalizedTrajectoryWeight +

            (
              hasBehaviourEvidence
                ? (
                    Number(
                      behaviourScore
                    ) / 100
                  )
                : 0
            ) *
              normalizedBehaviourWeight;

          // ---------------------------------------------------
          // EVIDENCE COVERAGE
          // ---------------------------------------------------

          const evidenceCoverage =
            availableEvidenceWeight /
            100;

          // ---------------------------------------------------
          // FINAL ANALYTICAL SCORE
          // ---------------------------------------------------

          const riskScore =
            evidenceScore *
            evidenceCoverage;

          const suspectProbability =
            Math.round(
              Math.max(
                0,
                Math.min(
                  100,
                  riskScore * 100
                )
              )
            );

          // ---------------------------------------------------
          // RISK LEVEL
          // ---------------------------------------------------

          let riskLevel =
            "LOW";

          if (
            suspectProbability >=
              75 &&
            evidenceCoverage >=
              0.75
          ) {
            riskLevel =
              "HIGH";
          } else if (
            suspectProbability >=
              50 &&
            evidenceCoverage >=
              0.50
          ) {
            riskLevel =
              "MEDIUM";
          }

          // ---------------------------------------------------
          // RISK FACTORS
          // ---------------------------------------------------

          const riskFactors =
            [];

          if (
            distanceKm <= 5
          ) {
            riskFactors.push(
              `Strong spatial proximity (${distanceKm.toFixed(
                2
              )} km from investigation point)`
            );
          } else if (
            distanceKm <= 15
          ) {
            riskFactors.push(
              `Moderate spatial proximity (${distanceKm.toFixed(
                2
              )} km from investigation point)`
            );
          } else {
            riskFactors.push(
              `Lower spatial proximity (${distanceKm.toFixed(
                2
              )} km from investigation point)`
            );
          }

          if (
            hasTimeEvidence
          ) {
            riskFactors.push(
              `Satellite-to-AIS time correlation available (${timeDifferenceMinutes} min)`
            );
          } else {
            riskFactors.push(
              "Exact satellite acquisition time is unavailable for this scene"
            );
          }

          if (
            hasTrajectoryEvidence
          ) {
            riskFactors.push(
              `Trajectory alignment available (${Math.round(
                trajectoryAlignment
              )}%)`
            );
          } else {
            riskFactors.push(
              "Trajectory alignment unavailable because insufficient chronological AIS observations were available"
            );
          }

          if (
            hasBehaviourEvidence
          ) {
            riskFactors.push(
              `Behavioural indicator available (${Math.round(
                behaviourScore
              )}%)`
            );
          } else {
            riskFactors.push(
              "Behavioural indicator unavailable from the reconstructed AIS track"
            );
          }

          if (
            maxGapMinutes !== null
          ) {
            riskFactors.push(
              `Maximum AIS observation gap: ${maxGapMinutes.toFixed(
                1
              )} min`
            );
          }

          if (
            averageCourseDeviation !== null
          ) {
            riskFactors.push(
              `Average course change: ${averageCourseDeviation.toFixed(
                1
              )}°`
            );
          }

          if (
            evidenceCoverage < 1
          ) {
            riskFactors.push(
              `Investigation confidence limited by incomplete evidence (${Math.round(
                evidenceCoverage * 100
              )}% coverage)`
            );
          }

          // ---------------------------------------------------
          // FINAL VESSEL OBJECT
          // ---------------------------------------------------

          return {
            vesselId:
              closestRecord.imo ||
              `MMSI-${mmsi}`,

            mmsi,

            vesselName:
              closestRecord.vesselName ||
              `MMSI ${mmsi}`,

            vesselType:
              closestRecord.vesselType ||
              "Unknown",

            imo:
              closestRecord.imo ||
              null,

            callSign:
              closestRecord.callSign ||
              null,

            latitude:
              Number(
                closestRecord.latitude
              ),

            longitude:
              Number(
                closestRecord.longitude
              ),

            speedKnots:
              closestRecord.sog !== null &&
              closestRecord.sog !== undefined
                ? Number(
                    closestRecord.sog
                  )
                : null,

            course:
              closestRecord.cog !== null &&
              closestRecord.cog !== undefined
                ? Number(
                    closestRecord.cog
                  )
                : null,

            heading:
              closestRecord.heading !== null &&
              closestRecord.heading !== undefined
                ? Number(
                    closestRecord.heading
                  )
                : null,

            distanceKm:
              Number(
                distanceKm.toFixed(
                  2
                )
              ),

            // Exact satellite time unavailable
            timeDifferenceMinutes:
              null,

            // Reconstructed historical AIS evidence
            aisGapMinutes:
              maxGapMinutes !== null
                ? Number(
                    maxGapMinutes.toFixed(
                      1
                    )
                  )
                : null,

            averageAisGapMinutes:
              averageGapMinutes !== null
                ? Number(
                    averageGapMinutes.toFixed(
                      1
                    )
                  )
                : null,

            courseDeviationDegrees:
              maxCourseDeviation !== null
                ? Number(
                    maxCourseDeviation.toFixed(
                      1
                    )
                  )
                : null,

            averageCourseDeviationDegrees:
              averageCourseDeviation !==
                null
                ? Number(
                    averageCourseDeviation.toFixed(
                      1
                    )
                  )
                : null,

            trajectoryAlignment:
              hasTrajectoryEvidence
                ? Number(
                    trajectoryAlignment.toFixed(
                      1
                    )
                  )
                : null,

            proximityScore:
              Number(
                (
                  proximity * 100
                ).toFixed(0)
              ),

            timeMatchScore:
              null,

            behaviourScore:
              hasBehaviourEvidence
                ? Number(
                    behaviourScore.toFixed(
                      1
                    )
                  )
                : null,

            evidenceCoverage:
              Number(
                (
                  evidenceCoverage *
                  100
                ).toFixed(0)
              ),

            evidenceAvailable: {
              proximity:
                true,

              time:
                hasTimeEvidence,

              trajectory:
                hasTrajectoryEvidence,

              behaviour:
                hasBehaviourEvidence,
            },

            suspectProbability,

            riskLevel,

            riskBreakdown: {
              proximity: {
                baseWeight:
                  baseWeights.proximity,

                available:
                  true,

                score:
                  Number(
                    (
                      proximity *
                      100
                    ).toFixed(0)
                  ),

                normalizedWeight:
                  Number(
                    (
                      normalizedProximityWeight *
                      100
                    ).toFixed(1)
                  ),
              },

              time: {
                baseWeight:
                  baseWeights.time,

                available:
                  false,

                score:
                  null,

                normalizedWeight:
                  0,
              },

              trajectory: {
                baseWeight:
                  baseWeights.trajectory,

                available:
                  hasTrajectoryEvidence,

                score:
                  hasTrajectoryEvidence
                    ? Number(
                        trajectoryAlignment.toFixed(
                          1
                        )
                      )
                    : null,

                normalizedWeight:
                  hasTrajectoryEvidence
                    ? Number(
                        (
                          normalizedTrajectoryWeight *
                          100
                        ).toFixed(1)
                      )
                    : 0,
              },

              behaviour: {
                baseWeight:
                  baseWeights.behaviour,

                available:
                  hasBehaviourEvidence,

                score:
                  hasBehaviourEvidence
                    ? Number(
                        behaviourScore.toFixed(
                          1
                        )
                      )
                    : null,

                normalizedWeight:
                  hasBehaviourEvidence
                    ? Number(
                        (
                          normalizedBehaviourWeight *
                          100
                        ).toFixed(1)
                      )
                    : 0,
              },

              evidenceCoverage:
                Number(
                  (
                    evidenceCoverage *
                    100
                  ).toFixed(0)
                ),

              finalScore:
                suspectProbability,
            },

            riskFactors,

            baseDateTime:
              closestRecord.baseDateTime ||
              null,

            // Full reconstructed track
            track:
              trackForResponse,

            trackPointCount:
              trackForResponse.length,

            dataSource:
              "NOAA_AIS_2018",
          };
        }
      );

    // =========================================================
    // SORT
    // =========================================================

    rankedVessels.sort(
      (a, b) =>
        b.suspectProbability -
        a.suspectProbability
    );

    // =========================================================
    // ALERT GENERATION
    // =========================================================

    const alerts =
      rankedVessels
        .filter(
          (vessel) =>
            vessel.riskLevel ===
            "HIGH"
        )
        .map(
          (vessel) => ({
            alertId:
              `ALT-${vessel.vesselId}`,

            severity:
              "HIGH",

            type:
              "VESSEL_RISK",

            vesselId:
              vessel.vesselId,

            vesselName:
              vessel.vesselName,

            suspectScore:
              vessel.suspectProbability,

            message:
              `${vessel.vesselName} shows high analytical suspicion based on available spatial, trajectory and AIS behavioural evidence.`,

            createdAt:
              new Date().toISOString(),
          })
        );

    // =========================================================
    // RESPONSE
    // =========================================================

    res.json({
      success: true,

      status: "ready",

      source:
        "NOAA_AIS_2018",

      investigationPoint: {
        latitude:
          effectiveLatitude,

        longitude:
          effectiveLongitude,
      },

      // Keep null when exact satellite acquisition time
      // is unavailable.
      originTime:
        originTime || null,

      sceneDate:
        "2018-09-26",

      searchRadiusKm:
        effectiveSearchRadiusKm,

      timeWindowHours:
        effectiveTimeWindowHours,

      vesselCount:
        rankedVessels.length,

      vessels:
        rankedVessels,

      alerts,

      limitations: [
        "Exact satellite acquisition time is unavailable from the supplied TIFF metadata.",
        "Trajectory evidence is reconstructed from historical AIS observations around the nearest vessel position.",
        "Behaviour score is an analytical indicator based on AIS gaps and course changes, not proof of wrongdoing.",
        "NOAA historical AIS dataset used here is from the Gulf of Mexico on 2018-09-26.",
      ],
    });
  } catch (error) {
    console.error(
      "AIS correlation error:",
      error
    );

    res.status(500).json({
      success: false,

      message:
        "Unable to perform AIS correlation",
    });
  }
});

// ============================================================
// SAVE INVESTIGATION
// ============================================================

app.post("/api/investigations", async (req, res) => {
  try {
    const {
      investigationId,
      satellite,
      drift,
      ais,
    } = req.body;

    if (!investigationId) {
      return res.status(400).json({
        success: false,
        message: "Investigation ID is required.",
      });
    }

    const investigation = await Investigation.findOneAndUpdate(
      { investigationId },
      {
        investigationId,
        status: "completed",
        satellite: satellite || null,
        drift: drift || null,
        ais: ais || null,
        updatedAt: new Date(),
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Investigation saved successfully.",
      investigation,
    });
  } catch (error) {
    console.error(
      "Investigation save error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Unable to save investigation.",
      error: error.message,
    });
  }
});
// ============================================================
// GET INVESTIGATION HISTORY
// ============================================================

app.get("/api/investigations", async (req, res) => {
   console.log("🔥 GET INVESTIGATIONS ROUTE HIT");
  try {
    const investigations = await Investigation.find()
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: investigations.length,
      investigations,
    });
    
  } catch (error) {
    console.error("Investigation history error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch investigation history.",
      error: error.message,
    });
  }
});

console.log("GET INVESTIGATION HISTORY ROUTE LOADED");
// ============================================================
// SERVER
// ============================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});