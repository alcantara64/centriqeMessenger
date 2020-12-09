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
import logger from '../loaders/logger-loader';
MemberOrgModel.exists({_id:{$exists:true}});
HoldingOrgModel.exists({_id:{$exists:true}});
export const sender = async () =>{ 

const messageEvents:Array<MessageEventTypes> = await MessageEventModel.find({
    date:{$lte:new Date()},
    status:MessageEventStatus.PENDING,
  }).populate('content.payload.customer') as any;
  if(messageEvents.length > 0){
    for (const messageEvent of messageEvents){
      let { channel } = messageEvent.content.payload;
      let status = MessageEventStatus.PENDING;
     try{
     
      let messengerStatus = null; 
      if(messageEvent.content.messageType === MessageType.TRANSACTIONAL){
        const {from, to, cc, body, bcc, subject, text} = messageEvent.content.payload ;
      switch(channel){
        case MessageChannel.EMAIL:
          messengerStatus = await sendTransactionalEmail({from, to, cc, body, bcc, subject});
         break;
        case MessageChannel.SMS:
        case MessageChannel.WHATSAPP:
          messengerStatus =  await sendMessage({body:text,from, to},channel === MessageChannel.WHATSAPP);
        break;
        default:
          messengerStatus = null
      }
     if(!messengerStatus){ 
     status =  MessageEventStatus.PROCESSED
     }else{
      status = MessageEventStatus.FAILED
     }
    }
    if(messageEvent.content.messageType === MessageType.TEMPLATE_INTERACTIVE){
        const {customer,template} = messageEvent.content.payload
      
        switch(channel){
          case MessageChannel.EMAIL:
            messengerStatus =    await sendInteractiveEmail(template,customer);
            break;
          case MessageChannel.SMS:
          case MessageChannel.WHATSAPP:
            messengerStatus =  await sendInteractiveMessage(template,customer,channel);
           break;
           default:
            messengerStatus = null
        }
        if(!messengerStatus){ 
          status =  MessageEventStatus.PROCESSED
          }else{
           status = MessageEventStatus.FAILED
          }
     
      }

      if(messageEvent.content.messageType === MessageType.TEMPLATE_SCHEDULED){
        const campaign :any = await CampaignModel.findOne({_id: messageEvent.content.payload.campaign});
        if(campaign && campaign.filterQuery && campaign.template){
          const query = JSON.parse(campaign.filterQuery)
          const customers:[] = await CustomerModel.find(query) as any;
          console.log('customers ==>',customers.length, campaign.channel);
        if(campaign.channel === MessageChannel.EMAIL){
          const mailCustomers = customers.filter((customer:any) => customer.prefMsgChannel === MessageChannel.EMAIL)
          await sendScheduledMail(campaign.template, mailCustomers);
        }
        if(campaign.channel === MessageChannel.WHATSAPP){
          const whatsAppCustomers = customers.filter((customer:any) => customer.prefMsgChannel ===MessageChannel.SMS)
          sendInteractiveMessage(campaign.template,whatsAppCustomers,MessageChannel.WHATSAPP)
        }
        if(campaign.channel === MessageChannel.SMS){
          const smsCustomers = customers.filter((customer:any) => customer.prefMsgChannel ===MessageChannel.SMS);
          sendInteractiveMessage(campaign.template,smsCustomers,MessageChannel.SMS)
        }
         
        }
       
      }
       status = MessageEventStatus.PROCESSED;
    }catch(error){
      status = MessageEventStatus.FAILED;
      logger.error(`sender::Error :- ${error.message}`)
    }
    finally{
      logger.info(`sender::saving status to db :- ${messageEvent._id}`)
      await MessageEventModel.findByIdAndUpdate(messageEvent._id,{status})
    }

    }
  }else{
    logger.info(`Nothing to process`)
  }

}