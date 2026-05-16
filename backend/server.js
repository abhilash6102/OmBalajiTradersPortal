import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import kantaRoutes from "./routes/kantaroutes.js";
import takPattiRoutes from "./routes/takpattiroutes.js";
import bazaarBillRoutes from "./routes/bazaarbillroutes.js";
import bazaarPaymentRoutes from "./routes/bazaarpaymentsroutes.js";
import padamRoutes from "./routes/padamroutes.js";
import traderRoutes from "./routes/traderroutes.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect DB
connectDB();

// Routes
app.use("/api/kanta", kantaRoutes);
app.use("/api/takpatti", takPattiRoutes);
app.use("/api/bazaarbills", bazaarBillRoutes);
app.use("/api/bazaarpayments", bazaarPaymentRoutes);
app.use("/api/padam", padamRoutes);
app.use("/api/traders", traderRoutes);

app.get("/", (req, res) => {
  res.send("Om Balaji API is running...");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});