import { Document, Model } from "mongoose";
import ModelStatus from "../../enums/ModelStatus";
import { MessageChannel } from "../message/message.types";

export interface Customer {
  holdingOrg?: string;
  memberOrg?: string;
  code: string;
  title: string;
  indCorp: string;

  firstName?: string,
  lastName?: string,
  middleName?: string;
  fullName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  homePhone: string;
  cellPhone: string;
  email: string;
  prefMsgChannel: MessageChannel;
  nationality: string;
  gender: 'male' | 'female' | 'custom' | '',
  birthdate: Date;
  birthdateNoYear: string;
  anniversaryDate: Date,
  anniversaryDateNoYear: string;
  nationalId: string;
  corpId: string;
  memberNo: string;
  memberType: string;
  memberPoints: number;
  field_01: string;
  field_02: string;
  field_03: string;
  field_04: string;
  field_05: string;
  field_06: string;
  field_07: string;
  field_08: string;
  field_09: string;
  field_10: string;

  regDate: Date;
  regDateNoYear: string;

  pastCustomer: 'Yes' | 'No' | '';
  currency: string;
  totalRevenue: { type: Number },
  totalVisits: number;
  totalServices: number;

  lastVisit: Date;
  lastVisitNoYear: string;

  recencyScore: number;
  frequencyScore: number;
  monetaryScore: number;
  cbsScore: number;
  custSegment: number;
  custSegmentDetails: string;

  status: ModelStatus;

  createdBy?: string;
  modifiedBy?: string;
}
export interface CustomerDocument extends Customer, Document { }
export interface CustomerModel extends Model<CustomerDocument> { }
