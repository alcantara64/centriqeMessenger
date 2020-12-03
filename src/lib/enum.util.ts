


export default {
  toArray,
  staticsToArray
}

/**
 * Convert a string enum to an array
 * @param e
 */
function toArray(e: { [s: number]: string }): Array<string> {
  let values: any = Object.values(e);

  let isNumberEnum = false;

  const numberValues: any = [];
  for(let value of values) {
    //if the enum is using numerical values, e.g. {ACTIVE = 1; INACTIVE = 0}
    //then Object.values(e) will return ['ACTIVE', 'INACTIVE', 1, 0]
    //so we need to filter for the numerical values
    if (typeof value === 'number') {
      isNumberEnum = true;
      numberValues.push(value);
    }
  }

  if(isNumberEnum) {
    values = numberValues;
  }
  return values;
}

/**
 * Convert a string enum to an array
 * @param e
 */
function staticsToArray(e: any): Array<string> {
  return Object.values(e);
}
