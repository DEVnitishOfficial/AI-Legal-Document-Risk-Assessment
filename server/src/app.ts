import express from "express";
import cors from "cors";
import { errorHandler } from "./common/middleware/error.middleware";
import routes from "./routes";

const app = express();

app.use(cors());
app.use(express.json());
console.log("Express app initialized with CORS and JSON parsing");
app.use("/api/v1", routes);
app.use(errorHandler);

app.get("/health", (req, res) => {
  res.json({ message: "Server is running 🚀" });
});

export default app;