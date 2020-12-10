import mongoose from 'mongoose'
import config from '../lib/config';
import logger from '../lib/logger';

export default async (): Promise<any> => {

  logger.info(`startup.db::Connecting to ${config.mongoDb.urlNoPw}`);

  const connection = await mongoose.connect(config.mongoDb.url,
    {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify:false, useCreateIndex: true})
      .then(() => logger.info(`startup.db::Connection to database established successfully.`))
      .catch((err)=>{logger.error(err.message)});

  return connection;
}
