import { Document, Model } from "mongoose";
import DataDomain from "../../enums/DataDomain";



export interface Message {
  channel: MessageChannel;
  messageEvent: string;
  provider: MessageProvider;
  status?: MessageStatus;
  statusMessage?: string;
  fieldValidationErrors?: Array<MessageFieldValidationError>
}
export interface MessageDocument extends Message, MessageFunctions, Document {}
export interface MessageModel extends Model<MessageDocument> { }

export interface MessageFunctions {
  validateDataAndGenerateErrorObject: (this: MessageDocument | EmailMessageDocument | SmsMessageDocument | WhatsAppMessageDocument) => Array<MessageFieldValidationError>;
}

export interface MessageFieldValidationError {
  field: string;
  message: string;
}


export type MessageTypes = EmailMessage | SmsMessage | WhatsAppMessage
export type MessageDocumentTypes = EmailMessageDocument | SmsMessageDocument | WhatsAppMessageDocument

export interface EmailMessage extends Message {
  readonly channel: MessageChannel.EMAIL;
  messageId?: string;
  senderDomain?: string | null;
  from?: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;

  tags?: Array<string>;
  externalData?: MailgunEmailData;
}
export interface EmailMessageDocument extends EmailMessage, MessageFunctions, Document { }


export interface MailgunEmailData {
  messageId?: string;
  testMode: boolean,
  apiResult?: string;
  events: Array<MailgunEmailEvent>;
}

export interface MailgunEmailEvent {
  eventId: string;
  timestamp: Date;
  event: string; //https://documentation.mailgun.com/en/latest/user_manual.html#events
  deliveryStatus?: any
}

/*
export enum MailgunEmailEventType {
  ACCEPTED = "accepted", //Mailgun accepted the request to send/forward the email and the message has been placed in queue.
  REJECTED = "rejected", //Mailgun rejected the request to send/forward the email.
  DELIVERED = "delivered", //Mailgun sent the email and it was accepted by the recipient email server.
  FAILED = "failed", //Mailgun could not deliver the email to the recipient email server.
  OPENED = "opened", //The email recipient opened the email and enabled image viewing. Open tracking must be enabled in the Mailgun control panel, and the CNAME record must be pointing to mailgun.org.
  CLICKED = "clicked", //The email recipient clicked on a link in the email. Click tracking must be enabled in the Mailgun control panel, and the CNAME record must be pointing to mailgun.org.
  UNSUBSCRIBED = "unsubscribed", //The email recipient clicked on the unsubscribe link. Unsubscribe tracking must be enabled in the Mailgun control panel.
  COMPLAINED = "complained", //The email recipient clicked on the spam complaint button within their email client. Feedback loops enable the notification to be received by Mailgun.
  STORED = "stored", //Mailgun has stored an incoming message
  LIST_MEMBER_UPLOADED = "list_member_uploaded", //This event occurs after successfully adding a member to a mailing list.
  LIST_UPLOADED = "list_uploaded" //This event occurs after successfully uploading a large list of members to a mailing list.
}
*/



export interface SmsMessage extends Message {
  readonly channel: MessageChannel.SMS;
  messageId?: string;
  from?: string;
  to: string;
  text: string;

  tags?: Array<string>;

  externalData?: TwilioSmsData;
}
export interface SmsMessageDocument extends SmsMessage, MessageFunctions, Document { }

export interface TwilioSmsData {
  errorCode?: number;
  errorMessage?: string;
  events: Array<TwilioSmsEvent>;
}


export interface TwilioSmsEvent {
  eventId: string;
  timestamp: Date;
  event: string;
}



export interface WhatsAppMessage extends Message {
  readonly channel: MessageChannel.WHATSAPP;
  messageId?: string;
  from?: string;
  to: string;
  text: string;

  tags?: Array<string>;

  externalData?: TwilioWhatsAppData;
}

export interface TwilioWhatsAppData {
  errorCode?: number;
  errorMessage?: string;
  events: Array<TwilioWhatsAppEvent>;
}
export interface WhatsAppMessageDocument extends WhatsAppMessage, MessageFunctions, Document { }


export interface TwilioWhatsAppEvent {
  //https://www.twilio.com/docs/sms/api/message-resource#message-status-values
  eventId: string;
  timestamp: Date;
  event: string; //https://documentation.mailgun.com/en/latest/user_manual.html#events
}




export enum MessageChannel {
  EMAIL = "email",
  WHATSAPP = "whatsApp",
  SMS = "sms"
}

export enum MessageType {
  TRANSACTIONAL = "transactional",
  TEMPLATE_SCHEDULED = "template-scheduled",
  TEMPLATE_INTERACTIVE = "template-interactive"
}

export type MessageProvider = TemplateScheduledMessageProvider | TemplateInteractiveMessageProvider | TransactionalMessageProvider;
export interface TemplateScheduledMessageProvider {
  readonly messageType: MessageType.TEMPLATE_SCHEDULED;
  campaign: string;
  dataDomain: DataDomain
  messageTemplate: string;
  holdingOrg?: string;
  memberOrg?: string;
  customer?: string;
  customerCode?: string;
}

export interface TemplateInteractiveMessageProvider {
  readonly messageType: MessageType.TEMPLATE_INTERACTIVE;
  dataDomain: DataDomain
  messageTemplate: string;
  holdingOrg?: string;
  memberOrg?: string;
  customer?: string;
  customerCode?: string;
}

export interface TransactionalMessageProvider {
  readonly messageType: MessageType.TRANSACTIONAL;
}


export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  DISABLED = 'disabled',
}
