import { Document, Model } from "mongoose";
import { MessageChannel } from "../../models/message/message.types";
import ModelStatus from "../../enums/ModelStatus";


export type ScheduleDayOfMonth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31
export type ScheduleOccurence = 'first' | 'second' | 'third' | 'fourth' | 'last';
export type ScheduleWeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type ScheduleMonth = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11

export enum ScheduleType {
  ONE_TIME = 'oneTime',
  DAILY = 'daily',
  WEEKY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export interface Campaign {
  holdingOrg?: string;
  memberOrg?: string;
  code: string;
  name: string;
  description: string;
  template: string;
  channel: MessageChannel,
  filterCriteria: FilterCriteria,
  filterQuery: string,
  schedulePattern: SchedulePattern,
  status: ModelStatus
}
export interface CampaignDocument extends Campaign, Document { }
export interface CampaignModel extends Model<CampaignDocument> { }


export interface FilterCriterion {
  rowNumber: number;
  startParenthesisCount: number;
  endParenthesisCount: number;
  attributeName: string;
  operator: '=' | "<>" | ">" | "<" | "<=" | ">=" | "in list" | "not in list" | "contains" | "In List" | "Not In List" | "Contains" | "days before" | "Days Before" | "days after" | "Days After"
  values: Array<any>,
  logicalConcatenation: 'and' | 'or' | '' | null | 'AND' | 'OR'
}
export interface FilterCriteria extends Array<FilterCriterion> { }


export type SchedulePattern = OneTimeSchedule | DailySchedule | WeeklySchedule | MonthlySchedule | YearlySchedule

export interface SchedulePatternWithRunDuration {
  startDate: Date;
  endDate?: Date;
  endAfterOccurrenceCount?: number;
}


export interface OneTimeSchedule {
  readonly scheduleType: ScheduleType.ONE_TIME
  date: Date;
}


export interface DailySchedule extends SchedulePatternWithRunDuration {
  readonly scheduleType: ScheduleType.DAILY;
  dayRecurrenceCount: number;
}

export interface WeeklySchedule extends SchedulePatternWithRunDuration {
  readonly scheduleType: ScheduleType.WEEKY;
  weekRecurrenceCount: number;
  dayOfWeek: [boolean, boolean, boolean, boolean, boolean, boolean, boolean];
}

export interface MonthlySchedule extends SchedulePatternWithRunDuration {
  readonly scheduleType: ScheduleType.MONTHLY;
  byDayOfMonth?: {
    dayOfMonth: ScheduleDayOfMonth;
    monthRecurrenceCount: number;
  }

  byWeekDay?: {
    occurence: ScheduleOccurence,
    weekDay: ScheduleWeekDay,
    monthRecurrenceCount: number
  }
}


export interface YearlySchedule extends SchedulePatternWithRunDuration {
  readonly scheduleType: ScheduleType.YEARLY;
  yearRecurrenceCount: number,

  byMonthDay?: {
    month: ScheduleMonth;
    day: ScheduleDayOfMonth
  }

  byMonthWeekDay?: {
    occurence: ScheduleOccurence,
    weekDay: ScheduleWeekDay,
    month: ScheduleMonth
  }
}
