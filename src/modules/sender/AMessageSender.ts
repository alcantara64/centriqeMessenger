import logger from "../../lib/logger";
import MessageModel from "../../models/message/message.model";
import { MessageDocument, MessageStatus, MessageTypes } from "../../models/message/message.types";

abstract class AMessageSender {

  constructor(
    protected loggerString: string,
  ) { }


  public async sendMessage(messageInput: MessageTypes) {
    let message = new MessageModel(messageInput);
    let result: any

    try {
      logger.info(`${this.loggerString}:sendMessage::Sending message -- ${this.logMsgStart(messageInput)}`);
      message.status = MessageStatus.PENDING
      this.setChannelDependentAttributes(message);

      const validationErrors = message.validateDataAndGenerateErrorObject();

      if (validationErrors.length > 0) {
        //do not even try to send the message
        logger.error(`${this.loggerString}:sendMessage::There have been validation errors. The message will not be sent. See fieldValidationErrors in the database.`, validationErrors);
        message.status = MessageStatus.FAILED;
        message.statusMessage = `Fields not populated correctly. See fieldValidationErrors.`
        message = await message.save();
      } else {
        //send message
        await this.send(message);
      }

    } catch (error) {
      logger.error(`${this.loggerString}:sendMessage::Error -- ${error.message}`);
      message.statusMessage = error.message
      message.status = MessageStatus.FAILED
    } finally {
      if (message) {
        logger.debug(`${this.loggerString}:sendMessage::Saving message in db.`)

        try {
          await message.save();
        } catch (error) {
          logger.error(`${this.loggerString}:sendMessage::Message could not be saved in the database`, error)
          //not throwing exception at this point. If there was one, it was already thrown.
        }

      }

    }

  }

  protected abstract logMsgStart(message: MessageTypes): string;
  protected abstract setChannelDependentAttributes(message: MessageDocument): void;
  protected abstract send(message: MessageDocument): Promise<void>;

}

export default AMessageSender;
