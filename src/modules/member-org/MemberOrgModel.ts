
import mongoose from 'mongoose';
import { DEFAULT_MODEL_OPTIONS, codeSchema, isUnique, statusSchema, emailSchema } from '../../lib/mongoose.util';


const memberOrgSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 50,
  },
  code: codeSchemaInternal(),
  addressLine1: String,
  addressLine2: String,
  zipCode: String,
  city: String,
  state: String,
  phone: String,
  mobile: String,
  country: String,
  fax: String,
  tollFreeNumber: String,
  email: String,
  websiteAddress: String,
  defaultEmailSender: emailSchema({emailValidation: {allowDisplayName: true}}),
  status: statusSchema(),
  profitEdge: {
    type: Number,
    enum: [0, 1],
    default: 0,
  },
  responseAI: {
    type: Number,
    enum: [0, 1],
    default: 0,
  },
  askBuddy: {
    type: Number,
    enum: [0, 1],
    default: 0,  //marketPlAI
  },
  communicationAI: {
    type: Number,
    enum: [0, 1],
    default: 0,
  },
  marketPlAI: {
    type: Number,
    enum: [0, 1],
    default: 0,
  },
  holdingOrg: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HoldingOrg',
    required: true
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
  DEFAULT_MODEL_OPTIONS
);

function codeSchemaInternal(): any {
  return codeSchema({
    isUnique: isUniqueCode
  });
}

async function isUniqueCode(doc: any, code: any): Promise<boolean> {
  return await isUnique(MemberOrgModel, doc, {
    code: code,
    holdingOrg: doc.holdingOrg
  });
}

memberOrgSchema.index({ code: 1, holdingOrg: 1 }, { unique: true });

const MemberOrgModel = mongoose.model("MemberOrg", memberOrgSchema);
export default MemberOrgModel;
