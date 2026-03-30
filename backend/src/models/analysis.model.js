import mongoose from "mongoose";

const analysisSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    imageUrl: {
      type: String, // local path or cloudinary
      required: true
    },

    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing"
    },

    report: {
      type: Object, // full JSON from pipeline
      default: {}
    },

    sceneJson: {
      type: Object, // Three.js output
      default: {}
    },

    gltfUrl: {
      type: String
    },

    structuralFlags: {
      type: Array,
      default: []
    },

    stellarTxHash: {
      type: String
    }

  },
  { timestamps: true }
);

export const Analysis = mongoose.model("Analysis", analysisSchema);
