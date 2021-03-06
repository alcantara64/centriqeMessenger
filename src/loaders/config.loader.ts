import dotenv from 'dotenv';

// Set the NODE_ENV to 'development' by default
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// config() will read the .env file, parse the contents, assign it to process.env.
const envFound = dotenv.config();
if (envFound.error) {
  // This error should crash whole process
  console.log("loaders.config::No .env file loaded. Using environment variables only.");
} else {
  console.log("loaders.config::Using .env file.");
}


const getMongoDbUrl = function (includePassword: boolean) {
  //for example mongodb://admin:12ayden@158.101.105.96:27017/admin?authSource=admin

  let credentials = ''
  if (process.env.MONGODB_USER) {
    let password = includePassword ? process.env.MONGODB_PW : '********';
    credentials = `${process.env.MONGODB_USER}:${password}@`
  }


  let mongoDbUrl = `mongodb://${credentials}${process.env.MONGODB_SERVERS}/${process.env.MONGODB_DATABASE}`
  if (process.env.MONGODB_OPTIONS) {
    mongoDbUrl += `?${process.env.MONGODB_OPTIONS}`
  }

  return mongoDbUrl;
}

const MONGO_DB_URL = getMongoDbUrl(true)
const MONGO_DB_URL_NOPW = getMongoDbUrl(false);



export default {
  nodeEnv: process.env.NODE_ENV,
  server: {
    port: process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT, 10) : 5000
  },
  process: {
    cronSchedule: process.env.PROCESS_CRON_SCHEDULE ? process.env.PROCESS_CRON_SCHEDULE : '* * * * * *',
    infoOutput: process.env.INFO_OUTPOUT_MINUTES ? Number(process.env.INFO_OUTPOUT_MINUTES) : 5,
    eventType: {
      transactional: process.env.PROCESS_EVENT_TYPE_TRANSACTIONAL === "true",
      templateInteractive: process.env.PROCESS_EVENT_TYPE_TEMPLATE_INTERACTIVE === "true",
      templateScheduled: process.env.PROCESS_EVENT_TYPE_TEMPLATE_SCHEDULED === "true",
    }
  },
  logging: {
    level: process.env.LOG_LEVEL || 'silly',
  },
  mongoDb: {
    url: MONGO_DB_URL,
    urlNoPw: MONGO_DB_URL_NOPW
  },
  messaging: {
    email: {
      enabled: "true" === process.env.EMAIL_ENABLED,
      defaultSender: process.env.EMAIL_DEFAULT_SENDER ? process.env.EMAIL_DEFAULT_SENDER : "",
      mailgun: {
        apiKey: process.env.EMAIL_MAILGUN_API_KEY ? process.env.EMAIL_MAILGUN_API_KEY : "",
        testMode: "false" !== process.env.EMAIL_MAILGUN_TEST_MODE
      }
    },
    whatsApp: {
      enabled: "true" === process.env.WHATSAPP_ENABLED,
      defaultSender: process.env.WHATSAPP_DEFAULT_SENDER ? process.env.WHATSAPP_DEFAULT_SENDER : "",
    },
    sms: {
      enabled: "true" === process.env.SMS_ENABLED,
      defaultSender: process.env.SMS_DEFAULT_SENDER ? process.env.SMS_DEFAULT_SENDER : "",
    },
    twillio: {
      accountSID: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      testMode: "false" !== process.env.TWILIO_ACCOUNT_TEST_MODE
    }
  }
}
