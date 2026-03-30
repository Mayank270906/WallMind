import express from "express";
import { verifyPayment, getWalletAddress } from "../controllers/payment.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.route("/verify").post(authMiddleware, verifyPayment);
router.route("/wallet").get(authMiddleware, getWalletAddress);

export default router;
