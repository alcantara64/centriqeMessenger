
import MessageProviderType from '../enums/MessageProviderType';
import MessageType from '../enums/MessageType';
import { EmailData } from '../lib/email.util';
import { compileTemplate, extractPlaceholders } from './text-template.util';

export default {
  buildEmailDataFromCustomerTemplate
}


export function buildEmailDataFromCustomerTemplate(messageType: MessageType, from: string | null, template: any, customers: any[]): EmailData[] {
  const list: EmailData[] = [];

  const { subject, body, footer } = template;

  const subjectPlaceholders = extractPlaceholders(subject);
  const bodyPlaceholders = extractPlaceholders(body);
  const footerPlaceholders = extractPlaceholders(footer);


  for (const customer of customers) {
    const subjectTemplateData = compileTemplate(subject, customer, subjectPlaceholders);
    const bodyTemplateData = compileTemplate(body, customer, bodyPlaceholders);
    const footerTemplateData = compileTemplate(footer, customer, footerPlaceholders);

    const emailData: EmailData = {
      to: customer.email,
      subject: subjectTemplateData.compiledTemplate,
      body: bodyTemplateData.compiledTemplate,

      messageType: messageType,
      providerType: MessageProviderType.COMM_CAMPAIGN,
      providerInfo: {
        emailTemplateId: template._id,
        customerId: customer._id,
        rawSubject: subjectTemplateData.template,
        rawBody: bodyTemplateData.template,
        rawFooter: footerTemplateData.template,
      }
    }
    if(from!==null) {
      emailData.from = from;
    }

    list.push(emailData);
  }

  return list;
}

