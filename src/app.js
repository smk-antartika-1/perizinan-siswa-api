import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import router from "./routes.js";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler.js";
import { openApiSpec } from "./docs/openapi.js";

const app = express();

app.use(
  helmet({
    hsts: env.nodeEnv === "production",
    crossOriginResourcePolicy: false,
  })
);
app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static(path.resolve(env.uploadDir)));
app.get("/docs.json", (_req, res) => res.json(openApiSpec));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.use("/api/v1", router);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
