import config from "../../lib/config";
import logger from "../../lib/logger";
import { EmailMessage, EmailMessageDocument, MessageDocument, MessageStatus, MessageTypes, SmsMessage, SmsMessageDocument } from "../../models/message/message.types";
import AMessageSender from "./AMessageSender";
import _ from 'lodash';
import Mailgun from 'mailgun-js';
import Twilio from 'twilio';
import { MessageInstance } from "twilio/lib/rest/api/v2010/account/message";

class SmsSender extends AMessageSender {


  constructor() {
    super(
      "modules.sender.SmsSender"
    );
  }

  protected logMsgStart(message: MessageTypes): string {
    message = <SmsMessage>message;
    return `from ${message.from} - to ${message.to}`;
  }


  protected setChannelDependentAttributes(message: MessageDocument): void {
    const msg = <SmsMessageDocument>message;
    msg.externalData = {
      events: [],
    }
  }


  protected async send(message: MessageDocument): Promise<void> {
    const msg = <SmsMessageDocument>message;
    let result: MessageInstance;




    if (config.messaging.sms.enabled === true) {
      logger.debug(`${this.loggerString}:send::SMS sending is enabled.`);

      const { from, to, text } = msg;

      const twilioClient = Twilio(config.messaging.twillio.accountSID, config.messaging.twillio.authToken);
      result = await twilioClient.messages.create({
        from: from,
        to: to,
        body: text
      });


      msg.status = MessageStatus.SENT;
      if (msg.externalData) {
        //ts wont allow it differently
        msg.externalData.errorCode = result.errorCode;
        msg.externalData.errorMessage = result.errorMessage;
      }

    } else {
      logger.info(`${this.loggerString}:send::SMS sending is disabled.`);
      if (msg.externalData) {
        //ts wont allow it differently
        msg.externalData.errorMessage = "SMS sending is disabled.";
      }
      msg.status = MessageStatus.DISABLED;
      //not setting email.externalResult here because there is no external result
    }
  }

}

export default SmsSender;
