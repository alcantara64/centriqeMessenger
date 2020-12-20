import { Document, Model } from "mongoose";
import { MessageChannel, MessageType } from "../message/message.types";


export enum MessageEventStatus {
  PROCESSED = "processed",
  FAILED = "failed",
  PENDING = "pending",
  PROCESSING = "processing"
}


export type MessageEventTypes = TransactionalMessageEvent | TemplateScheduledMessageEvent | TemplateInteractiveMessageEvent

export interface MessageEvent {
  date: Date;
  messageType: MessageType;
  status?: MessageEventStatus;
  statusMessage?: string;
  processStartDt?: Date;
  processEndDt?: Date;
  createdBy?: string;
  modifiedBy?: string;
}

export interface MessageEventDocument extends MessageEvent, Document { }
export interface MessageEventModel extends Model<MessageEventDocument> { }


export interface TransactionalMessageEvent extends MessageEvent {
  readonly messageType: MessageType.TRANSACTIONAL;
  payload: TransactionalPayload;
}

export interface TransactionalMessageEventDocument extends TransactionalMessageEvent, Document { }
export interface TransactionalMessageEventModel extends Model<TransactionalMessageEventDocument> { }


export type TransactionalPayload = TransactionalEmailPayload | TransactionalSmsPayload | TransactionalWhatsAppPayload;

export interface TransactionalEmailPayload {
  readonly channel: MessageChannel.EMAIL,
  from?: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  tags: Array<string>;
}

export interface TransactionalSmsPayload {
  readonly channel: MessageChannel.SMS,
  from?: string;
  to: string;
  text: string;
  tags: Array<string>;
}

export interface TransactionalWhatsAppPayload {
  readonly channel: MessageChannel.WHATSAPP,
  from?: string;
  to: string;
  text: string;
  tags: Array<string>;
}


export interface TemplateScheduledMessageEvent extends MessageEvent {
  readonly messageType: MessageType.TEMPLATE_SCHEDULED;
  campaign: string;
  holdingOrg?: string;
  memberOrg?: string;
}
export interface TemplateScheduledMessageEventDocument extends TemplateScheduledMessageEvent, Document { }
export interface TemplateScheduledMessageEventModel extends Model<TemplateScheduledMessageEventDocument> { }


export interface TemplateInteractiveMessageEvent extends MessageEvent {
  readonly messageType: MessageType.TEMPLATE_INTERACTIVE;
  template: string;
  channel?: MessageChannel;
  customers: Array<string>,
  manualOverride?: {
    emailTo?: string,
    whatsAppTo?: string,
    smsTo?: string
  }
}
export interface TemplateInteractiveMessageEventDocument extends TemplateInteractiveMessageEvent, Document { }
export interface TemplateInteractiveMessageEventModel extends Model<TemplateInteractiveMessageEventDocument> { }
