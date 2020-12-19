import mongoose from 'mongoose';
import DataDomainConfig from '../../enums/DataDomainConfig';
import { codeSchema, DEFAULT_MODEL_OPTIONS, isUnique, statusSchema } from '../../lib/mongoose.util';
import { MessageTemplateDocument } from './message-template.types';

const whatsAppSchema = new mongoose.Schema(
  {
    text: { type: String }
  },
  { _id: false }
);

const smsSchema = new mongoose.Schema(
  {
    text: { type: String }
  },
  { _id: false }
);

const emailSchema = new mongoose.Schema(
  {
    subject: { type: String, },
    body: { type: String, },
    templateData: { type: String, }
  },
  { _id: false }
);


const messageTemplateSchema = new mongoose.Schema(
  {
    code: codeSchemaInternal(),
    name: {
      type: String,
    },
    holdingOrg: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HoldingOrg',
      default: null
    },
    memberOrg: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MemberOrg',
      default: null
    },
    description: {
      type: String,
    },
    dataDomain: {
      type: String,
      enum: DataDomainConfig.getAsEnumArray(),
      required: true
    },

    channel: {
      email: { type: emailSchema },
      whatsApp: { type: whatsAppSchema },
      sms: { type: smsSchema }
    },
    status: statusSchema(),
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



function codeSchemaInternal(): any {
  return codeSchema({
    isUnique: isUniqueCode
  });
}

async function isUniqueCode(doc: any, code: any): Promise<boolean> {
  return await isUnique(MessageTemplateModel, doc, {
    code: code,
    memberOrg: doc.memberOrg,
    holdingOrg: doc.holdingOrg
  });
}

messageTemplateSchema.index({ code: 1, memberOrg: 1, holdingOrg: 1 }, { unique: true });
const MessageTemplateModel = mongoose.model<MessageTemplateDocument>('MessageTemplate', messageTemplateSchema);

export default MessageTemplateModel;
