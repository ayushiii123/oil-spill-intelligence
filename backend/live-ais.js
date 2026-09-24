require("dotenv").config();

const WebSocket = require("ws");

const AISSTREAM_URL =
  "wss://stream.aisstream.io/v0/stream";

const API_KEY =
  process.env.AISSTREAM_API_KEY;

if (!API_KEY) {
  console.error(
    "ERROR: AISSTREAM_API_KEY is missing from .env"
  );
  process.exit(1);
}

const socket = new WebSocket(
  AISSTREAM_URL,
  {
    perMessageDeflate: true,
  }
);

socket.on("open", () => {
  console.log(
    "AISStream WebSocket connected"
  );

  const subscription = {
    APIKey: API_KEY,

    // Wider Gulf of Mexico test area
    BoundingBoxes: [
      [
        [27.0, -92.0],
        [31.5, -85.0],
      ],
    ],

    // We only need live vessel positions
    FilterMessageTypes: [
      "PositionReport",
    ],
  };

  socket.send(
    JSON.stringify(subscription)
  );

  console.log(
    "AISStream subscription sent"
  );
});

socket.on("message", (data) => {
  try {
    /*
      AISStream can send binary WebSocket frames.
      Convert to string before JSON parsing.
    */
    const raw =
      Buffer.isBuffer(data)
        ? data.toString("utf8")
        : data.toString();

    const event =
      JSON.parse(raw);

    // ---------------------------------------------
    // Subscription confirmation
    // ---------------------------------------------

    if (
      event.MessageType ===
      "SubscriptionConfirmation"
    ) {
      console.log(
        "AISStream subscription confirmed:",
        event.Message
      );

      return;
    }

    // ---------------------------------------------
    // Live vessel position
    // ---------------------------------------------

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

    /*
      AISStream normalized metadata contains
      Latitude / Longitude.
    */

    const latitude =
      meta.Latitude ??
      position.Latitude ??
      null;

    const longitude =
      meta.Longitude ??
      position.Longitude ??
      null;

    /*
      AIS heading 511 means "not available".
    */

    const heading =
      position.TrueHeading === 511
        ? null
        : position.TrueHeading;

    const liveVessel = {
      mmsi:
        meta.MMSI ??
        position.UserID ??
        null,

      vesselName:
        (
          meta.ShipName ||
          "Unknown"
        ).trim(),

      latitude,

      longitude,

      speedKnots:
        position.Sog ?? null,

      course:
        position.Cog ?? null,

      heading,

      timestamp:
        meta.time_utc ?? null,
    };

    console.log(
      "LIVE AIS:",
      liveVessel
    );

  } catch (error) {

    console.error(
      "AISStream message parse error:",
      error.message
    );
  }
});

socket.on("error", (error) => {

  console.error(
    "AISStream WebSocket error:",
    error.message
  );
});

socket.on("close", () => {

  console.log(
    "AISStream WebSocket closed"
  );
});