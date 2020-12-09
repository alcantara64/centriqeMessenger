import mongoose from 'mongoose';
import { DEFAULT_MODEL_OPTIONS, codeSchema, isUnique, statusSchema } from '../../lib/mongoose.util';

const emailTemplateSchema = new mongoose.Schema(
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
      type: 'string',
    },
    subject: {
      type: 'string',
    },
    body: {
      type: 'string',
    },
    templateData: {
      type: 'string',
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
  return await isUnique(EmailTemplateModel, doc, {
    code: code,
    memberOrg: doc.memberOrg,
    holdingOrg: doc.holdingOrg
  });
}

emailTemplateSchema.index({ code: 1, memberOrgId: 1, holdingOrg: 1 }, { unique: true });
const EmailTemplateModel = mongoose.model('EmailTemplate', emailTemplateSchema);

export default EmailTemplateModel;
