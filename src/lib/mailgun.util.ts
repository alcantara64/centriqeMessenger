import config from '../lib/config';
import logger from '../lib/logger';
import { TemplateInteractiveMessageEventDocument } from '../models/message/message-event.types';
import { MessageTemplateDocument } from '../models/message/message-template.types';
import { EmailMessage, MessageChannel, MessageType, TemplateInteractiveMessageProvider, TemplateScheduledMessageProvider } from '../models/message/message.types';
import { CustomerDocument } from '../models/org/customer.types';
import EmailSender from '../modules/sender/EmailSender';
import { buildEmailTextFromCustomerTemplate } from './message.util';




const emailSender = new EmailSender();
export async function sendEmail(message: EmailMessage): Promise<void> {
  return await emailSender.sendMessage(message);
}



export async function sendInteractiveEmail(template: MessageTemplateDocument, messageEvent: TemplateInteractiveMessageEventDocument, customers: CustomerDocument[]) {
  logger.debug(`lib.mailgun:sendInteractiveEmail::Start message event ${messageEvent._id}`);
  const { manualOverride } = messageEvent


  if (template && template.channel && template.channel.email && customers.length) {
    const templateResults = buildEmailTextFromCustomerTemplate(template, customers);

    const { defaultEmailSender } = <any>template.memberOrg || <any>template.holdingOrg;
    const from = defaultEmailSender ? defaultEmailSender : config.messaging.email.defaultSender;

    for (const templateResult of templateResults) {
      const manualOverrideActive = !!manualOverride?.emailTo
      const to = manualOverride?.emailTo ?  manualOverride?.emailTo : templateResult.customer.email


      const provider: TemplateInteractiveMessageProvider = {
        dataDomain: template.dataDomain,
        messageTemplate: template._id,
        messageType: MessageType.TEMPLATE_INTERACTIVE,
        customer: templateResult.customer._id,
        customerCode: templateResult.customer.code,
        holdingOrg: template.holdingOrg,
        memberOrg: template.memberOrg,
        manualOverride: {
          active: manualOverrideActive,
          originalTo: manualOverrideActive ? templateResult.customer.email : undefined
        }
      }
      await sendEmail({
        body: templateResult.bodyData.compiledTemplate,
        channel: MessageChannel.EMAIL,
        messageEvent: messageEvent._id,
        provider,
        subject: templateResult.subjectData.compiledTemplate,
        to,
        from
      });
    }
  }
}



export async function sendScheduledEmail(template: MessageTemplateDocument, messageEventId: string, campaignId: string, customers: CustomerDocument[]) {
  logger.debug(`lib.mailgun:sendScheduleMail::Start`);

  if (template && template.channel && template.channel.email && customers.length) {
    const templateResults = buildEmailTextFromCustomerTemplate(template, customers);

    const { defaultEmailSender } = <any>template.memberOrg || <any>template.holdingOrg;
    const from = defaultEmailSender ? defaultEmailSender : config.messaging.email.defaultSender;

    for (const templateResult of templateResults) {
      const provider: TemplateScheduledMessageProvider = {
        campaign: campaignId,
        dataDomain: template.dataDomain,
        messageTemplate: template._id,
        messageType: MessageType.TEMPLATE_SCHEDULED,
        customer: templateResult.customer._id,
        customerCode: templateResult.customer.code,
        holdingOrg: template.holdingOrg,
        memberOrg: template.memberOrg
      }
      await sendEmail({
        body: templateResult.bodyData.compiledTemplate,
        channel: MessageChannel.EMAIL,
        messageEvent: messageEventId,
        provider,
        subject: templateResult.subjectData.compiledTemplate,
        to: templateResult.customer.email,
        from
      });
    }
  }
}
