import { User } from "../models/user.model.js";
import crypto from "crypto";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import { sendEmail } from "../services/email.service.js";


/* =================================
   HELPER — hash a raw token
================================= */

const hashToken = (raw) =>
  crypto.createHash("sha256").update(raw).digest("hex");


/* =================================
   SIGNUP
================================= */

export const signup = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // validation — fullname removed, not in schema
    if (!email || !password || !username) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    // raw token sent to user, hashed token stored in DB
    // schema field is resetPasswordToken — reused here for email verification
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashToken(rawToken);

    const user = await User.create({
      email,
      password,
      username,
      resetPasswordToken: hashedToken,
      resetPasswordExpiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24h
    });

    const verificationURL =
      `${process.env.FRONTEND_URL}/api/v1/auth/verify-email?token=${rawToken}`;

    // respond immediately, send email in background
    res.status(201).json({
      success: true,
      message: "User created. Verify your email."
    });

    sendEmail({
      to: user.email,
      subject: "Verify Your Email",
      html: `
        <h2>Email Verification</h2>
        <p>Hello ${username},</p>
        <p>Click below to verify:</p>
        <a href="${verificationURL}">Verify Email</a>
        <p>Expires in 24 hours</p>
      `,
      text: `Verify your email: ${verificationURL}`
    }).catch(err => console.error("Email error:", err.message));

  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


/* =================================
   LOGIN
================================= */

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required"
      });
    }

    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Verify your email first"
      });
    }

    // lastActive matches the schema field (was lastLogin before)
    user.lastActive = new Date();
    await user.save();

    generateTokenAndSetCookie(res, user._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,         // fullname removed
        publicKey: user.publicKey,
        avatar: user.avatar,
        credits: user.credits,
        totalProjects: user.totalProjects
      }
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"  // never leak error.message in prod
    });
  }
};


/* =================================
   LOGOUT
================================= */

export const logout = async (req, res) => {
  try {
    res.cookie("token", "", {
      httpOnly: true,
      expires: new Date(0),
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production"
    });

    res.status(200).json({
      success: true,
      message: "Logged out"
    });

  } catch (error) {
    console.error("Logout Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


/* =================================
   VERIFY EMAIL
================================= */

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token missing"
      });
    }

    // hash the incoming raw token, then look up the stored hash
    const hashedToken = hashToken(token);

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiresAt: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token"
      });
    }

    user.isVerified = true;
    user.resetPasswordToken = undefined;     // clear after use
    user.resetPasswordExpiresAt = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Email verified"
    });

  } catch (error) {
    console.error("Verify Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/* =================================
   FREIGHTER LOGIN
================================= */
export const freighterLogin = async (req, res) => {
  try {
    const { publicKey } = req.body;
    if (!publicKey) return res.status(400).json({ success: false, message: "Public key required" });

    const user = await User.findOne({ publicKey });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found, please sign up" });
    }

    user.lastActive = new Date();
    await user.save();

    generateTokenAndSetCookie(res, user._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        publicKey: user.publicKey,
        avatar: user.avatar,
        credits: user.credits
      }
    });
  } catch (error) {
    console.error("Freighter Login Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* =================================
   FREIGHTER SIGNUP
================================= */
export const freighterSignup = async (req, res) => {
  try {
    const { publicKey, username } = req.body;
    if (!publicKey || !username) {
      return res.status(400).json({ success: false, message: "PublicKey and Username required" });
    }

    const existingUser = await User.findOne({ $or: [{ publicKey }, { username }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Username or PublicKey already exists" });
    }

    const user = await User.create({
      username,
      publicKey,
      isVerified: true // Web3 wallets are inherently verified
    });

    generateTokenAndSetCookie(res, user._id);

    res.status(201).json({
      success: true,
      message: "Signup successful",
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        publicKey: user.publicKey,
        avatar: user.avatar,
        credits: user.credits
      }
    });
  } catch (error) {
    console.error("Freighter Signup Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* =================================
   LINK WALLET TO EXISTING ACCOUNT
================================= */
export const linkWallet = async (req, res) => {
  try {
    const { publicKey } = req.body;
    if (!publicKey) return res.status(400).json({ success: false, message: "Public key required" });

    const existingWallet = await User.findOne({ publicKey });
    if (existingWallet) {
      return res.status(400).json({ success: false, message: "This wallet is already attached to another account" });
    }

    const user = await User.findById(req.user.id);
    user.publicKey = publicKey;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Wallet linked successfully",
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        publicKey: user.publicKey,
        avatar: user.avatar,
        credits: user.credits
      }
    });

  } catch (error) {
    console.error("Link Wallet Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* =================================
   ADD EMAIL TO EXISTING ACCOUNT
================================= */
export const addEmail = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password required" });

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email is already in use" });
    }

    const user = await User.findById(req.user.id);
    user.email = email;
    user.password = password; // Will be hashed via pre-save hook
    user.isVerified = true; // Assuming we skip verification for this MVP, or we can use the same reset password flow
    await user.save();

    res.status(200).json({
      success: true,
      message: "Email added successfully",
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        publicKey: user.publicKey,
        avatar: user.avatar,
        credits: user.credits
      }
    });

  } catch (error) {
    console.error("Add Email Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};