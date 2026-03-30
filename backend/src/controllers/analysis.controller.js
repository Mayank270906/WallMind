import { Analysis } from "../models/analysis.model.js";
import { User } from "../models/user.model.js";
import path from "path";
import { runParser } from "../utils/parser.js";
import { anchorReportOnStellar } from "../services/stellar.service.js";

/* =================================
   CREATE ANALYSIS
================================= */
export const createAnalysis = async (req, res) => {
  // Declare outside try so the catch block can mark it as failed
  let record = null;

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const userId = req.user.id;

    // Check credits
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    if (user.credits <= 0) {
      return res.status(403).json({ success: false, error: "Insufficient credits" });
    }

    // Deduct 1 credit immediately to prevent concurrent spam
    user.credits -= 1;
    await user.save();

    const filePath = req.file.path.replace(/\\/g, "/");
    // express.static("public") mounts the public/ dir → URL = /temp/<filename>
    const imageUrl = `/temp/${path.basename(req.file.path)}`;

    // 1. Save a "processing" stub immediately so the dashboard shows it
    record = await Analysis.create({
      user: userId,
      imageUrl: imageUrl,
      status: "processing",
    });

    // 2. Run the Python parser
    const parsedData = await runParser(filePath);

    // 3. Persist full results
    record.report = parsedData;
    record.sceneJson = parsedData.sceneJson || {};
    record.structuralFlags = parsedData.structuralFlags || [];
    record.status = "completed";

    // 4. Anchor on Stellar Testnet
    const anchorTxHash = await anchorReportOnStellar(parsedData);
    if (anchorTxHash) {
      record.stellarTxHash = anchorTxHash;
    }

    await record.save();

    return res.status(201).json({
      success: true,
      analysisId: record._id,
      report: parsedData,
      stellarTxHash: record.stellarTxHash,
      remainingCredits: user.credits
    });

  } catch (err) {
    console.error("Create Analysis Error:", err);

    // Mark record as failed if stub was already created
    if (record) {
      record.status = "failed";
      await record.save().catch(() => { });
    }

    return res.status(500).json({
      success: false,
      error: err.message || "Parser failed",
    });
  }
};

/* =================================
   GET ALL ANALYSES (USER)
================================= */
export const getAllAnalyses = async (req, res) => {
  try {
    const userId = req.user.id;

    const analyses = await Analysis.find({ user: userId })
      .sort({ createdAt: -1 })
      // Only return the fields the dashboard card needs (keep response small)
      .select("_id imageUrl status createdAt structuralFlags");

    return res.status(200).json({
      success: true,
      count: analyses.length,
      analyses,
    });

  } catch (error) {
    console.error("Get All Analyses Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* =================================
   GET SINGLE ANALYSIS
================================= */
export const getAnalysisById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ success: false, message: "Analysis not found" });
    }

    const analysis = await Analysis.findOne({ _id: id, user: userId });

    if (!analysis) {
      return res.status(404).json({ success: false, message: "Analysis not found" });
    }

    return res.status(200).json({ success: true, analysis });

  } catch (error) {
    console.error("Get Analysis By ID Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* =================================
   DELETE ANALYSIS
================================= */
export const deleteAnalysis = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const analysis = await Analysis.findOneAndDelete({ _id: id, user: userId });

    if (!analysis) {
      return res.status(404).json({ success: false, message: "Analysis not found" });
    }

    return res.status(200).json({ success: true, message: "Analysis deleted" });

  } catch (error) {
    console.error("Delete Analysis Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};