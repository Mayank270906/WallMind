import { Router } from "express";
import {
    login, logout, signup, verifyEmail,
    freighterLogin, freighterSignup, linkWallet, addEmail
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const authRouter = Router();

authRouter.post("/signup", signup);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.get("/verify-email", verifyEmail);

authRouter.post("/freighter-login", freighterLogin);
authRouter.post("/freighter-signup", freighterSignup);
authRouter.post("/link-wallet", authMiddleware, linkWallet);
authRouter.post("/add-email", authMiddleware, addEmail);

export default authRouter;

