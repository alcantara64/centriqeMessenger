import mongoose from 'mongoose';
import { DEFAULT_MODEL_OPTIONS, codeSchema, isUnique, statusSchema } from '../../lib/mongoose.util';
import _ from 'lodash';
import searchUtil from '../../lib/search.util';
import { QueryLimiter } from '../../lib/security.util';
import { MessageChannel } from '../../models/message/message.types';
import enumUtil from '../../lib/enum.util';
import { CampaignDocument, ScheduleType } from './campaign.types';


const messageChannelArray = enumUtil.toArray(MessageChannel);

const filterCriteronSchema = new mongoose.Schema(
  {
    rowNumber: intSchema({ required: true }),
    startParenthesisCount: intSchema({ required: true, defaultValue: 0 }),
    endParenthesisCount: intSchema({ required: true, defaultValue: 0 }),
    attributeName: stringSchema({ required: true }),
    operator: {
      type: String,
      enum: ['=', "<>", ">", "<", "<=", ">=", "in list", "not in list", "contains", "In List", "Not In List", "Contains", "days before", "Days Before", "days after", "Days After"]

    },
    values: { type: Array, required: true },
    logicalConcatenation: {
      type: String,
      enum: ['and', 'or', '', null, 'AND', 'OR'],
      default: null
    },
  },
  //no need for an id. the array will always be replaced entirely with an update
  { _id: false }
);


const schedulePattern = new mongoose.Schema({},
  { discriminatorKey: 'scheduleType', _id: false });



export const CampaignSchema = new mongoose.Schema(
  {
    holdingOrg: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HoldingOrg',
      default: null
    },

    memberOrg: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MemberOrg',
      default: null
    },

    code: codeSchemaInternal(),
    name: { type: String, required: true },
    description: { type: String },

    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MessageTemplate',
      required: true
    },
    channel: {
      type: String,
      required: true,
      enum: messageChannelArray,
      default: MessageChannel.EMAIL
    },

    filterCriteria: {
      type: [filterCriteronSchema],
      set: setFilterCriteria
    },
    filterQuery: {
      type: String,
      required: true
    },

    schedulePattern: schedulePattern,

    status: statusSchema(),

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  DEFAULT_MODEL_OPTIONS
);


/****************** scheulde patterns ************************/

const docSchedulePattern: any = CampaignSchema.path('schedulePattern');

const oneTimeSchedule = new mongoose.Schema({
  date: { type: Date, required: true }
}, { _id: false });
docSchedulePattern.discriminator(ScheduleType.ONE_TIME, oneTimeSchedule);


const dailySchedule = new mongoose.Schema({
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  endAfterOccurrenceCount: { type: Number },

  dayRecurrenceCount: intSchema(),
}, { _id: false });
docSchedulePattern.discriminator(ScheduleType.DAILY, dailySchedule);


const weeklySchedule = new mongoose.Schema({
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  endAfterOccurrenceCount: { type: Number },

  weekRecurrenceCount: intSchema({ required: true }),
  dayOfWeek: {
    type: [Boolean],
    required: true,
    validate: [
      {
        validator: (v: any) => { return v.length == 7 },
        message: props => `The dayOfWeek attribute needs to contain 7 values`,
        type: 'format'
      }
    ]
  }
}, { _id: false });
docSchedulePattern.discriminator(ScheduleType.WEEKY, weeklySchedule);


const monthlySchedule = new mongoose.Schema({
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  endAfterOccurrenceCount: { type: Number },

  byDayOfMonth: {
    dayOfMonth: {
      type: Number,
      enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]
    },
    monthRecurrenceCount: Number,
  },

  byWeekDay: {
    occurence: {
      type: String,
      enum: ['first', 'second', 'third', 'fourth', 'last'],
    },
    weekDay: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5, 6],
    },
    monthRecurrenceCount: intSchema()
  }


}, { _id: false });
docSchedulePattern.discriminator(ScheduleType.MONTHLY, monthlySchedule);


const yearlySchedule = new mongoose.Schema({
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  endAfterOccurrenceCount: { type: Number },

  yearRecurrenceCount: intSchema({ required: true }),

  byMonthDay: {
    month: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    },
    day: {
      type: Number,
      enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
    }
  },

  byMonthWeekDay: {
    occurence: {
      type: String,
      enum: ['first', 'second', 'third', 'fourth', 'last'],
    },
    weekDay: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5, 6],
    },
    month: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    },
  }


}, { _id: false });
docSchedulePattern.discriminator(ScheduleType.YEARLY, yearlySchedule);


/****************** scheulde patterns ************************/








function intSchema(opts: any = {}) {
  const { required, defaultValue } = opts
  return {
    type: Number,
    required: !!required,
    default: !_.isNil(defaultValue) ? defaultValue : null
  }
}

function stringSchema(opts: any = {}) {
  const { required } = opts
  return {
    type: String,
    required: !!required,
    default: null
  }
}


function codeSchemaInternal(): any {
  return codeSchema({
    isUniqueFn: isUniqueCode
  });
}

async function isUniqueCode(doc: any, code: any): Promise<boolean> {
  return await isUnique(CampaignModel, doc, {
    code: code,
    memberOrg: doc.memberOrg,
    holdingOrg: doc.holdingOrg
  });
}


/**
 * Setting the mongodb query along with the filter.
 * @param value The filterCriteria
 */
function setFilterCriteria(this: any, value: any): any {
  const queryLimiter: QueryLimiter = {
    //TODO: can it happen that holdingOrg or memberOrg are not set yet on the model?
    //How does mongoose do the processing?
    holdingOrg: this.holdingOrg,
    memberOrg: this.memberOrg
  }
  this.filterQuery = generateFilterQuery(value, queryLimiter);

  return value;
}


function generateFilterQuery(criteria: any, queryLimiter: QueryLimiter): any {
  //MongoDb does not allow to store "$or" or "$and" as attribute names. Need to store as JSON value
  return JSON.stringify(searchUtil.convertCriteriaToMongooseQueryAndAttachOrgLimiter(criteria, queryLimiter));
}

//needs to happen before index
export const CampaignHistorySchema = _.cloneDeep(CampaignSchema)
CampaignSchema.index({ code: 1, memberOrg: 1, holdingOrg: 1 }, { unique: true })
const CampaignModel = mongoose.model<CampaignDocument>('Campaign', CampaignSchema);

export default CampaignModel;
