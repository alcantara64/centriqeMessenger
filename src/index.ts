/** 2020-12-10 FK - Disabling express for now */

import { DateTime } from 'luxon';
import cron from 'node-cron';
import config from './lib/config';
import logger from './lib/logger';
import loader from './loaders';
import { sender } from './modules/Sender';

(async () => {
  await loader();
  const { cronSchedule, infoOutput } = config.process
  const { templateInteractive, templateScheduled, transactional } = config.process.eventType

  logger.info(`index::Starting with event type processing - transactional ${transactional} - interactive ${templateInteractive} - scheduled ${templateScheduled}`);

  const processedCronSchedule = randomizeCronSeconds(cronSchedule)
  logger.info(`index::Using cron schedule ${processedCronSchedule} - original schedule ${cronSchedule}`);

  let lastReportDate = DateTime.local();

  logger.info(`index::Starting scheduler now.`);
  cron.schedule(processedCronSchedule, async () => {
    if (lastReportDate.diffNow('minutes').minutes <= -infoOutput) {
      logger.info(`index::I am still alive. Reporting back in ${infoOutput} minutes.`);
      lastReportDate = DateTime.local();
    } else {
      logger.debug('index::Starting process round');
    }

    await sender()
  });
})()




/**
 * Generates random seconds. See README.md
 * @param cronSchedule
 */
function randomizeCronSeconds(cronSchedule: string) {
  const scheduleItems = cronSchedule.split(' ');

  if (scheduleItems.length === 6) {
    //seconds is optional, length is 6 means seconds has been specified
    //the first item are the seconds
    const scheduleItem = scheduleItems[0];

    if (scheduleItem.startsWith('[') && scheduleItem.endsWith(']')) {
      const count = Number(scheduleItem.slice(1, scheduleItem.length - 1));

      const resultArray: number[] = []
      for (let i = 0; i < count; i++) {
        let seconds = Math.floor(Math.random() * (60)); //random number between 0 and 59

        const idxCollisionLoop = 0;
        while (resultArray.includes(seconds) && idxCollisionLoop <= 60) {
          //It can happen that the same number is generated. Then will try to pick the next available
          seconds = (seconds + 1) % 60 //generates number between 0 and 59
        }

        if (!resultArray.includes(seconds)) {
          resultArray.push(seconds);
        }
      }
      scheduleItems[0] = resultArray.sort().join(',')
    }
  }

  return scheduleItems.join(' ')
}

