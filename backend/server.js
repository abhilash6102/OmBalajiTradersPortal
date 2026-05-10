import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db.js";
import kantaRoutes from "./routes/kantaroutes.js";
import takPattiRoutes from "./routes/takpattiroutes.js"; // 🔥 Add this import
import bazaarBillRoutes from "./routes/bazaarbillroutes.js"; // Import the routes
import bazaarPaymentRoutes from "./routes/bazaarpaymentsroutes.js"; // Add to top imports
import padamRoutes from "./routes/padamroutes.js";



dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect DB
connectDB();

// Routes
app.use("/api/kanta", kantaRoutes);
app.use("/api/takpatti", takPattiRoutes); // 🔥 Add this route mapping
app.use("/api/bazaarbills", bazaarBillRoutes); // Register the endpoint
app.use("/api/bazaarpayments", bazaarPaymentRoutes); // Add to your routes section
app.use("/api/padam", padamRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});