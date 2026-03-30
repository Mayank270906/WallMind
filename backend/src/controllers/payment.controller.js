import { User } from "../models/user.model.js";
import { verifyPaymentTx, getProjectPublicKey } from "../services/stellar.service.js";

/* =================================
   VERIFY STELLAR PAYMENT
================================= */
export const verifyPayment = async (req, res) => {
    try {
        const { txHash } = req.body;
        const userId = req.user.id;

        if (!txHash) {
            return res.status(400).json({ success: false, error: "Transaction hash is required" });
        }

        const verificationResult = await verifyPaymentTx(txHash);

        if (!verificationResult.valid) {
            return res.status(400).json({ success: false, error: verificationResult.error || "Invalid payment transaction." });
        }

        // For every 1 XLM paid, give 1 credit (or 10 XLM = 5 credits). Let's do 1 XLM = 1 Credit for simplicity.
        // Ensure amount was sufficient, e.g., > 0
        if (verificationResult.amount <= 0) {
            return res.status(400).json({ success: false, error: "Amount paid was 0." });
        }

        // Add credits to user
        const creditsToAdd = Math.floor(verificationResult.amount); // e.g. 5 XLM -> 5 credits
        if (creditsToAdd <= 0) {
            return res.status(400).json({ success: false, error: "Payment amount too low. Minimum 1 XLM." });
        }

        const user = await User.findById(userId);
        user.credits += creditsToAdd;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Payment verified successfully",
            addedCredits: creditsToAdd,
            totalCredits: user.credits
        });

    } catch (error) {
        console.error("Payment Verification Error:", error);
        return res.status(500).json({ success: false, error: "Internal server error" });
    }
};

export const getWalletAddress = async (req, res) => {
    // Return the wallet address configured on the backend so the frontend knows who to pay
    return res.status(200).json({
        success: true,
        address: getProjectPublicKey()
    });
};
