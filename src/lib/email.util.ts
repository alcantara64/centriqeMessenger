import logger from '../loaders/logger-loader';
import _ from 'lodash';
import EmailModel from '../modules/email/EmailModel'
import Mailgun from 'mailgun-js';
import config from '../loaders/config.loaders';
import MessageType from '../enums/MessageType';
import MessageProviderType from '../enums/MessageProviderType';


export default {
  sendTransactionalEmail,
  sendEmail
}


export type EmailDataProviderInfo = {
  emailTemplateId: string;
  customerId: string;
  rawSubject: string;
  rawBody: string;
  rawFooter: string;
}

export type EmailData = {
  from?: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;

  messageType: MessageType;
  providerType: MessageProviderType;
  providerInfo?: EmailDataProviderInfo;
};

export async function sendEmail(data: EmailData) {
  //https://www.mailgun.com/blog/how-to-send-transactional-email-in-a-nodejs-app-using-the-mailgun-api/
  let email: any = null;
  let result = null;

  try {
    logger.info(`lib.email:sendEmail::Sending new email from ${data.from} - to ${data.to} - cc ${data.cc} - bcc ${data.bcc}`);

    email = new EmailModel(data);
    email.usedDefaultSender = false;
    if (_.isEmpty(email.from)) {
      const defaultSender = config.messaging.email.defaultSender;
      logger.debug(`lib.email:sendEmail::From address not set, using default sender ${defaultSender}`)
      email.from = defaultSender;
      email.usedDefaultSender = true;
    }
    email.senderDomain = getEmailDomain(email.from);
    email.status = 'pending';
    email.testMode = isEmailTestMode()
    email.populateProviderInfo(data.providerType, data.providerInfo);
    const validationErrors = email.validateDataAndGenerateErrorObject();

    if (validationErrors.length > 0) {
      //do not even try to send the email
      logger.error(`lib.email:sendEmail::There have been validation errors. The email will not be sent. See fieldValidationErrors in the database.`, validationErrors);
      email.status = 'error';
      email.statusMessage = `Fields not populated correctly. See fieldValidationErrors.`
      email = await email.save();

    } else {
      //send email

      //only pick attributes that are valid for mailgun.
      //if optional property is not set (e.g. 'cc"), mailgun expects the property to be missing entirely
      let tmpMessageData = _.omitBy(_.pick(email, ['from', 'to', 'cc', 'bcc', 'subject', 'body']), _.isEmpty);
      tmpMessageData['html'] = tmpMessageData.body;
      delete tmpMessageData['body'];

      let messageData: Mailgun.messages.SendData = <Mailgun.messages.SendData>tmpMessageData;

      if (!_.isEmpty(email.tags)) {
        messageData["o:tag"] = email.tags
      }

      if (isEmailTestMode()) {
        logger.debug(`lib.email:sendEmail::Sending email in test mode.`);
        messageData["o:testmode"] = "true";
      }

      email.externalData = {};
      email.externalData.send = messageData

      if (config.messaging.email.enabled === true) {
        logger.debug(`lib.email:sendEmail::Email sending is enabled.`);


        const mailgun = new Mailgun({ apiKey: config.messaging.email.mailgun.apiKey, domain: email.senderDomain });
        result = await mailgun.messages().send(messageData);

        email.status = 'sent';
        email.externalMessageId = result.id;
        email.externalData.result = result
      } else {
        logger.info(`lib.email:sendEmail::Email sending is disabled.`);

        result = { "id": "", "message": "Email sending is disabled." }
        email.status = 'disabled';
        //not setting email.externalResult here because there is no external result
      }

    }

    return result;

  } catch (error) {
    logger.error(`lib.email:sendEmail::Error -- ${error.message}`);
    email.statusMessage = error.message
    email.status = 'error'

    throw error;

  } finally {
    if (email) {
      logger.debug(`lib.email:sendEmail::Saving email in db.`)

      try {
        await email.save();
      } catch (error) {
        logger.error(`lib.email:sendEmail::Email could not be saved in the database`, error)
        //not throwing exception at this point. If there was one, it was already thrown.
      }

    }

  }
}


export function getEmailDomain(email: string) {
  let domain = null;
  if (email) {
    try {
      const regex = '(?<domain>(?<=@)[^ |^>]*)'
      const regexResult = email.match(regex);
      if (regexResult !== null && regexResult.groups) {
        domain = regexResult.groups.domain;
      } else {
        throw new Error("Domain not extracted.");
      }

    } catch (error) {
      logger.error(`lib.email:getEmailDomain(email)::Domain could not be extracted from email ${email}`)
      domain = null;
    }

  }
  return domain;
}


const isEmailTestMode = () => {
  return config.messaging.email.mailgun.testMode;
}


export type TransactionalEmailData = {
  from?: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
}
export async function sendTransactionalEmail(data: TransactionalEmailData) {
  return await sendEmail({
    body: data.body,
    messageType: MessageType.TRANSACTIONAL,
    providerType: MessageProviderType.NONE,
    subject: data.subject,
    to: data.to,
    bcc: data.bcc,
    cc: data.cc,
    from: data.from,
  });
}
