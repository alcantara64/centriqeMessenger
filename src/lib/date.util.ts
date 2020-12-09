import { padLeadingZeros } from './string.util';
import { DateTime } from 'luxon';


/**
 * Generates a string from a given date without the year.
 * For example: 2020-03-14 > 0314
 * @param date
 */
export function generateDateNoYearString(date: Date): string {
  const str = `${padLeadingZeros(date.getMonth() + 1, 2)}${padLeadingZeros(date.getDate(), 2)}`;
  return str;
}


/**
 * Attaches UTC timezone information to ISO date string.
 * This does not convert the time -- the string representation of the time stays the same
 * @param value ISO date string
 */
export function addUtcIdentifierToDateString(value: string): string {
  let dateTime = DateTime.fromISO(value);
  dateTime = dateTime.setZone("UTC", { keepLocalTime: true });
  return dateTime.toISO();
}
