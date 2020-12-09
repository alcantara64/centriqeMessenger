import _ from 'lodash';
import mongoose from 'mongoose';
import validator from 'validator';
import MessageType from '../../enums/MessageType';
import MessageProviderType from '../../enums/MessageProviderType';
import MessageChannel from '../../enums/MessageChannel';
import enumUtil from '../../lib/enum.util';
import { EmailDataProviderInfo } from '../../lib/email.util';

const messageTypeArray = enumUtil.toArray(MessageType);
const messageProviderTypeArray = enumUtil.toArray(MessageProviderType);
const providerInfoSchema = new mongoose.Schema({},
    { discriminatorKey: 'providerType', _id: false });

const smsWhatsappModelSchema: any = new mongoose.Schema({
  holdingOrg: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HoldingOrg',
    default:null,
  },

  memberOrg: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MemberOrg',
    default:null,
  },


  messageType: {
    type: String,
    enum: messageTypeArray,
  },
  providerInfo: providerInfoSchema,
  channel:{
  type:String,
  required:true,
  enum:[MessageChannel.SMS, MessageChannel.WHATSAPP],
  default:MessageChannel.SMS,
  },
  from: { type: String },
  to: { type: String },
  text: { type: String },
  usedDefaultSender: { type: Boolean, required: true },
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
    timestamps: true
  });


const SmsWhatsAppModel = mongoose.model('SmsWhatsApp', smsWhatsappModelSchema);


export default SmsWhatsAppModel;
SmsWhatsAppModel.prototype.validateDataAndGenerateErrorObject = function () {

    this.fieldValidationErrors = [];
    if (_.isEmpty(this.from)) {
      this.fieldValidationErrors.push({ "field": "from", "message": `Field must not be empty.` })
    }
    else if (!validator.isMobilePhone(this.from)) {
      this.fieldValidationErrors.push({ "field": "from", "message": `Field needs to contain a valid email address - ${this.from}` })
    }
  
  
    if (_.isEmpty(this.to)) {
      this.fieldValidationErrors.push({ "field": "to", "message": `Field must not be empty.` })
    }
    else if (!validator.isMobilePhone(this.to)) {
      this.fieldValidationErrors.push({ "field": "to", "message": `Field needs to contain a valid phone number - ${this.to}` })
    }  

    if (_.isEmpty(this.text)) {
      this.fieldValidationErrors.push({ "field": "text", "message": `Field cannot be empty.` })
    }
  
    return this.fieldValidationErrors;
  }
  SmsWhatsAppModel.prototype.populateProviderInfo = function (providerType: MessageProviderType, providerInfo: EmailDataProviderInfo) {
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