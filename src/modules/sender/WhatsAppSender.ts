import Twilio from 'twilio';
import { MessageInstance } from "twilio/lib/rest/api/v2010/account/message";
import config from "../../lib/config";
import logger from "../../lib/logger";
import { MessageDocument, MessageStatus, MessageTypes, SmsMessage, SmsMessageDocument, WhatsAppMessage, WhatsAppMessageDocument } from "../../models/message/message.types";
import AMessageSender from "./AMessageSender";

class WhatsAppSender extends AMessageSender {


  constructor() {
    super(
      "modules.sender.WhatsAppSender"
    );
  }

  protected logMsgStart(message: MessageTypes): string {
    message = <WhatsAppMessage>message;
    return `from ${message.from} - to ${message.to}`;
  }


  protected setChannelDependentAttributes(message: MessageDocument): void {
    const msg = <WhatsAppMessageDocument>message;
    msg.externalData = {
      events: [],
    }
  }


  protected async send(message: MessageDocument): Promise<void> {
    const msg = <WhatsAppMessageDocument>message;
    let result: MessageInstance;

    if (config.messaging.whatsApp.enabled === true) {
      logger.debug(`${this.loggerString}:send::WhatsApp sending is enabled.`);

      const { from, to, text } = msg;

      const twilioClient = Twilio(config.messaging.twillio.accountSID, config.messaging.twillio.authToken);
      result = await twilioClient.messages.create({
        from: `whatsapp:${from}`,
        to: `whatsapp:${to}`,
        body: text
      });


      msg.status = MessageStatus.SENT;
      if(msg.externalData) {
        //ts wont allow it differently
        msg.externalData.errorCode = result.errorCode;
        msg.externalData.errorMessage = result.errorMessage;
      }

    } else {
      logger.info(`${this.loggerString}:send::WhatsApp sending is disabled.`);
      if(msg.externalData) {
        //ts wont allow it differently
        msg.externalData.errorMessage= "WhatsApp sending is disabled.";
      }
      msg.status = MessageStatus.DISABLED;
      //not setting email.externalResult here because there is no external result
    }
  }

}

export default WhatsAppSender;
