const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection (Mongoose v6+)
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) =>
    console.error(" MongoDB connection error:", err.message)
  );

// Health check route
app.get("/", (req, res) => {
  res.send("🚀 AI Agent Backend is running");
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/learning", require("./routes/learning"));
app.use("/api/quizzes", require("./routes/quizzes"));
app.use("/api/translation", require("./routes/translation"));

// Server start
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
