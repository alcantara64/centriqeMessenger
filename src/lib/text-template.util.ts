
import validator from 'validator';
import mongoose from 'mongoose';
import _ from 'lodash';
import AppException from '../exceptions/AppException';
import logger from './logger';

export type TemplateTextData = {
  template: string;
  placeholders: string[];
  compiledTemplate: string;
}

/**
 * Compiles a template string by replacing placeholders with actual data.
 * @param template Any string with or without placeholders in format {#placeholders}
 * @param obj data class that is used to populated the placeholders in the template
 * @param placeholders Optional parameter. If compileTemplate is used in a loop, it may make sense to extract placeholders with function
 * extractPlaceholders once before the loop and pass placehodlers then into this function
 */
export function compileTemplate(template: string, obj: any, placeholders?: string[]): TemplateTextData {
  if(placeholders === undefined) {
    placeholders = extractPlaceholders(template);
  }

  const compiledTemplate = replaceTemplatePlaceholders(template, placeholders, obj);

  const resultTextData: TemplateTextData = {
    template: template,
    placeholders: placeholders,
    compiledTemplate: compiledTemplate
  }
  return resultTextData;
}

export function replaceTemplatePlaceholders(text: string, placeholders: string[], obj: any) {
  let resultText = text;
  for (let placeholder of placeholders) {
    resultText = resultText.replace(`{#${placeholder}}`, obj[placeholder]);
  }

  return resultText;
}

export function validatePlaceholders(attributeNames: string[], model: mongoose.Model<any>) {
  const schemaPaths = <any>model.schema.paths

  for (let attributeName of attributeNames) {
    if (!schemaPaths[attributeName]) {
      logger.error("haaaa" + attributeName);
    }
    else if (!validator.isAlphanumeric(attributeName)) {
      logger.error("not alphanum " + attributeName);
    }
  }

}


export function extractPlaceholders(text: string): string[] {
  let attributeNames: string[] = [];

  if(text) {
    let tmpStr = text;
    let startIdx = tmpStr.indexOf('{#');
    while (startIdx >= 0) {
      const subStartIdx = startIdx + 2;
      tmpStr = tmpStr.substring(subStartIdx);
      const endIdx = tmpStr.indexOf('}');
      if (endIdx < 0) {
        const errorEndIdx = tmpStr.length >= 5 ? 5 : tmpStr.length

        const errorStr = `Missing closing bracket ${tmpStr.substring(0, errorEndIdx)}`
        logger.error(`lib.email-template:extractPlaceholders: ${errorStr}`)
        throw new AppException(errorStr);
      }


      attributeNames.push(tmpStr.substring(0, endIdx));

      tmpStr = tmpStr.substring(endIdx + 1);

      startIdx = tmpStr.indexOf('{#');
    }
  }

  return attributeNames;
}
