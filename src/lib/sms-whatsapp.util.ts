import Twilio from 'twilio';
import config from '../loaders/config.loaders'



export type smsDATA = {
  from:string,
  to:string,
  body:string,

};

const twilioClient = Twilio(config.messaging.twillio.accountSID, config.messaging.twillio.authToken);

export const sendMessage = ({body,from,to}:smsDATA, isWhatsApp = false) =>{
  // TODO verify is a valid phone number;
  let sender = from;
  let receiver = to;
  if(isWhatsApp){
     sender = `whatsapp:${from}`;
     receiver = `whatsapp:${to}`;
  }
    
    return twilioClient.messages.create({
        body,
        from:sender,
        to:receiver,
      })
    }

