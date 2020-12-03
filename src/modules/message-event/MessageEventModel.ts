import mongoose from 'mongoose';
import MessageType from '../../enums/MessageType';
import MessageProviderType from '../../enums/MessageProviderType';
import MessageChannel from '../../enums/MessageChannel';
import MessageEventStatus from '../../enums/MessageEventStatus';
import enumUtil from '../../lib/enum.util';
import { DEFAULT_MODEL_OPTIONS } from '../../lib/mongoose.util';

const messageEventStatusArray = enumUtil.toArray(MessageEventStatus);



const messageContentSchema = new mongoose.Schema({},
  { discriminatorKey: 'messageType', _id: false });

const messageEventSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: messageEventStatusArray,
      required: true
    },

    content: messageContentSchema,


    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  DEFAULT_MODEL_OPTIONS
);


const docContent: any = messageEventSchema.path('content');



const transactionalPayloadSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
},
  { discriminatorKey: 'channel', _id: false });


const transactionalMessage = new mongoose.Schema({
  payload: transactionalPayloadSchema

}, { _id: false });
docContent.discriminator(MessageType.TRANSACTIONAL, transactionalMessage);


const docTransactionalPayload: any = transactionalMessage.path('payload');
const transactionalEmailMessage = new mongoose.Schema({
  cc: { type: String },
  bcc: { type: String },

  subject: { type: String, required: true },
  body: { type: String, required: true },

  tags: { type: [String] },

}, { _id: false });
docTransactionalPayload.discriminator(MessageChannel.EMAIL, transactionalEmailMessage);


const transactionalWhatsAppMessage = new mongoose.Schema({
  text: { type: String, required: true }
  //what about image?
}, { _id: false });
docTransactionalPayload.discriminator(MessageChannel.WHATSAPP, transactionalWhatsAppMessage);

const transactionalSmsMessage = new mongoose.Schema({
  text: { type: String, required: true }
  //what about image?
}, { _id: false });
docTransactionalPayload.discriminator(MessageChannel.SMS, transactionalSmsMessage);




const templateScheduledPayload = new mongoose.Schema({},
  { discriminatorKey: 'providerType', _id: false });



const templateScheduledMessage = new mongoose.Schema({
  payload: templateScheduledPayload

}, { _id: false });
docContent.discriminator(MessageType.TEMPLATE_SCHEDULED, templateScheduledMessage);


const docTemplateScheduledPayload: any = templateScheduledMessage.path('payload');

const commCampaignTemplate = new mongoose.Schema({
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
}, { _id: false });
docTemplateScheduledPayload.discriminator(MessageProviderType.COMM_CAMPAIGN, commCampaignTemplate);






const templateInteractivePayload = new mongoose.Schema({
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailTemplate',
    required: true
  },
  customer: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  }],
},
  { _id: false });



const templateInteractiveMessage = new mongoose.Schema({
  payload: templateInteractivePayload

}, { _id: false });
docContent.discriminator(MessageType.TEMPLATE_INTERACTIVE, templateInteractiveMessage);





const MessageEventModel = mongoose.model('MessageEvent', messageEventSchema);

export default MessageEventModel;


export type MessageEventTypes = {
  date: Date,
  status: MessageEventStatus,
  content: Content
}

 type Content = {
  messageType: any,
  payload: TransactionalPayload & InteractivePayload & ScheduledPayload,
}
 type InteractivePayload = {
  customer: string,
  template: any,
}
 interface TransactionalPayload {
  tags: any,
  channel: MessageChannel
  from:string,
  to:string,
  cc:string,
  bcc:string,
  subject:string,
  body:string,
}
export type ScheduledPayload = {
  providerType:string
  campaign:any
}

