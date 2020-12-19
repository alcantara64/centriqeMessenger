
import { MessageTemplate } from '../models/message/message-template.types';
import { CustomerDocument } from '../models/org/customer.types';
import { compileTemplate, extractPlaceholders, TemplateTextData } from './text-template.util';


export type EmailTemplateResult = {
  subjectData: TemplateTextData;
  bodyData: TemplateTextData;
  customer: CustomerDocument;
}

export type SmsTemplateResult = {
  textData: TemplateTextData;
  customer: CustomerDocument;
}

export type WhatsAppTemplateResult = {
  textData: TemplateTextData;
  customer: CustomerDocument;
}

export function buildEmailTextFromCustomerTemplate(
  template: MessageTemplate,
  customers: CustomerDocument[]
): EmailTemplateResult[] {
  const list: EmailTemplateResult[] = [];

  if(template.channel.email) {
    const { subject, body } = template.channel.email;

    const subjectPlaceholders = extractPlaceholders(subject);
    const bodyPlaceholders = extractPlaceholders(body);


    for (const customer of customers) {
      const result: EmailTemplateResult = {
        subjectData: compileTemplate(subject, customer, subjectPlaceholders),
        bodyData: compileTemplate(body, customer, bodyPlaceholders),
        customer: customer
      }

      list.push(result);
    }
  }

  return list;
}


export function buildSmsTextFromCustomerTemplate(
  template: MessageTemplate,
  customers: CustomerDocument[]
): SmsTemplateResult[] {
  const list: SmsTemplateResult[] = [];

  if(template.channel.sms) {
    const { text } = template.channel.sms;

    const textPlaceholders = extractPlaceholders(text);

    for (const customer of customers) {
      const result: SmsTemplateResult = {
        textData: compileTemplate(text, customer, textPlaceholders),
        customer: customer
      }

      list.push(result);
    }
  }

  return list;
}


export function buildWhatsAppTextFromCustomerTemplate(
  template: MessageTemplate,
  customers: CustomerDocument[]
): WhatsAppTemplateResult[] {
  const list: WhatsAppTemplateResult[] = [];

  if(template.channel.whatsApp) {
    const { text } = template.channel.whatsApp;

    const textPlaceholders = extractPlaceholders(text);

    for (const customer of customers) {
      const result: WhatsAppTemplateResult = {
        textData: compileTemplate(text, customer, textPlaceholders),
        customer: customer
      }

      list.push(result);
    }
  }

  return list;
}

  // switch (messageEvent.messageType) {
  //   case MessageType.TEMPLATE_INTERACTIVE: {

  //     break;
  //   }

  //   case MessageType.TEMPLATE_SCHEDULED: {
  //     break;
  //   }

  //   default: {
  //     const errorMsg = `Message Type not supported - ${messageEvent.messageType}`;
  //     logger.error(errorMsg, messageEvent);
  //     new Error(errorMsg);
  //   }
  // }



