import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { attachUser } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { catalogRouter } from "./routes/catalog.js";
import { userRouter } from "./routes/user.js";
import { subscriptionRouter, stripeWebhookHandler } from "./routes/subscription.js";
import { adminRouter } from "./routes/admin.js";
import { uploadDirPath } from "./lib/upload.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const WEB_ORIGIN = process.env.WEB_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: WEB_ORIGIN, credentials: true }));

// Stripe webhook needs the raw body — mount before the JSON body parser.
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), stripeWebhookHandler);

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(uploadDirPath));
app.use(attachUser);

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api", catalogRouter);
app.use("/api", userRouter);
app.use("/api", subscriptionRouter);
app.use("/api/admin", adminRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Erreur serveur" });
});

app.listen(PORT, () => {
  console.log(`Yogella API listening on http://localhost:${PORT}`);
});
