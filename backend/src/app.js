import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// ✅ Robust CORS setup
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174", // Added this because your frontend started on port 5174
  process.env.FRONTEND_URL // Setup this env var in Render
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS not allowed"));
  },
  credentials: true
}));

// Middlewares
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Routes
import authRouter from "./routes/auth.route.js";
//import userRouter from "./routes/user.route.js";
import analysisRouter from "./routes/analysis.route.js";
import paymentRouter from "./routes/payment.route.js";

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/analysis", analysisRouter);
app.use("/api/v1/payment", paymentRouter);
//app.use("/api/v1/user", userRouter);

export { app };