import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import kantaRoutes from "./routes/kantaroutes.js";
import takPattiRoutes from "./routes/takpattiroutes.js";
import bazaarBillRoutes from "./routes/bazaarbillroutes.js";
import bazaarPaymentRoutes from "./routes/bazaarpaymentsroutes.js";
import padamRoutes from "./routes/padamroutes.js";

dotenv.config();

const app = express();

// Middleware
// 🔥 Updated CORS to be more flexible for your mobile connection
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Connect DB
connectDB();

// Routes
app.use("/api/kanta", kantaRoutes);
app.use("/api/takpatti", takPattiRoutes);
app.use("/api/bazaarbills", bazaarBillRoutes);
app.use("/api/bazaarpayments", bazaarPaymentRoutes);
app.use("/api/padam", padamRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("Om Balaji API is running...");
});

// Start Server
const PORT = process.env.PORT || 5000;

// 🔥 ONLY USE THIS VERSION - It allows connections from your phone (0.0.0.0)
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on http://192.168.1.11:${PORT}`);
});