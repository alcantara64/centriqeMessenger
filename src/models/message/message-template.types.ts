import { Document, Model } from "mongoose";
import DataDomain from "../../enums/DataDomain";
import ModelStatus from "../../enums/ModelStatus";


export interface MessageTemplate {
  code: string;
  name: string;
  holdingOrg?: string;
  memberOrg?: string;
  description: string;
  dataDomain: DataDomain;
  channel: {
    email?: EmailTemplate;
    sms?: SmsTemplate
    whatsApp: WhatsAppTemplate;
  },
  status?: ModelStatus;
  createdBy?: string
  modifiedBy?: string
}

export interface MessageTemplateDocument extends MessageTemplate, Document { }
export interface MessageTemplateModel extends Model<MessageTemplateDocument> { }

export type MessageTemplateData = EmailTemplate | SmsTemplate | WhatsAppTemplate

export interface EmailTemplate {
  subject: string;
  body: string;
  templateData: string;
}

export interface SmsTemplate {
  text: string;
}

export interface WhatsAppTemplate {
  text: string;
}
