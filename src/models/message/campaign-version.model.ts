import mongoose from 'mongoose';
import { CampaignHistorySchema } from './campaign.model';
import { CampaignDocument } from './campaign.types';


CampaignHistorySchema.index({ code: 1, memberOrg: 1, holdingOrg: 1 })
const CampaignHistoryModel = mongoose.model<CampaignDocument>('CampaignVersion', CampaignHistorySchema);
export default CampaignHistoryModel;
