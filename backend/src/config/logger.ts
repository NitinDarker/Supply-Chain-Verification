import winston from "winston";
import "winston-mongodb";

const isDev = process.env.NODE_ENV !== "production";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    // Console in development
    ...(isDev
      ? [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
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

    // MongoDB — stores in your existing DB, in a "logs" collection
    new winston.transports.MongoDB({
      db: process.env.MONGODB_URI!,
      collection: "logs",
      level: "info",
      storeHost: false,
      capped: true,
      cappedMax: 5000, // max 5000 log entries, oldest auto-deleted
      tryReconnect: true,
      metaKey: "meta",
    }),
  ],
});

export default logger;
