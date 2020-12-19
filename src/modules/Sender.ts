import logger from '../lib/logger';
import { sendEmail } from "../lib/mailgun.util";
import { sendInteractiveSmsMessage, sendInteractiveWhatsAppMessage, sendScheduledSmsMessage, sendScheduledWhatsAppMessage, sendSmsMessage, sendWhatsAppMessage } from "../lib/twilio.util";
import { CampaignDocument } from '../models/message/campaign.types';
import MessageEventModel from "../models/message/message-event.model";
import { MessageEventDocument, MessageEventStatus, TemplateInteractiveMessageEventDocument, TemplateScheduledMessageEventDocument, TransactionalMessageEventDocument } from '../models/message/message-event.types';
import { MessageTemplateDocument } from '../models/message/message-template.types';
import { MessageChannel, MessageType, TransactionalMessageProvider } from '../models/message/message.types';
import CustomerModel from "../models/org/customer.model";
import { CustomerDocument } from '../models/org/customer.types';
import { sendInteractiveEmail, sendScheduledEmail } from './../lib/mailgun.util';




const LOGGER_STR = "modules.Sender";

export async function sender() {

  //1 - all pending, sorted by oldest first,
  //2 - findOneAndUpdate(set status in progess); do 3x by messagetype. 1) transationcal, 2) interactive, 3) scheduled


  /** First priority is to get all pending transactional events */
  let messageEvents: MessageEventDocument[] = await MessageEventModel.find({
    date: { $lte: new Date() },
    status: MessageEventStatus.PENDING,
    messageType: MessageType.TRANSACTIONAL
  }).populate('content.payload.customers');

  //process


  /** Second priority is to get all pending interactive events */
  messageEvents = await MessageEventModel.find({
    date: { $lte: new Date() },
    status: MessageEventStatus.PENDING,
    messageType: MessageType.TEMPLATE_INTERACTIVE
  }).populate('content.payload.customers template template.holdingOrg template.memberOrg customers');

  //process
  /** Third priority is to get all pending scheduled events */
  messageEvents = await MessageEventModel.find({
    date: { $lte: new Date() },
    status: MessageEventStatus.PENDING,
    messageType: MessageType.TEMPLATE_SCHEDULED
  }).populate('content.payload.customers');

}




export async function processTransactionalEvent(messageEvent: TransactionalMessageEventDocument) {
  logger.info(`${LOGGER_STR}:processTransactionalEvent::MessageEvent ${messageEvent._id}`);

  let status = MessageEventStatus.PENDING;

  switch (messageEvent.payload.channel) {
    case MessageChannel.EMAIL: {
      const { from, to, cc, body, bcc, subject } = messageEvent.payload

      const provider: TransactionalMessageProvider = {
        messageType: MessageType.TRANSACTIONAL
      }
      await sendEmail({ from, to, cc, body, bcc, subject, channel: MessageChannel.EMAIL, provider, messageEvent: messageEvent._id });
      break;
    }

    case MessageChannel.SMS: {
      const { from, to, text } = messageEvent.payload

      const provider: TransactionalMessageProvider = {
        messageType: MessageType.TRANSACTIONAL
      }
      await sendSmsMessage({ from, to, text, channel: MessageChannel.SMS, provider, messageEvent: messageEvent._id });
      break;
    }

    case MessageChannel.WHATSAPP: {
      const { from, to, text } = messageEvent.payload

      const provider: TransactionalMessageProvider = {
        messageType: MessageType.TRANSACTIONAL
      }
      await sendWhatsAppMessage({ from, to, text, channel: MessageChannel.WHATSAPP, provider, messageEvent: messageEvent._id });
      break;
    }
  }
}


export async function processInteractiveEvent(messageEvent: TemplateInteractiveMessageEventDocument) {
  logger.info(`${LOGGER_STR}:processInteractiveEvent::MessageEvent ${messageEvent._id}`);

  const customers = <Array<CustomerDocument>><unknown>messageEvent.customers;
  let status = MessageEventStatus.PENDING;

  for (let customer of customers) {
    const channel = messageEvent.channel ? messageEvent.channel : customer.prefMsgChannel;
    const template = <MessageTemplateDocument><unknown>messageEvent.template;
    const { _id } = messageEvent;

    switch (channel) {

      case MessageChannel.EMAIL: {
        await sendInteractiveEmail(template, _id, [customer]);
        break;
      }

      case MessageChannel.SMS: {
        await sendInteractiveSmsMessage(template, _id, [customer]);
        break;
      }

      case MessageChannel.WHATSAPP: {
        await sendInteractiveWhatsAppMessage(template, _id, [customer]);
        break;
      }
    }
  }
}



export async function processScheduledEvent(messageEvent: TemplateScheduledMessageEventDocument) {
  const campaign = <CampaignDocument><unknown>messageEvent.campaign;

  const query = JSON.parse(campaign.filterQuery)
  const customers = await CustomerModel.find(query);
  for (let customer of customers) {
    const channel = customer.prefMsgChannel ? customer.prefMsgChannel : MessageChannel.EMAIL;
    const template = <MessageTemplateDocument><unknown>campaign.template;
    const messageEventId = messageEvent._id;
    const campaignId = campaign._id;

    switch (channel) {

      case MessageChannel.EMAIL: {
        await sendScheduledEmail(template, messageEventId, campaignId, [customer]);
        break;
      }

      case MessageChannel.SMS: {
        await sendScheduledSmsMessage(template, messageEventId, campaignId, [customer]);
        break;
      }

      case MessageChannel.WHATSAPP: {
        await sendScheduledWhatsAppMessage(template, messageEventId, campaignId, [customer]);
        break;
      }
    }
  }
}
