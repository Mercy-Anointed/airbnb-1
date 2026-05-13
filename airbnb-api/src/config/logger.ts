
// ─── Log Levels ───────────────────────────────────────────────────────────────
// error: 0, warn: 1, info: 2, http: 3, debug: 4
// Setting level to 'debug' shows ALL levels

import { format } from "node:path";
import winston from "winston";
import { env } from "./env";
import DailyRotateFile from "winston-daily-rotate-file";

// Setting level to 'error' shows ONLY errors
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

// ─── Log Colors (development only) ───────────────────────────────────────────
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white'
}
// ─── Log Colors (development only) ───────────────────────────────────────────
winston.addColors(colors);

// ─── Format ───────────────────────────────────────────────────────────────────
// Development: colored, readable format
// Production: JSON format for log aggregation tools
const developmentFormat = winston.format.combine(
    winston.format.timestamp({format: 'YYYY-MM-DD  HH:mm:ss' }),
    winston.format.colorize({all:true}),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level} ${info.message}`
    )
);
const productionFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({stack: true}), // include stack traces
    winston.format.json()   //structured json
)
// ─── Transports ───────────────────────────────────────────────────────────────
// Transport = where logs are sent
// Console transport — always active
const consoleTransport = new winston.transports.Console({
    format: env.IS_PRODUCTION ? productionFormat : developmentFormat,
});


// File transport — errors only
// New file every day, keep 30 days of logs
const errorFileTransport = new DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxFiles: '30d',   // keep 30 days
    maxSize: '20m',  // max 20MB per file
    format: productionFormat,
})

// File transport — all logs
const combinedFileTransport = new DailyRotateFile({
    filename: 'logs/combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d',
    maxSize: '20m',
    format: productionFormat,
});

// ─── Logger Instance ──────────────────────────────────────────────────────────
export const logger = winston.createLogger({
    level: env.IS_PRODUCTION ? 'http' : 'debug',
    levels,
    transports: [
        consoleTransport,
        errorFileTransport,
        combinedFileTransport
    ],
     // Don't crash on unhandled errors in logger itself
     exitOnError: false,
});
export const morganStream = {
    write: (message: string) => {
        logger.http(message.trim());
    }
}