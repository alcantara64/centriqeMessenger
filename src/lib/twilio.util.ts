import _ from 'lodash';
import config from '../lib/config';
import logger from '../lib/logger';
import { buildSmsTextFromCustomerTemplate } from '../lib/message.util';
import { MessageTemplateDocument } from '../models/message/message-template.types';
import { MessageChannel, MessageType, SmsMessage, TemplateInteractiveMessageProvider, TemplateScheduledMessageProvider, WhatsAppMessage } from '../models/message/message.types';
import { CustomerDocument } from '../models/org/customer.types';
import SmsSender from '../modules/sender/SmsSender';



const smsSender = new SmsSender();
const whatsAppSender = new SmsSender();

export async function sendSmsMessage(message: SmsMessage) {
  await smsSender.sendMessage(message);
}

export async function sendWhatsAppMessage(message: WhatsAppMessage) {
  await whatsAppSender.sendMessage(message);
}




export async function sendInteractiveSmsMessage(template: MessageTemplateDocument, messageEventId: string, customers: CustomerDocument[]) {
  return await sendInteractiveMessage(MessageChannel.SMS, template, messageEventId, customers);
}


export async function sendInteractiveWhatsAppMessage(template: MessageTemplateDocument, messageEventId: string, customers: CustomerDocument[]) {
  return await sendInteractiveMessage(MessageChannel.WHATSAPP, template, messageEventId, customers);
}

export async function sendInteractiveMessage(channel: MessageChannel, template: MessageTemplateDocument, messageEventId: string, customers: CustomerDocument[]) {

  if (template && customers.length > 0) {


    const { defaultWhatsAppSender, defaultSmsSender } = <any>template.memberOrg || <any>template.holdingOrg;
    let from: string
    switch (channel) {
      case MessageChannel.SMS: {
        from = defaultSmsSender ? defaultSmsSender : config.messaging.sms.defaultSender;
        break;
      }

      case MessageChannel.WHATSAPP: {
        from = defaultWhatsAppSender ? defaultWhatsAppSender : config.messaging.whatsApp.defaultSender;
        break;
      }

      default: {
        const errorMsg = `Channel not supported ${channel}`;
        logger.error(`lib.twilio:sendInteractiveMessage::${errorMsg}`);
        throw new Error(errorMsg);
      }
    }

    const templateResults = buildSmsTextFromCustomerTemplate(template, customers);
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

      const message = {
        channel: channel,
        messageEvent: messageEventId,
        text: templateResult.textData.compiledTemplate,
        to: templateResult.customer.cellPhone,
        from,
        provider
      };

      if (channel === MessageChannel.WHATSAPP) {
        whatsAppSender.sendMessage(message)
      } else {
        smsSender.sendMessage(message)
      }
    }

  }

}






export async function sendScheduledSmsMessage(template: MessageTemplateDocument, messageEventId: string, campaignId: string, customers: CustomerDocument[]) {
  return await sendScheduledMessage(MessageChannel.SMS, template, messageEventId, campaignId, customers);
}


export async function sendScheduledWhatsAppMessage(template: MessageTemplateDocument, messageEventId: string, campaignId: string, customers: CustomerDocument[]) {
  return await sendScheduledMessage(MessageChannel.WHATSAPP, template, messageEventId, campaignId, customers);
}

export async function sendScheduledMessage(channel: MessageChannel, template: MessageTemplateDocument, messageEventId: string, campaignId: string, customers: CustomerDocument[]) {

  if (template && customers.length > 0) {

    const { defaultWhatsAppSender, defaultSmsSender } = <any>template.memberOrg || <any>template.holdingOrg;
    let from: string
    switch (channel) {
      case MessageChannel.SMS: {
        from = defaultSmsSender ? defaultSmsSender : config.messaging.sms.defaultSender;
        break;
      }

      case MessageChannel.WHATSAPP: {
        from = defaultWhatsAppSender ? defaultWhatsAppSender : config.messaging.whatsApp.defaultSender;
        break;
      }

      default: {
        const errorMsg = `Channel not supported ${channel}`;
        logger.error(`lib.twilio:sendInteractiveMessage::${errorMsg}`);
        throw new Error(errorMsg);
      }
    }

    const templateResults = buildSmsTextFromCustomerTemplate(template, customers);
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

      const message = {
        channel: channel,
        messageEvent: messageEventId,
        text: templateResult.textData.compiledTemplate,
        to: templateResult.customer.cellPhone,
        from,
        provider
      };

      if (channel === MessageChannel.WHATSAPP) {
        await whatsAppSender.sendMessage(message)
      } else {
        await smsSender.sendMessage(message)
      }
    }

  }

}
