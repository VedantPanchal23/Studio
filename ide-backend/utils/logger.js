const winston = require('winston');
const path = require('path');
const config = require('../config');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define which transports the logger must use
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  })
];

// Add file transport if enabled
if (config.logging.file.enabled) {
  // Ensure logs directory exists
  const fs = require('fs');
  const logsDir = path.dirname(config.logging.file.filename);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  transports.push(
    new winston.transports.File({
      filename: config.logging.file.filename,
      maxsize: config.logging.file.maxsize,
      maxFiles: config.logging.file.maxFiles,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: config.logging.level,
  levels,
  format,
  transports,
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.Console(),
    ...(config.logging.file.enabled ? [
      new winston.transports.File({ 
        filename: path.join(path.dirname(config.logging.file.filename), 'exceptions.log') 
      })
    ] : [])
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.Console(),
    ...(config.logging.file.enabled ? [
      new winston.transports.File({ 
        filename: path.join(path.dirname(config.logging.file.filename), 'rejections.log') 
      })
    ] : [])
  ]
});

// Create a stream object for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

module.exports = logger;