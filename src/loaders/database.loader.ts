import mongoose from 'mongoose'
import config from './config.loaders';
import logger from './logger-loader';

export default async (): Promise<any> => {

  const connection = await mongoose.connect(config.mongoDb.url,
    {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify:false})
      .then(() => logger.info(`startup.db::connected to ${config.mongoDb.urlNoPw}`))
      .catch((err)=>{logger.error(err.message)});

  return connection;
}
