import Twilio from 'twilio';
import MessageChannel from '../enums/MessageChannel';
import MessageProviderType from '../enums/MessageProviderType';
import MessageType from '../enums/MessageType';
import config from '../lib/config';
import logger from '../lib/logger';
import MessageTemplateModel from '../modules/message-template/MessageTemplateModel';
import SmsWhatsAppModel from '../modules/sms-whatsApp/SmsWhatsappModel';
import { compileTemplate, extractPlaceholders } from './text-template.util';
import _, { String } from 'lodash';

export type SMSDataProviderInfo = {
  emailTemplateId: string;
  customerId: string;
}

export type SmsWhatsAppData = {
  from?: string;
  to: string;
  text: string;

  messageType: MessageType;
  providerType: MessageProviderType;
  providerInfo?: SMSDataProviderInfo;
};
type SmsData = {
  body: string,
  from: string,
  to: string
}


const twilioClient = Twilio(config.messaging.twillio.accountSID, config.messaging.twillio.authToken);

export const sendMessage = async ({ body, from, to }: SmsData, isWhatsApp = false) => {
  // TODO verify is a valid phone number;
  let sender = from;
  let receiver = to;
  if (isWhatsApp) {
    sender = `whatsapp:${from}`;
    receiver = `whatsapp:${to}`;
  }

  return await twilioClient.messages.create({
    body,
    from: sender,
    to: receiver,
  })
}

export const sendInteractiveMessage = async (templateId: string, customers: any[], channel: MessageChannel) => {
  const template = await MessageTemplateModel.findOne({ _id: templateId })
    .populate('memberOrg')
    .populate('holdingOrg') as any;

  if (template && customers.length > 0) {
    const { defaultWhatsAppSender, defaultSmsSender } = template.memberOrg || template.holdingOrg;
    const from = channel === MessageChannel.SMS ? defaultSmsSender : defaultWhatsAppSender;
    const messages = buildSmsDataFromCustomerTemplate(MessageType.TEMPLATE_INTERACTIVE, from, template, customers, channel);
    if (messages.length) {
      for (const message of messages) {
        await sendSMSMessage(message, channel === MessageChannel.WHATSAPP);
      }
    }
  }

}

export function buildSmsDataFromCustomerTemplate(messageType: MessageType, from: string | null, template: any, customers: any[], _channel: MessageChannel): SmsWhatsAppData[] {
  const list: Array<SmsWhatsAppData> = [];

  const { channel } = template;
  let text = '';
  if (_channel === MessageChannel.SMS) {
    text = channel.sms.text;
  } else {
    text = channel.whatsApp.text;
  }

  const textPlaceholders = extractPlaceholders(text);

  for (const customer of customers) {
    const textTemplateData = compileTemplate(text, customer, textPlaceholders);


    const smsData: SmsWhatsAppData = {
      to: customer.cellPhone,
      text: textTemplateData.compiledTemplate,
      messageType: messageType,
      providerType: MessageProviderType.COMM_CAMPAIGN,
      providerInfo: {
        emailTemplateId: template._id,
        customerId: customer._id,
      }
    }
    if (from !== null) {
      smsData.from = from;
    }

    list.push(smsData);
  }

  return list;
}

export async function sendSMSMessage(data: SmsWhatsAppData, isWhatsApp = false) {

  let smsWhatsApp: any = null;
  let result = null;

  try {
    logger.info(`lib.sms-whatsapp:sendSMSMessage::Sending new ${isWhatsApp ? 'WhatsApp ' : 'SMS '} message from ${data.from} - to ${data.to}`);

    smsWhatsApp = new SmsWhatsAppModel(data);
    smsWhatsApp.usedDefaultSender = false;
    if (_.isEmpty(smsWhatsApp.from)) {
      const defaultSender = isWhatsApp ? config.messaging.whatsApp.defaultSender : config.messaging.sms.defaultSender;
      logger.debug(`lib.sms-whatsapp:sendSMSMessage::From address not set, using default sender ${defaultSender}`)
      smsWhatsApp.from = defaultSender;
      smsWhatsApp.usedDefaultSender = true;
    }

    smsWhatsApp.status = 'pending';
    smsWhatsApp.testMode = isSmsTestMode();
    smsWhatsApp.channel = isWhatsApp ? MessageChannel.WHATSAPP : MessageChannel.SMS
    smsWhatsApp.populateProviderInfo(data.providerType, data.providerInfo);
    const validationErrors = smsWhatsApp.validateDataAndGenerateErrorObject();

    if (validationErrors.length > 0) {
      //do not even try to send the message
      logger.error(`lib.sms-whatsapp:sendSMSMessage::There have been validation errors. The message will not be sent. See fieldValidationErrors in the database.`, validationErrors);
      smsWhatsApp.status = 'error';
      smsWhatsApp.statusMessage = `Fields not populated correctly. See fieldValidationErrors.`
      smsWhatsApp = await smsWhatsApp.save();

    } else {
      //send sms

      if ((config.messaging.whatsApp.enabled === true && isWhatsApp) || (config.messaging.whatsApp.enabled && !isWhatsApp)) {
        logger.debug(`lib.sms-whatsapp:sendSMSMessage::Message sending is enabled.`);


        result = await sendMessage({ to: data.to, from: smsWhatsApp.from, body: data.text }, isWhatsApp)

        smsWhatsApp.status = 'sent';
      } else {
        logger.info(`lib.sms-whatsapp:sendSMSMessage::Message sending is disabled.`);

        result = { "id": "", "message": "Message sending is disabled." }
        smsWhatsApp.status = 'disabled';
        //not setting email.externalResult here because there is no external result
      }

    }

    return result;

  } catch (error) {
    logger.error(`lib.sms-whatsapp:sendSMSMessage::Error -- ${error.message}`);
    smsWhatsApp.statusMessage = error.message
    smsWhatsApp.status = 'error'
  } finally {
    if (smsWhatsApp) {
      logger.debug(`lib.sms-whatsapp:sendSMSMessage::Saving message in db.`)

      try {
        await smsWhatsApp.save();
      } catch (error) {
        logger.error(`lib.sms-whatsapp:sendSMSMessage::SMS could not be saved in the database`, error)
        //not throwing exception at this point. If there was one, it was already thrown.
      }

    }

  }
}
const isSmsTestMode = () => {
  return config.messaging.twillio.testMode;
}



