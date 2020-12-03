import MessageEventStatus from "../enums/MessageEventStatus"
import MessageType from "../enums/MessageType";
import MessageEventModel, { MessageEventTypes } from "./message-event/MessageEventModel";
import MessageChannel from "../enums/MessageChannel";
import { sendTransactionalEmail } from "../lib/email.util";
import { sendMessage } from "../lib/sms-whatsapp.util";

export const sender = async () =>{
const messageEvents:any[] = await  MessageEventModel.find({
    date:{$lte:new Date(), $eq:new Date()},
    status:MessageEventStatus.PENDING
  }).populate('content.payload.campaign');

  if(messageEvents.length >0){
    messageEvents.forEach( async (messageEvent:MessageEventTypes) =>{
      if(messageEvent.content.messageType === MessageType.TRANSACTIONAL){
        const {from, to, cc, body, bcc, subject} = messageEvent.content.payload ;
      switch(messageEvent.content.payload.channel){
        case MessageChannel.EMAIL:
         await sendTransactionalEmail({from, to, cc, body, bcc, subject});
         break;
        case MessageChannel.SMS:
         await sendMessage({body,from, to});
         break;
         case MessageChannel.WHATSAPP:
          await sendMessage({body,from, to},true);
        break;
        default:
          null
      }
      if(messageEvent.content.messageType === MessageType.TEMPLATE_INTERACTIVE){
     
      }

      }
    })
  }

}