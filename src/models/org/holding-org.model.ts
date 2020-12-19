import mongoose from 'mongoose';
import { DEFAULT_MODEL_OPTIONS, codeSchema, isUnique, emailSchema, statusSchema } from '../../lib/mongoose.util';
import BusinessVertical from '../../enums/BusinessVertical';
import enumUtil from '../../lib/enum.util';
import validator from 'validator';


const dataDomainSchema = new mongoose.Schema({
  holdingOrgLevel: {
    type: Boolean,
    required: true
  },
  memberOrgLevel: {
    type: Boolean,
    required: true
  }
},
  { _id: false });

const businessVerticalArray = enumUtil.toArray(BusinessVertical)
const holdingOrgSchema = new mongoose.Schema(
  {
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
    country: String,
    fax: String,
    tollFreeNumber: String,
    email: emailSchema(),
    websiteAddress: String,
    dataDomainConfig: {
      //attribute name changes/ adjustments also need to be reflected in enum DataDomain.ts
      customer: { type: dataDomainSchema, required: true },
      product: { type: dataDomainSchema, required: true },
      revenue: { type: dataDomainSchema, required: true },
      cost: { type: dataDomainSchema, required: true },
      communication: { type: dataDomainSchema, required: true },
      response: { type: dataDomainSchema, required: true },
      nps: { type: dataDomainSchema, required: true },
      profitEdge: { type: dataDomainSchema, required: true },
      marketPlace: { type: dataDomainSchema, required: true }
    },
    defaultEmailSender: emailSchema({ emailValidation: { allowDisplayName: true } }),
    defaultWhatsAppSender: { type: String },
    defaultSmsSender: { type: String },
    logoUrl: {
      type: String,
      validate:
      {
        validator: (v: any) => {
          let isValid = false;
          isValid = v ? validator.isURL(v) : v === null || v === ''
          return isValid;
        },
        message: (props: any) => `${props.value} is not a valid Logo URL`,
        type: 'format'
      }
    },
    bussinessVertical: {
      type: [String],
      enum: businessVerticalArray,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: statusSchema()
  },
  DEFAULT_MODEL_OPTIONS
);


function codeSchemaInternal(): any {
  return codeSchema({
    isUnique: isUniqueCode
  });
}

async function isUniqueCode(doc: any, code: any): Promise<boolean> {
  return await isUnique(HoldingOrgModel, doc, {
    code: code
  });
}

const HoldingOrgModel = mongoose.model('HoldingOrg', holdingOrgSchema);
export default HoldingOrgModel
