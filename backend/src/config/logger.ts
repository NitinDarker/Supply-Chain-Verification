import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import fs from "fs";
import path from "path";

const isDev = process.env.NODE_ENV !== "production";

const logsDir = process.env.LOG_DIR
  ? path.resolve(process.env.LOG_DIR)
  : path.resolve(process.cwd(), "logs");

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
  level: "info",

  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),

  transports: [
    // Combined Logs
    new DailyRotateFile({
      filename: path.join(logsDir, "combined-%DATE%.log"),
      auditFile: path.join(logsDir, "combined-audit.json"),
      datePattern: "YYYY-MM-DD",
      level: "info",
      maxSize: "20m",
      maxFiles: "14d",
      zippedArchive: true,
    }),

    // Error Logs
    new DailyRotateFile({
      filename: path.join(logsDir, "error-%DATE%.log"),
      auditFile: path.join(logsDir, "error-audit.json"),
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxSize: "20m",
      maxFiles: "30d",
      zippedArchive: true,
    }),

    // Console in development for local debugging
    ...(isDev
      ? [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp(),
              winston.format.printf(
                ({ level, message, timestamp, ...meta }) =>
                  `${timestamp} [${level}]: ${message} ${
                    Object.keys(meta).length ? JSON.stringify(meta) : ""
                  }`,
              ),
            ),
          }),
        ]
      : []),
  ],
});

logger.info("[Logger] File logging initialized", { logsDir });

export default logger;
