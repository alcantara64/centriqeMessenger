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
import config from '../lib/config';




const LOGGER_STR = "modules.Sender";

export async function sender() {

  /** First priority is to get all pending transactional events */
  if(config.process.eventType.transactional) {
    logger.debug(`${LOGGER_STR}:sender::Checking for transactional events`);
    let messageEvents: MessageEventDocument[] = await MessageEventModel.find({
      date: { $lte: new Date() },
      status: MessageEventStatus.PENDING,
      messageType: MessageType.TRANSACTIONAL
    }).limit(10);

    //process
    await processEvents(messageEvents, processTransactionalEvent);
  }



  /** Second priority is to get all pending interactive events */
  if(config.process.eventType.templateInteractive) {
    logger.debug(`${LOGGER_STR}:sender::Checking for template interactive events`);
    let messageEvents = await MessageEventModel.find({
      date: { $lte: new Date() },
      status: MessageEventStatus.PENDING,
      messageType: MessageType.TEMPLATE_INTERACTIVE
    }).populate('customers template')
      .populate({
        path: 'template',
        populate: { path: 'holdingOrg memberOrg' }
      })
      .limit(5);

    //process
    await processEvents(messageEvents, processInteractiveEvent);
  }



  /** Third priority is to get all pending scheduled events */
  if(config.process.eventType.templateScheduled) {
    logger.debug(`${LOGGER_STR}:sender::Checking for template scheduled events`);
    let messageEvents = await MessageEventModel.find({
      date: { $lte: new Date() },
      status: MessageEventStatus.PENDING,
      messageType: MessageType.TEMPLATE_SCHEDULED
    }).populate('campaign')
      .populate({
        path: 'campaign',
        populate: { path: 'holdingOrg memberOrg template' }
      })
      .limit(2);

    //process
    await processEvents(messageEvents, processScheduledEvent);
  }
}


export async function processEvents(messageEvents: MessageEventDocument[], processFn: Function) {
  for (let messageEvent of messageEvents) {

    const messageEventCheck = await MessageEventModel.findOneAndUpdate(
      {
        _id: messageEvent._id,
        status: MessageEventStatus.PENDING
      },
      {
        status: MessageEventStatus.PROCESSING,
        processStartDt: new Date()
      },
      { new: true }
    ).lean();


    if (!messageEventCheck) {
      //this means the message event was already processed by someone else
      logger.debug(`${LOGGER_STR}:sender:processEvents::Message event already processed ${messageEvent._id}`)
      continue;
    }

    messageEvent.status = MessageEventStatus.PROCESSED
    try {
      await processFn(messageEvent);
    }
    catch (error) {
      logger.error(`${LOGGER_STR}:sender:processEvents::Error while processing message event ${messageEvent._id} -- ${error.message}`);
      messageEvent.statusMessage = error.message
      messageEvent.status = MessageEventStatus.FAILED
    }
    finally {
      logger.debug(`${LOGGER_STR}:sender:processEvents::Updating message event status in db. event ${messageEvent._id}`)
      messageEvent.processEndDt = new Date();
      try {
        await messageEvent.save();
      } catch (error) {
        logger.error(`${LOGGER_STR}:sender:processEvents::Message event status could not be updated in the database ${messageEvent._id}`, error)
        //not throwing exception at this point. If there was one, it was already thrown.
      }
    }
  }
}



export async function processTransactionalEvent(messageEvent: TransactionalMessageEventDocument) {
  logger.debug(`${LOGGER_STR}:sender:processTransactionalEvent::MessageEvent ${messageEvent._id}`);


  switch (messageEvent.payload.channel) {
    case MessageChannel.EMAIL: {
      const { to, cc, body, bcc, subject } = messageEvent.payload
      let { from } = messageEvent.payload
      from = from ? from : config.messaging.email.defaultSender;

      const provider: TransactionalMessageProvider = {
        messageType: MessageType.TRANSACTIONAL
      }
      await sendEmail({ from, to, cc, body, bcc, subject, channel: MessageChannel.EMAIL, provider, messageEvent: messageEvent._id });
      break;
    }

    case MessageChannel.SMS: {
      const { to, text } = messageEvent.payload
      let { from } = messageEvent.payload
      from = from ? from : config.messaging.sms.defaultSender;

      const provider: TransactionalMessageProvider = {
        messageType: MessageType.TRANSACTIONAL
      }
      await sendSmsMessage({ from, to, text, channel: MessageChannel.SMS, provider, messageEvent: messageEvent._id });
      break;
    }

    case MessageChannel.WHATSAPP: {
      const { to, text } = messageEvent.payload
      let { from } = messageEvent.payload
      from = from ? from : config.messaging.whatsApp.defaultSender;

      const provider: TransactionalMessageProvider = {
        messageType: MessageType.TRANSACTIONAL
      }
      await sendWhatsAppMessage({ from, to, text, channel: MessageChannel.WHATSAPP, provider, messageEvent: messageEvent._id });
      break;
    }
  }
}


export async function processInteractiveEvent(messageEvent: TemplateInteractiveMessageEventDocument) {
  logger.debug(`${LOGGER_STR}:sender:processInteractiveEvent::MessageEvent ${messageEvent._id}`);

  const customers = <Array<CustomerDocument>><unknown>messageEvent.customers;

  for (let customer of customers) {
    const channel = messageEvent.channel ? messageEvent.channel : customer.prefMsgChannel;
    const template = <MessageTemplateDocument><unknown>messageEvent.template;

    switch (channel) {

      case MessageChannel.EMAIL: {
        await sendInteractiveEmail(template, messageEvent, [customer]);
        break;
      }

      case MessageChannel.SMS: {
        await sendInteractiveSmsMessage(template, messageEvent, [customer]);
        break;
      }

      case MessageChannel.WHATSAPP: {
        await sendInteractiveWhatsAppMessage(template, messageEvent, [customer]);
        break;
      }
    }
  }
}



export async function processScheduledEvent(messageEvent: TemplateScheduledMessageEventDocument) {
  logger.debug(`${LOGGER_STR}:sender:processScheduledEvent::MessageEvent ${messageEvent._id}`);
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
