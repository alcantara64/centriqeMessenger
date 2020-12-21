/** 2020-12-10 FK - Disabling express for now */

import logger from './lib/logger';
import loader from './loaders';
import { sender } from './modules/Sender';
import cron from 'node-cron';
import util from 'util'
import config from './lib/config'

(async () => {
  await loader();
  const { seconds, enabled } = config.process.startup.delay;
  const { cronSchedule } = config.process
  const { templateInteractive, templateScheduled, transactional } = config.process.eventType

  logger.info(`index::Starting with delay enabled ${enabled} and cron schedule ${cronSchedule}.`)
  logger.info(`index::Event type processing - transactional ${transactional} - interactive ${templateInteractive} - scheduled ${templateScheduled}`)

  if (enabled) {
    logger.info(`index::Generating random delay with max ${seconds} seconds.`)
    const randomDelaySeconds = Math.floor(Math.random() * (seconds + 1));
    logger.info(`index::Using startup delay of ${randomDelaySeconds} seconds.`)

    const sleep = util.promisify(setTimeout);
    await sleep(randomDelaySeconds * 1000);
  }

  cron.schedule(cronSchedule, async () => {
    logger.info('index::Starting process round');
    await sender()
  });
})()
