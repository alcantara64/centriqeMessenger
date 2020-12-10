import logger from '../lib/logger';
import mongooseLoader from './mongoose.loader';

export default async () => {

  await mongooseLoader();
  logger.info('loaders.index::MongoDB initialized');

}
