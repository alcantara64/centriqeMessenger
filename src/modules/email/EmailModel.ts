import _ from 'lodash';
import mongoose from 'mongoose';
import validator from 'validator';
import MessageType from '../../enums/MessageType';
import MessageProviderType from '../../enums/MessageProviderType';
import enumUtil from '../../lib/enum.util';
import { EmailDataProviderInfo } from '../../lib/email.util';



const providerInfoSchema = new mongoose.Schema({},
  { discriminatorKey: 'providerType', _id: false });

const messageTypeArray = enumUtil.toArray(MessageType);
const messageProviderTypeArray = enumUtil.toArray(MessageProviderType);
messageProviderTypeArray.push('');

const emailModelSchema: any = new mongoose.Schema({
  holdingOrg: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HoldingOrg'
  },

  memberOrg: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MemberOrg'
  },


  emailType: {
    type: String,
    enum: messageTypeArray,
  },
  providerInfo: providerInfoSchema,

  from: { type: String },
  to: { type: String },
  cc: { type: String },
  bcc: { type: String },

  subject: { type: String },
  body: { type: String },

  tags: { type: Array },

  usedDefaultSender: { type: Boolean, required: true },
  senderDomain: { type: String },
  externalMessageId: { type: String },
  externalData: { type: Object },
  testMode: { type: Boolean, required: true },

  status: {
    type: String,
    required: true,
    enum: ['pending', 'sent', 'error', 'disabled'],
  },

  fieldValidationErrors: { type: Object },

  statusMessage: { type: String }
},
  {
    discriminatorKey: 'emailType',
    timestamps: true
  });


const EmailModel = mongoose.model('Email', emailModelSchema);

EmailModel.prototype.validateDataAndGenerateErrorObject = function () {

  this.fieldValidationErrors = [];
  if (_.isEmpty(this.from)) {
    this.fieldValidationErrors.push({ "field": "from", "message": `Field must not be empty.` })
  }
  else if (!validator.isEmail(this.from, { allow_display_name: true })) {
    this.fieldValidationErrors.push({ "field": "from", "message": `Field needs to contain a valid email address - ${this.from}` })
  }


  if (_.isEmpty(this.to)) {
    this.fieldValidationErrors.push({ "field": "to", "message": `Field must not be empty.` })
  }
  else if (!validator.isEmail(this.to, { allow_display_name: true })) {
    this.fieldValidationErrors.push({ "field": "to", "message": `Field needs to contain a valid email address - ${this.to}` })
  }


  if (!_.isEmpty(this.cc) && !validator.isEmail(this.cc, { allow_display_name: true })) {
    this.fieldValidationErrors.push({ "field": "cc", "message": `Field needs to contain a valid email address - ${this.cc}` })
  }

  if (!_.isEmpty(this.bcc) && !validator.isEmail(this.bcc, { allow_display_name: true })) {
    this.fieldValidationErrors.push({ "field": "bcc", "message": `Field needs to contain a valid email address - ${this.bcc}` })
  }


  if (_.isEmpty(this.senderDomain)) {
    this.fieldValidationErrors.push({ "field": "senderDomain", "message": `Field must not be empty. Sender domain could not be derived from "from" address.` })
  }
  else if (!validator.isFQDN(this.senderDomain)) {
    this.fieldValidationErrors.push({ "field": "senderDomain", "message": `Derived sender domain is not a valid domain - ${this.senderDomain}` })
  }



  if (_.isEmpty(this.subject)) {
    this.fieldValidationErrors.push({ "field": "subject", "message": `Field cannot be empty.` })
  }

  if (_.isEmpty(this.body)) {
    this.fieldValidationErrors.push({ "field": "body", "message": `Field cannot be empty.` })
  }

  return this.fieldValidationErrors;
}



const docProviderInfo: any = emailModelSchema.path('providerInfo');
const templateEmailSchema = new mongoose.Schema({
  emailTemplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailTemplate'
  },

  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },

  subjectRaw: { type: String },
  bodyRaw: { type: String },
  footerRaw: { type: String }

}, { _id: false });
docProviderInfo.discriminator(MessageProviderType.COMM_CAMPAIGN, templateEmailSchema);


EmailModel.prototype.populateProviderInfo = function (providerType: MessageProviderType, providerInfo: EmailDataProviderInfo) {
  switch(providerType) {
    case MessageProviderType.COMM_CAMPAIGN: {
      this.providerInfo = {
        providerType: providerType,
        emailTemplate: providerInfo.emailTemplateId,
        customer: providerInfo.customerId,
        subjectRaw: providerInfo.rawSubject,
        bodyRaw: providerInfo.rawBody,
        footerRaw: providerInfo.rawFooter
      }
      break;
    }
    default: {}
  }
}

export default EmailModel;
