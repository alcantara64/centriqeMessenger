import mongoose from 'mongoose';
import { intSchema, stringSchema, codeSchema, isUnique, emailSchema, statusSchema } from '../../lib/mongoose.util'
import { DEFAULT_MODEL_OPTIONS } from '../../lib/mongoose.util';
import { generateDateNoYearString, addUtcIdentifierToDateString } from '../../lib/date.util';
import { MessageChannel } from '../../models/message/message.types';
import enumUtil from '../../lib/enum.util';
import { CustomerDocument } from './customer.types';


const messageChannelArray = enumUtil.toArray(MessageChannel);

const customerSchema = new mongoose.Schema({
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

  code: codeSchemaInternal(),
  title: stringSchema(),
  indCorp: {
    type: String,
    enum: ['ind', 'corp', ''],
    default: ''
  },
  firstName: stringSchema(),
  lastName: stringSchema(),
  middleName: stringSchema(),
  fullName: stringSchema(),
  addressLine1: stringSchema(),
  addressLine2: stringSchema(),
  city: stringSchema(),
  state: stringSchema(),
  zipCode: stringSchema(),
  country: stringSchema(),
  homePhone: stringSchema(),
  cellPhone: stringSchema(),
  email: emailSchemaInternal(),
  prefMsgChannel: {
    type: String,
    enum: messageChannelArray,
    default: MessageChannel.EMAIL
  },
  nationality: stringSchema(),
  gender: {
    type: String,
    enum: ['male', 'female', 'custom', ''],
    default: ''
  },

  birthdate: {
    type: Date,
    set: setBirthday
  },
  birthdateNoYear: stringSchema(),

  anniversaryDate: {
    type: Date,
    set: setAnniversaryDate
  },
  anniversaryDateNoYear: stringSchema(),


  nationalId: stringSchema(),
  corpId: stringSchema(),
  memberNo: stringSchema(),
  memberType: stringSchema(),
  memberPoints: { type: Number },
  /*mainSegment: stringSchema(), will be implemented later
  //subSegment: stringSchema(),
  //subSubSegment: stringSchema(),*/
  field_01: stringSchema(),
  field_02: stringSchema(),
  field_03: stringSchema(),
  field_04: stringSchema(),
  field_05: stringSchema(),
  field_06: stringSchema(),
  field_07: stringSchema(),
  field_08: stringSchema(),
  field_09: stringSchema(),
  field_10: stringSchema(),

  regDate: {
    type: Date,
    set: setRegDate
  },
  regDateNoYear: stringSchema(),

  pastCustomer: {
    type: String,
    enum: ['Yes', 'No', ''],
    default: ''
  },
  currency: stringSchema(),
  totalRevenue: { type: Number },
  totalVisits: intSchema(),
  totalServices: intSchema(),

  lastVisit: {
    type: Date,
    set: setLastVisit
  },
  lastVisitNoYear: stringSchema(),

  recencyScore: intSchema(),
  frequencyScore: intSchema(),
  monetaryScore: intSchema(),
  cbsScore: intSchema(),
  custSegment: intSchema(),
  custSegmentDetails: stringSchema(),

  status: statusSchema(),

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
},
  DEFAULT_MODEL_OPTIONS);


/**
 * This is needed to store always store the given date with UTC timezone. Otherwise, it will use the server's timezone and covert it to UTC in MongoDb.
 * @param $this I didnt find another way. Passing "this" into the function will allow it to update the model.
 * @param value The date's string value
 * @param attributeName Model attribute name
 */
function setDateWithoutYearAndAttachUtcInfo($this: any, value: any, attributeName: string): string {
  const date = new Date(value);
  const dateNoYear = generateDateNoYearString(date);
  $this[`${attributeName}NoYear`] = dateNoYear;

  value = addUtcIdentifierToDateString(value);

  return value;
}

function setBirthday(this: any, value: any): string {
  return setDateWithoutYearAndAttachUtcInfo(this, value, "birthdate");
}

function setAnniversaryDate(this: any, value: any): string {
  return setDateWithoutYearAndAttachUtcInfo(this, value, "anniversaryDate");
}

function setLastVisit(this: any, value: any): string {
  return setDateWithoutYearAndAttachUtcInfo(this, value, "lastVisit");
}

function setRegDate(this: any, value: any): string {
  return setDateWithoutYearAndAttachUtcInfo(this, value, "regDate");
}

function codeSchemaInternal(): any {
  return codeSchema({
    isUnique: isUniqueCode
  });
}

async function isUniqueCode(doc: any, code: any): Promise<boolean> {
  return await isUnique(CustomerModel, doc, {
    code: code,
    memberOrg: doc.memberOrg,
    holdingOrg: doc.holdingOrg
  });
}


function emailSchemaInternal(): any {
  return emailSchema({
    isUnique: isUniqueEmail
  });
}


async function isUniqueEmail(doc: any, email: any): Promise<boolean> {
  return await isUnique(CustomerModel, doc, {
    email: email,
    memberOrg: doc.memberOrg,
    holdingOrg: doc.holdingOrg
  });
}



customerSchema.index({ code: 1, memberOrg: 1, holdingOrg: 1 }, { unique: true });
customerSchema.index({ email: 1, memberOrg: 1, holdingOrg: 1 }, { unique: true });
const CustomerModel = mongoose.model<CustomerDocument>('Customer', customerSchema);

export default CustomerModel;
