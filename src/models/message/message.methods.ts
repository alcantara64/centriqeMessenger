import validator from 'validator'
import _ from 'lodash'
import { EmailMessageDocument, MessageChannel, MessageDocument, MessageFieldValidationError, SmsMessageDocument, WhatsAppMessageDocument } from "./message.types";
import logger from '../../lib/logger';



export function validateDataAndGenerateErrorObject(this: MessageDocument | EmailMessageDocument | SmsMessageDocument | WhatsAppMessageDocument): Array<MessageFieldValidationError> {
  let validationErrors = [];
  switch (this.channel) {
    case MessageChannel.EMAIL: {
      const fnValidate = validateEmail.bind(<EmailMessageDocument>this);
      validationErrors = fnValidate();
      break;
    }
    case MessageChannel.SMS: {
      const fnValidate = validateSms.bind(<SmsMessageDocument>this);
      validationErrors = fnValidate();
      break;
    }
    case MessageChannel.WHATSAPP: {
      const fnValidate = validateWhatsApp.bind(<WhatsAppMessageDocument>this);
      validationErrors = fnValidate();
      break;
    }
    default: {
      const errorMsg = `Unknown message channel ${MessageChannel}`
      logger.error(errorMsg)
      throw new Error(errorMsg)
    }
  }

  this.fieldValidationErrors = validationErrors;
  return validationErrors;
}

export function validateEmail(this: EmailMessageDocument): Array<MessageFieldValidationError> {

  const validationErrors: Array<MessageFieldValidationError> = [];
  if (_.isEmpty(this.from)) {
    validationErrors.push({ field: "from", message: `Field must not be empty.` })
  }
  else if (this.from !== undefined && !validator.isEmail(this.from, { allow_display_name: true })) {
    validationErrors.push({ field: "from", message: `Field needs to contain a valid email address - ${this.from}` })
  }


  if (_.isEmpty(this.to)) {
    validationErrors.push({ field: "to", message: `Field must not be empty.` })
  }
  else if (!validator.isEmail(this.to, { allow_display_name: true })) {
    validationErrors.push({ field: "to", message: `Field needs to contain a valid email address - ${this.to}` })
  }


  if (this.cc !== undefined && !_.isEmpty(this.cc) && !validator.isEmail(this.cc, { allow_display_name: true })) {
    validationErrors.push({ field: "cc", message: `Field needs to contain a valid email address - ${this.cc}` })
  }

  if (this.bcc !== undefined && !_.isEmpty(this.bcc) && !validator.isEmail(this.bcc, { allow_display_name: true })) {
    validationErrors.push({ field: "bcc", message: `Field needs to contain a valid email address - ${this.bcc}` })
  }


  if (_.isEmpty(this.senderDomain)) {
    validationErrors.push({ field: "senderDomain", message: `Field must not be empty. Sender domain could not be derived from "from" address.` })
  }
  else if (this.senderDomain && !validator.isFQDN(this.senderDomain)) {
    validationErrors.push({ field: "senderDomain", message: `Derived sender domain is not a valid domain - ${this.senderDomain}` })
  }



  if (_.isEmpty(this.subject)) {
    validationErrors.push({ field: "subject", message: `Field cannot be empty.` })
  }

  if (_.isEmpty(this.body)) {
    validationErrors.push({ field: "body", message: `Field cannot be empty.` })
  }

  return validationErrors;
}



export function validateSms(this: SmsMessageDocument): Array<MessageFieldValidationError> {
  const validationErrors: Array<MessageFieldValidationError> = [];

  return validationErrors;
}

export function validateWhatsApp(this: WhatsAppMessageDocument): Array<MessageFieldValidationError> {
  const validationErrors: Array<MessageFieldValidationError> = [];

  return validationErrors;
}

