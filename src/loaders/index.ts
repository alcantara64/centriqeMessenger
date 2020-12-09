
import logger from './logger-loader';
import mongooseLoader from './database.loader';

export default async () => {

  await mongooseLoader();
  logger.info('loaders.index::MongoDB initialized');

}
