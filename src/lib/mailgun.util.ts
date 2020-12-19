import logger from '../lib/logger';
import _ from 'lodash';
import Mailgun from 'mailgun-js';
import config from '../lib/config';
import { MessageType, EmailMessageDocument, EmailMessage, MessageStatus, MessageChannel, TemplateInteractiveMessageProvider, TemplateScheduledMessageProvider } from '../models/message/message.types';
import MessageModel from '../models/message/message.model';
import mongoose from 'mongoose'


import { buildEmailTextFromCustomerTemplate } from './message.util';
import MessageTemplateModel from '../models/message/message-template.model';
import { Customer, CustomerDocument } from '../models/org/customer.types';
import { MessageTemplate, MessageTemplateDocument } from '../models/message/message-template.types';



export async function sendEmail(message: EmailMessage): Promise<void> {
  //https://www.mailgun.com/blog/how-to-send-transactional-email-in-a-nodejs-app-using-the-mailgun-api/
  let email: EmailMessageDocument = <EmailMessageDocument>new MessageModel(message);
  let result: Mailgun.messages.SendResponse;

  try {
    logger.info(`lib.mailgun:sendEmail::Sending new email from ${message.from} - to ${message.to} - cc ${message.cc} - bcc ${message.bcc}`);

    email.senderDomain = getEmailDomain(email.from);
    email.status = MessageStatus.PENDING;
    email.externalData = {
      testMode: config.messaging.email.mailgun.testMode,
      events: [],
    }

    const validationErrors = email.validateDataAndGenerateErrorObject();

    if (validationErrors.length > 0) {
      //do not even try to send the email
      logger.error(`lib.email:sendEmail::There have been validation errors. The email will not be sent. See fieldValidationErrors in the database.`, validationErrors);
      email.status = MessageStatus.FAILED;
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

      if (email.externalData.testMode) {
        logger.debug(`lib.email:sendEmail::Sending email in test mode.`);
        messageData["o:testmode"] = "true";
      }

      if (config.messaging.email.enabled === true) {
        logger.debug(`lib.email:sendEmail::Email sending is enabled.`);

        if (!email.senderDomain) {
          //just to satisfy typescript error
          //senderDomain cannot be empty, because of validateDataAndGenerateErrorObject
          const errorMsg = `lib.email:sendEmail::cannot send email, sender domain is empty - messageId ${email._id}`
          logger.error(errorMsg);
          throw new Error(errorMsg)
        }

        const mailgun = new Mailgun({ apiKey: config.messaging.email.mailgun.apiKey, domain: email.senderDomain });
        result = await mailgun.messages().send(messageData);

        email.status = MessageStatus.SENT;
        email.externalData.messageId = result.id;
        email.externalData.apiResult = result.message;
      } else {
        logger.info(`lib.mailgun:sendEmail::Email sending is disabled.`);

        result = { id: "", message: "Email sending is disabled." }
        email.status = MessageStatus.DISABLED;
        //not setting email.externalResult here because there is no external result
      }

    }

  } catch (error) {
    logger.error(`lib.email:sendEmail::Error -- ${error.message}`);
    email.statusMessage = error.message
    email.status = MessageStatus.FAILED
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


export function getEmailDomain(email?: string) {
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
      logger.error(`lib.mailgun:getEmailDomain(email)::Domain could not be extracted from email ${email}`)
      domain = null;
    }

  }
  return domain;
}



export async function sendInteractiveEmail(template: MessageTemplateDocument, messageEventId: string, customers: CustomerDocument[]) {
  logger.debug(`lib.mailgun:sendInteractiveEmail::Start message event ${messageEventId}`);


  if (template && template.channel && template.channel.email && customers.length) {
    const templateResults = buildEmailTextFromCustomerTemplate(template, customers);

    const { defaultEmailSender } = <any>template.memberOrg || <any>template.holdingOrg;
    const from = defaultEmailSender ? defaultEmailSender : config.messaging.email.defaultSender;

    for (const templateResult of templateResults) {
      const provider: TemplateInteractiveMessageProvider = {
        dataDomain: template.dataDomain,
        messageTemplate: template._id,
        messageType: MessageType.TEMPLATE_INTERACTIVE,
        customer: templateResult.customer._id,
        customerCode: templateResult.customer.code,
        holdingOrg: template.holdingOrg,
        memberOrg: template.memberOrg
      }
      await sendEmail({
        body: templateResult.bodyData.compiledTemplate,
        channel: MessageChannel.EMAIL,
        messageEvent: messageEventId,
        provider,
        subject: templateResult.subjectData.compiledTemplate,
        to: templateResult.customer.email,
        from
      });
    }
  }
}



export async function sendScheduledEmail(template: MessageTemplateDocument, messageEventId: string, campaignId: string, customers: CustomerDocument[]) {
  logger.debug(`lib.mailgun:sendScheduleMail::Start`);

  if (template && template.channel && template.channel.email && customers.length) {
    const templateResults = buildEmailTextFromCustomerTemplate(template, customers);

    const { defaultEmailSender } = <any>template.memberOrg || <any>template.holdingOrg;
    const from = defaultEmailSender ? defaultEmailSender : config.messaging.email.defaultSender;

    for (const templateResult of templateResults) {
      const provider: TemplateScheduledMessageProvider = {
        campaign: campaignId,
        dataDomain: template.dataDomain,
        messageTemplate: template._id,
        messageType: MessageType.TEMPLATE_SCHEDULED,
        customer: templateResult.customer._id,
        customerCode: templateResult.customer.code,
        holdingOrg: template.holdingOrg,
        memberOrg: template.memberOrg
      }
      await sendEmail({
        body: templateResult.bodyData.compiledTemplate,
        channel: MessageChannel.EMAIL,
        messageEvent: messageEventId,
        provider,
        subject: templateResult.subjectData.compiledTemplate,
        to: templateResult.customer.email,
        from
      });
    }
  }
}
