

/**
 * Pads the number with zeros.
 * @param number
 * @param length
 */
export function padLeadingZeros(number: number, length: number): string {
  var str = '' + number;
  while (str.length < length) {
    str = '0' + str;
  }

  return str
}

