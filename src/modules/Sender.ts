import { sendInteractiveEmail, sendScheduledMail } from './../lib/email.util';
import MessageEventStatus from "../enums/MessageEventStatus"
import MessageType from "../enums/MessageType";
import MessageEventModel, { MessageEventTypes } from "./message-event/MessageEventModel";
import MessageChannel from "../enums/MessageChannel";
import { sendTransactionalEmail } from "../lib/email.util";
import { sendInteractiveMessage, sendMessage } from "../lib/sms-whatsapp.util";
import CustomerModel from "./customer/CustomerModel";
import CampaignModel from './campaign/CampaignModel';
import MemberOrgModel from './member-org/MemberOrgModel';
import HoldingOrgModel from './holding-org/HoldingOrgModel';
import logger from '../lib/logger';
MemberOrgModel.exists({ _id: { $exists: true } });
HoldingOrgModel.exists({ _id: { $exists: true } });

const LOGGER_STR = "modules.Sender";

export const sender = async () => {

  const messageEvents: Array<MessageEventTypes> = await MessageEventModel.find({
    date: { $lte: new Date() },
    status: MessageEventStatus.PENDING,
  }).populate('content.payload.customers') as any;

  logger.info(`${LOGGER_STR}:sender::Number of events found: ${messageEvents.length}`);
  if (messageEvents.length > 0) {
    for (const messageEvent of messageEvents) {

      const { channel } = messageEvent.content.payload;
      let status = MessageEventStatus.PENDING;

      try {
        let messengerStatus = null;
        if (messageEvent.content.messageType === MessageType.TRANSACTIONAL) {
          const { from, to, cc, body, bcc, subject, text } = messageEvent.content.payload;
          switch (channel) {
            case MessageChannel.EMAIL:
              messengerStatus = await sendTransactionalEmail({ from, to, cc, body, bcc, subject });
              break;
            case MessageChannel.SMS:
            case MessageChannel.WHATSAPP:
              messengerStatus = await sendMessage({ body: text, from, to }, channel === MessageChannel.WHATSAPP);
              break;
            default:
              messengerStatus = null
          }
          if (!messengerStatus) {
            status = MessageEventStatus.FAILED
          } else {
            status = MessageEventStatus.PROCESSED
          }
        }
        else if (messageEvent.content.messageType === MessageType.TEMPLATE_INTERACTIVE) {
          const { customers, template } = messageEvent.content.payload

          switch (channel) {
            case MessageChannel.EMAIL:
              messengerStatus = await sendInteractiveEmail(template, customers);
              break;
            case MessageChannel.SMS:
            case MessageChannel.WHATSAPP:
              messengerStatus = await sendInteractiveMessage(template, customers, channel);
              break;
            default:
              logger.error(`${LOGGER_STR}:sender::No channel information.`, (<any>messageEvent).toJSON());
              messengerStatus = null;
          }
          if (!messengerStatus) {
            status = MessageEventStatus.FAILED;
          } else {
            status = MessageEventStatus.PROCESSED;
          }

        }
        else if (messageEvent.content.messageType === MessageType.TEMPLATE_SCHEDULED) {
          const campaign: any = await CampaignModel.findOne({ _id: messageEvent.content.payload.campaign });
          if (campaign && campaign.filterQuery && campaign.template) {
            const query = JSON.parse(campaign.filterQuery)
            const customers: [] = await CustomerModel.find(query) as any;
            logger.debug(`${LOGGER_STR}:sender::Template Scheduled customers ==>`, customers.length, campaign.channel);
            if (campaign.channel === MessageChannel.EMAIL) {
              const mailCustomers = customers.filter((customer: any) => customer.prefMsgChannel === MessageChannel.EMAIL)
              await sendScheduledMail(campaign.template, mailCustomers);
            }
            if (campaign.channel === MessageChannel.WHATSAPP) {
              const whatsAppCustomers = customers.filter((customer: any) => customer.prefMsgChannel === MessageChannel.SMS)
              await sendInteractiveMessage(campaign.template, whatsAppCustomers, MessageChannel.WHATSAPP)
            }
            if (campaign.channel === MessageChannel.SMS) {
              const smsCustomers = customers.filter((customer: any) => customer.prefMsgChannel === MessageChannel.SMS);
              await sendInteractiveMessage(campaign.template, smsCustomers, MessageChannel.SMS)
            }

          }
          status = MessageEventStatus.PROCESSED;
        }
        else {
          logger.error(`${LOGGER_STR}:sender::Unkown message type ${messageEvent.content.messageType} - ${messageEvent._id}`)
        }

      } catch (error) {
        status = MessageEventStatus.FAILED;
        logger.error(`${LOGGER_STR}:sender::Error :- ${error.message}`)
      }
      finally {
        logger.info(`${LOGGER_STR}:sender::saving status to db :- ${messageEvent._id}`)
        await MessageEventModel.findByIdAndUpdate(messageEvent._id, { status })
      }

    }
  } else {
    logger.debug(`${LOGGER_STR}:Nothing to process`)
  }

}
