import dotenv from 'dotenv';

// Set the NODE_ENV to 'development' by default
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// config() will read the .env file, parse the contents, assign it to process.env.
const envFound = dotenv.config();
if (envFound.error) {
  // This error should crash whole process
  throw new Error("⚠  Couldn't find .env file  ⚠");
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
    port: process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT, 10) : 5000,
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
      enabled: !!process.env.EMAIL_ENABLED,
      defaultSender: process.env.EMAIL_DEFAULT_SENDER ? process.env.EMAIL_DEFAULT_SENDER : "",
      mailgun: {
        apiKey: process.env.EMAIL_MAILGUN_API_KEY ? process.env.EMAIL_MAILGUN_API_KEY : "",
        testMode: !!process.env.EMAIL_MAILGUN_TEST_MODE
      }
    },
    whatsApp:{
      defaultWhatsAppSender: process.env.WHATSAPP_DEFAULT_SENDER? process.env.WHATSAPP_DEFAULT_SENDER : "+2348140103867",
      enabled: !!process.env.WHATSAPP_ENABLED,
    },
    sms:{
      enabled: !!process.env.SMS_ENABLED,
      defaultSMSSender: process.env.SMS_DEFAULT_SENDER? process.env.SMS_DEFAULT_SENDER : "+2348140103867",
    },
    twillio:{
      accountSID: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      testMode : !! process.env.TWILIO_ACCOUNT_TEST_MODE
    }
  }
}
