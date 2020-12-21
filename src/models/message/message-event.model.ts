import mongoose from 'mongoose';
import { MessageType, MessageChannel } from '../message/message.types';
import { MessageEventDocument, MessageEventStatus } from './message-event.types';
import enumUtil from '../../lib/enum.util';
import { emailSchema } from '../../lib/mongoose.util';

const messageEventStatusArray = enumUtil.toArray(MessageEventStatus);
const messageChannelArray = enumUtil.toArray(MessageChannel);



const MessageEventSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: messageEventStatusArray,
      required: true,
      default: MessageEventStatus.PENDING
    },
    processStartDt: {
      type: Date
    },
    processEndDt: {
      type: Date
    },
    statusMessage: {
      type: String
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    discriminatorKey: 'messageType'
  }
);


const MessageEventModel = mongoose.model<MessageEventDocument>('MessageEvent', MessageEventSchema);


const TransactionalPayloadSchema = new mongoose.Schema({},
  { discriminatorKey: 'channel', _id: false }
);

const TransactionalMessageEventSchema = new mongoose.Schema(
  {
    payload: TransactionalPayloadSchema
  }
)
MessageEventModel.discriminator(MessageType.TRANSACTIONAL, TransactionalMessageEventSchema);


const docTransactionalPayload: any = TransactionalMessageEventSchema.path('payload');
const TransactionalEmailMessageSchema = new mongoose.Schema(
  {
    from: emailSchema({ required: false, emailValidation: { allowDisplayName: true } }),
    to: emailSchema({ required: true }),
    cc: emailSchema(),
    bcc: emailSchema(),

    subject: { type: String, required: true },
    body: { type: String, required: true },

    tags: { type: [String] },

  },
  { _id: false }
);
docTransactionalPayload.discriminator(MessageChannel.EMAIL, TransactionalEmailMessageSchema);


const TransactionalSmsMessageSchema = new mongoose.Schema(
  {
    from: { type: String },
    to: { type: String, required: true },
    text: { type: String, required: true },
    tags: { type: [String] },
    //what about image?
  },
  { _id: false }
);
docTransactionalPayload.discriminator(MessageChannel.SMS, TransactionalSmsMessageSchema);

const TransactionalWhatsAppMessageSchema = new mongoose.Schema(
  {
    from: { type: String },
    to: { type: String, required: true },
    text: { type: String, required: true }
    //what about image?
  },
  { _id: false }
);
docTransactionalPayload.discriminator(MessageChannel.WHATSAPP, TransactionalWhatsAppMessageSchema);



const TemplateScheduledMessageEventSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CampaignVersion',
      required: true
    },
    holdingOrg: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HoldingOrg',
    },
    memberOrg: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MemberOrg',
    },
  }
)
MessageEventModel.discriminator(MessageType.TEMPLATE_SCHEDULED, TemplateScheduledMessageEventSchema);




const TemplateInteractiveMessageEventSchema = new mongoose.Schema(
  {
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MessageTemplate',
      required: true
    },
    channel: {
      type: String,
      enum: messageChannelArray
    },
    customers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    }],
    manualOverride: {
      emailTo: String,
      whatsAppTo: String,
      smsTo: String
    }
  }
);
MessageEventModel.discriminator(MessageType.TEMPLATE_INTERACTIVE, TemplateInteractiveMessageEventSchema);



export default MessageEventModel;
