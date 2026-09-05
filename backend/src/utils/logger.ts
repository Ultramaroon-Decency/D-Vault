import winston from 'winston';
import { env } from '../config/env';

const { combine, timestamp, colorize, printf, json, errors } = winston.format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
  }),
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: false }), // never log stack traces in prod
  json(),
);

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    // Uncomment to write to files:
    // new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
  // Prevent unhandled error propagation
  exitOnError: false,
});

// Log unhandled errors without exposing secrets
export const logAuthFailure = (msg: string, wallet?: string) => {
  logger.warn('AUTH_FAILURE', { message: msg, wallet });
};

export const logAuthorizationFailure = (msg: string, wallet?: string, role?: string) => {
  logger.warn('AUTHZ_FAILURE', { message: msg, wallet, role });
};

export const logBlockchainError = (msg: string, extra?: object) => {
  logger.error('BLOCKCHAIN_ERROR', { message: msg, ...extra });
};

export const logIndexerError = (msg: string, extra?: object) => {
  logger.error('INDEXER_ERROR', { message: msg, ...extra });
};
