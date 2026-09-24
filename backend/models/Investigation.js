const mongoose = require("mongoose");

const VesselSchema = new mongoose.Schema(
  {
   vesselId: String,
vesselName: String,
vesselType: String,
mmsi: String,
imo: String,
callSign: String,

latitude: Number,
longitude: Number,

speedKnots: Number,
course: Number,
heading: Number,

track: {
  type: [
    {
      latitude: Number,
      longitude: Number,
      baseDateTime: String,
      sog: Number,
      cog: Number,
      heading: Number,
    },
  ],
  default: [],
},

trackPointCount: Number,
    speedKnots: Number,
    course: Number,

    distanceKm: Number,
    timeDifferenceMinutes: Number,
    aisGapMinutes: Number,
    courseDeviationDegrees: Number,

    trajectoryAlignment: Number,
    proximityScore: Number,
    timeMatchScore: Number,
    behaviourScore: Number,

    suspectProbability: Number,
    riskLevel: String,

    riskBreakdown: {
      proximity: {
        weight: Number,
        score: Number,
        contribution: Number,
      },

      trajectory: {
        weight: Number,
        score: Number,
        contribution: Number,
      },

      timeMatch: {
        weight: Number,
        score: Number,
        contribution: Number,
      },

      behaviour: {
        weight: Number,
        score: Number,
        contribution: Number,
      },

      total: Number,
    },

    riskFactors: [String],
  },
  { _id: false }
);

const AlertSchema = new mongoose.Schema(
  {
    alertId: String,
    severity: String,
    type: String,

    vesselId: String,
    vesselName: String,

    suspectScore: Number,
    message: String,

    createdAt: Date,
  },
  { _id: false }
);

const InvestigationSchema = new mongoose.Schema(
  {
    investigationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      default: "completed",
    },

    satellite: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    drift: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    ais: {
      investigationPoint: {
        latitude: Number,
        longitude: Number,
      },

      originTime: String,

      searchRadiusKm: Number,
      timeWindowHours: Number,

      vesselCount: Number,

      vessels: {
        type: [VesselSchema],
        default: [],
      },

      alerts: {
        type: [AlertSchema],
        default: [],
      },
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "investigations",
  }
);

module.exports = mongoose.model(
  "Investigation",
  InvestigationSchema
);