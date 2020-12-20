import config from "../../lib/config";
import logger from "../../lib/logger";
import { EmailMessage, EmailMessageDocument, MessageDocument, MessageStatus, MessageTypes } from "../../models/message/message.types";
import AMessageSender from "./AMessageSender";
import _ from 'lodash';
import Mailgun from 'mailgun-js';

class EmailSender extends AMessageSender {


  constructor() {
    super(
      "modules.sender.EmailSender"
    );
  }

  protected logMsgStart(message: MessageTypes): string {
    message = <EmailMessage>message;
    return `from ${message.from} - to ${message.to} - cc ${message.cc} - bcc ${message.bcc}`;
  }


  protected setChannelDependentAttributes(message: MessageDocument): void {
    const msg = <EmailMessageDocument>message;
    msg.senderDomain = this.getEmailDomain(msg.from);
    msg.externalData = {
      testMode: config.messaging.email.mailgun.testMode,
      events: [],
    }
  }


  protected async send(message: MessageDocument): Promise<void> {
    const msg = <EmailMessageDocument>message;
    let result: Mailgun.messages.SendResponse;

    let tmpMessageData = _.omitBy(_.pick(msg, ['from', 'to', 'cc', 'bcc', 'subject', 'body']), _.isEmpty);
    tmpMessageData['html'] = tmpMessageData.body;
    delete tmpMessageData['body'];

    let messageData: Mailgun.messages.SendData = <Mailgun.messages.SendData>tmpMessageData;

    if (!_.isEmpty(msg.tags)) {
      messageData["o:tag"] = msg.tags
    }

    if (config.messaging.email.mailgun.testMode) {
      logger.debug(`${this.loggerString}:send::Sending email in test mode.`);
      messageData["o:testmode"] = "true";
    }

    if (config.messaging.email.enabled === true) {
      logger.debug(`${this.loggerString}:send::Email sending is enabled.`);

      if (!msg.senderDomain) {
        //just to satisfy typescript error
        //senderDomain cannot be empty, because of validateDataAndGenerateErrorObject
        const errorMsg = `${this.loggerString}:send::cannot send email, sender domain is empty - messageId ${msg._id}`
        logger.error(errorMsg);
        throw new Error(errorMsg)
      }

      const mailgun = new Mailgun({ apiKey: config.messaging.email.mailgun.apiKey, domain: msg.senderDomain });
      result = await mailgun.messages().send(messageData);

      msg.status = MessageStatus.SENT;
      if (msg.externalData) {
        //ts wont allow it differently
        msg.externalData.messageId = result.id;
        msg.externalData.apiResult = result.message;
      }

    } else {
      logger.info(`${this.loggerString}:send::Email sending is disabled.`);

      if (msg.externalData) {
        //ts wont allow it differently
        msg.externalData.messageId = "";
        msg.externalData.apiResult = "Email sending is disabled.";
      }

      msg.status = MessageStatus.DISABLED;
      //not setting email.externalResult here because there is no external result
    }
  }


  protected getEmailDomain(email?: string) {
    let domain = null;
    if (email) {
      try {
        const regex = '(?<domain>(?<=@)[^ |^>]*)'
        const regexResult = email.match(regex);
        if (regexResult !== null && regexResult.groups) {
          domain = regexResult.groups.domain;
        } else {
          throw new Error("Domain not extracted.");
        }

      } catch (error) {
        logger.error(`lib.mailgun:getEmailDomain(email)::Domain could not be extracted from email ${email}`)
        domain = null;
      }

    }
    return domain;
  }

}

export default EmailSender;
