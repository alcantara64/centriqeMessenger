import winston from 'winston';
import 'winston-daily-rotate-file'
import 'winston-mongodb'
import config from '../lib/config'

const { combine, splat, timestamp, printf, colorize } = winston.format;

//import config from '../lib/config'
const logDir = './logs/';


const myFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] : ${message}`
  if (metadata.stack) {
    msg += ` -- ${metadata.stack}`
  }
  else if (JSON.stringify(metadata) !== JSON.stringify({})) {
    msg += ' -- ' + JSON.stringify(metadata)
  }
  return msg
});


const consoleTransport = new winston.transports.Console({
  format: combine(
    colorize(),
    splat(),
    timestamp(),
    myFormat
  ),
  handleExceptions: true,
  //handleRejections: true,
  level: config.logging.level
});

let logConfiguration = null;

if (process.env.NODE_ENV === 'production') {
  console.log("middleware.logger::setting up logging with production settings")
  //const DB_URL = config.mongoDb.url

  logConfiguration = {
    format: combine(
      splat(),
      timestamp(),
      myFormat
    ),
    transports: [
      consoleTransport,
      new winston.transports.DailyRotateFile(
        {
          filename: `${logDir}/logfile-%DATE%.log`,
          handleExceptions: true,
          //handleRejections: true,
          maxFiles: '30d',
          utc: true,
          level: config.logging.level
        }),
      //      new winston.transports.MongoDB({db: DB_URL, handleExceptions: true, handleRejections: true}),
    ],
    exceptionHandlers: [
      new winston.transports.DailyRotateFile(
        {
          filename: `${logDir}/uncaughtExceptions-%DATE%.log`,
          maxFiles: '30d',
          utc: true,
          level: config.logging.level
        }
      ),
    ],
    //    rejectionHandlers: [
    //      new winston.transports.DailyRotateFile({filename: `${logDir}/rejections-%DATE%.log`,
    //                                              maxFiles: '30d',
    //                                              utc: true}),
    //    ]
  };


} else {
  console.log("middleware.logger::setting up logging with development settings")

  logConfiguration = {
    format: combine(
      splat(),
      timestamp(),
      myFormat
    ),
    transports: [
      consoleTransport,
      new winston.transports.DailyRotateFile({
        filename: `${logDir}/logfile-%DATE%.log`,
        handleExceptions: true,
        //handleRejections: true,
        maxFiles: '1d',
        utc: false,
        level: config.logging.level
      }),
    ],
    exceptionHandlers: [
      new winston.transports.DailyRotateFile({
        filename: `${logDir}/uncaughtExceptions-%DATE%.log`,
        maxFiles: '1d',
        utc: false,
        level: config.logging.level
      }),
    ],
    //    rejectionHandlers: [
    //      new winston.transports.DailyRotateFile({filename: `${logDir}/rejections-%DATE%.log`,
    //                                              maxFiles: '1d',
    //                                              utc: false}),
    //    ]
  };

}
const logger = winston.createLogger(logConfiguration);
export default logger;

