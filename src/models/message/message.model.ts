import mongoose from 'mongoose';
import DataDomainConfig from '../../enums/DataDomainConfig';
import enumUtil from '../../lib/enum.util';
import { MessageChannel, MessageDocument, MessageType, MessageStatus } from './message.types';
import { validateDataAndGenerateErrorObject } from "./message.methods";

const messageStatusArray = enumUtil.toArray(MessageStatus);



const MessageProvider = new mongoose.Schema({},
  { discriminatorKey: 'messageType', _id: false });

const MessageSchema: any = new mongoose.Schema(
  {
    messageEvent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MessageEvent'
    },
    provider: MessageProvider,
    status: {
      type: String,
      required: true,
      enum: messageStatusArray,
    },
    statusMessage: { type: String },
  },
  {
    timestamps: true,
    discriminatorKey: 'channel'
  }
);

MessageSchema.methods.validateDataAndGenerateErrorObject = validateDataAndGenerateErrorObject;
const MessageModel = mongoose.model<MessageDocument>('Message', MessageSchema);



/****************** message data - start ************************/

const MailgunEmailEventSchema = new mongoose.Schema(
  {
    eventId: { type: String },
    timestamp: { type: Date },
    event: { type: String },
  },
  {
    _id: true
  }
);
const MailgunEmailDataSchema = new mongoose.Schema(
  {
    messageId: { type: String },
    testMode: { type: Boolean, required: true },
    apiResult: { type: String },
    events: [MailgunEmailEventSchema]
  },
  {
    _id: false
  }
);
const EmailMessageSchema = new mongoose.Schema(
  {
    messageId: { type: String },
    senderDomain: { type: String },
    from: { type: String },
    to: { type: String },
    cc: { type: String },
    bcc: { type: String },
    subject: { type: String },
    body: { type: String },

    tags: { type: [String] },
    externalData: MailgunEmailDataSchema
  }
);
MessageModel.discriminator(MessageChannel.EMAIL, EmailMessageSchema);



const TwilioSmsEventSchema = new mongoose.Schema(
  {
    eventId: { type: String },
    timestamp: { type: Date },
    event: { type: String },
  },
  {
    _id: true
  }
);
const TwilioSmsDataSchema = new mongoose.Schema(
  {
    errorCode: { type: Number },
    errorMessage: { type: String },
    events: [TwilioSmsEventSchema]
  },
  {
    _id: false
  }
);

const SmsDataSchema = new mongoose.Schema(
  {
    messageId: { type: String },
    from: { type: String },
    to: { type: String },
    text: { type: String },

    tags: { type: [String] },
    externalData: TwilioSmsDataSchema
  }
);
MessageModel.discriminator(MessageChannel.SMS, SmsDataSchema);




const TwilioWhatsAppEventSchema = new mongoose.Schema(
  {
    eventId: { type: String },
    timestamp: { type: Date },
    event: { type: String },
  },
  {
    _id: true
  }
);
const TwilioWhatsAppDataSchema = new mongoose.Schema(
  {
    errorCode: { type: Number },
    errorMessage: { type: String },
    events: [TwilioWhatsAppEventSchema]
  },
  {
    _id: false
  }
);

const WhatsAppMessageSchema = new mongoose.Schema(
  {
    messageId: { type: String },
    from: { type: String },
    to: { type: String },
    text: { type: String },

    tags: { type: [String] },
    externalData: TwilioWhatsAppDataSchema
  },
  {
    _id: false
  }
);
MessageModel.discriminator(MessageChannel.WHATSAPP, WhatsAppMessageSchema);

/****************** message data - end ************************/







/****************** message provider - start ************************/
const docProvider: any = MessageSchema.path('provider');
const TemplateScheduledProviderSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign'
    },

    dataDomain: {
      type: String,
      enum: DataDomainConfig.getAsEnumArray(),
      required: true
    },

    messageTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MessageTemplate'
    },

    holdingOrg: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HoldingOrg'
    },

    memberOrg: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MemberOrg'
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    customerCode: {
      type: String,
      required: true
    }
  },
  { _id: false }
);
docProvider.discriminator(MessageType.TEMPLATE_SCHEDULED, TemplateScheduledProviderSchema);



const TemplateInteractiveProviderSchema = new mongoose.Schema(
  {
    dataDomain: {
      type: String,
      enum: DataDomainConfig.getAsEnumArray(),
      required: true
    },

    messageTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MessageTemplate'
    },

    manualOverride: {
      active: { type: Boolean, required: true },
      originalTo: { type: String }
    },

    holdingOrg: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HoldingOrg'
    },

    memberOrg: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MemberOrg'
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },

    customerCode: {
      type: String,
      required: true
    }
  },
  { _id: false }
);
docProvider.discriminator(MessageType.TEMPLATE_INTERACTIVE, TemplateInteractiveProviderSchema);



const TransactionalProviderSchema = new mongoose.Schema(
  {}, { _id: false }
);
docProvider.discriminator(MessageType.TRANSACTIONAL, TransactionalProviderSchema);
/****************** message provider - end ************************/



export default MessageModel;
