import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { Resend } from "resend";
import routes from "./routes/index.js";
import oauthRoutes from "./oauth.js";
import devConfig from "../config.dev.json" with { type: "json" };
import prodConfig from "../config.prod.json" with { type: "json" };

dotenv.config();

const app = express();

const config = process.env.NODE_ENV === "development" ? devConfig : prodConfig;

const PORT = config.PORT || 5000;
const frontendURL = config.frontendURL;
const backendURL = config.backendURL;

// Configure CORS with specific options
app.use(
  cors({
    origin: frontendURL, // Your frontend URL
    credentials: true, // Allow credentials
    methods: ["GET", "POST", "DELETE"], // Allowed methods
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["set-cookie"],
  }),
);

app.use(express.json()); // Parse JSON request body

app.use("/", oauthRoutes);
app.use("/api", routes);

const resend = new Resend(process.env.RESEND_API_KEY);

// Email verification endpoint
app.post("/send-verification-email", async (req, res) => {
  const { email, code } = req.body;

  try {
    const response = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Your Verification Code",
      html: `<p>Your verification code is: <strong>${code}</strong></p>`,
    });

    console.log("Email sent:", response);
    res.status(200).json({ message: "Verification email sent" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send verification email" });
  }
});

if (process.env.NODE_ENV === "development") {
  app.listen(PORT, () => {
    console.log(`Server running on ${backendURL}`);
  });
}
// Vercel's server-less things
export default app;
