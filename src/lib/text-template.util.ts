
import validator from 'validator';
import mongoose from 'mongoose';
import _ from 'lodash';
import AppException from '../exceptions/AppException';
import logger from '../loaders/logger-loader';

export type TemplateTextData = {
  template: string;
  placeholders: string[];
  compiledTemplate: string;
}


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

export function validatePlaceholders(attributeNames: string[], model: any) {
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
