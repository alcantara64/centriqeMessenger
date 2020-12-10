import mongoose from 'mongoose';
import AppException from '../exceptions/AppException';
import validator from 'validator';
import _ from 'lodash';
import IRowLevelUserSecurity from '../interfaces/models/IRowLevelUserSecurity';
import security from './security.util';
import ModelStatus from '../enums/ModelStatus';
import enumUtil from './enum.util';
import DataDomain from '../enums/DataDomain';


const modelStatusArray = enumUtil.toArray(ModelStatus)


export const DEFAULT_MODEL_OPTIONS = {
  timestamps: true
}


export type CodeSchemaOptions = {
  required?: boolean,
  isUnique: Function
}
export function codeSchema(opts: CodeSchemaOptions) {
  const { required = true, isUnique } = opts
  return {
    type: String,
    required: required,
    unique: true,
    uppercase: true,

    validate: [
      {
        validator: function (code: any) {
          let codeAlphanum = code.replace(/-/g, '');
          codeAlphanum = codeAlphanum.replace(/_/g, '');
          return validator.isAlphanumeric(codeAlphanum);
        },
        message: (props: any) => `Code ${props.value} contains special characters`,
        type: 'format'
      },
      {
        validator: function (code: any) { return isUnique(this, code) },
        message: (props: any) => `Code ${props.value} is already in use`,
        type: 'unique'
      }
    ]
  }
}



export async function isUnique(model: mongoose.Model<any>, doc: any, query: any = {}): Promise<boolean> {
  const docFromDb = await model.findOne(query)
  const exists = !!docFromDb
  return !exists || (doc && docFromDb && doc._id.equals(docFromDb._id))
}



export type EmailSchemaOptions = {
  required?: boolean,
  emailValidation?: {
    allowDisplayName?: boolean
  }
  isUnique?: Function
}
/**
 *
 * @param opts required: boolean: unique: boolean
 * @param isUnique If opts.unique = true then you will have to pass this function
 */
export function emailSchema(opts: EmailSchemaOptions = {}): any {
  const { required = false, emailValidation = {}, isUnique } = opts
  const { allowDisplayName = false } = emailValidation;
  const unique = isUnique !== undefined;
  return {
    type: String,
    required: required,
    unique: unique,
    lowercase: allowDisplayName ? false : true, //it needs to be possible to have proper capitalization for display name
    validate: [
      {
        validator: (v: any) => {
          let isValid = false;
          console.log(`required - ${required}`)
          if (required) {
            isValid = validator.isEmail(v, { allow_display_name: allowDisplayName });
          } else {
            isValid = v ? validator.isEmail(v, { allow_display_name: allowDisplayName }) : v === null || v === ''
          }

          return isValid;
        },
        message: (props: any) => `${props.value} is not a valid email address`,
        type: 'format'
      },
      {
        validator: function (email: any) { return !!isUnique ? isUnique(this, email) : true },
        message: (props: any) => `Email ${props.value} is already in use`,
        type: 'unique'
      }
    ]
  }
}

/**
 * The standard status schema with 0 - inactive, 1 - active.
 */
export function statusSchema() {
  return {
    type: Number,
    enum: modelStatusArray,
    default: ModelStatus.ACTIVE,
    required: true
  }
}


export function getMongooseModelAttributes(model: mongoose.Model<any>, fieldNames: Array<string>): any {
  const searchSchema: any = {};
  const schemaPaths = <any>model.schema.paths

  //********note: this doesnt necessarily have to be dynamic. We could also just hardcode this instead of using the mongoose definition.
  //depends on if we're going to reuse this or not.
  fieldNames.forEach((fieldName) => {

    if (schemaPaths[fieldName]) {
      const type = schemaPaths[fieldName].instance

      let enumValues = schemaPaths[fieldName].enumValues;
      if (type === 'Number') {
        enumValues = schemaPaths[fieldName].options.enum
      }

      searchSchema[fieldName] = {};
      searchSchema[fieldName].type = type;
      if (enumValues) {
        enumValues = enumValues.filter((v: any) => {
          //filter empty items
          return (typeof v !== 'string' && v !== null)
            || (typeof v === 'string' && v !== null && v !== '');
        });
        searchSchema[fieldName].data = enumValues;
      }

    } else {
      throw new AppException("Internal server error", `Field does not exist ${fieldName}`)
    }

  });

  return searchSchema;
};

export function stringSchema(opts: any = {}) {
  const { required } = opts
  return {
    type: String,
    required: !!required,
    default: null
  }
}

export function intSchema(opts: any = {}) {
  const { required } = opts
  return {
    type: Number,
    required: !!required,
    default: null
  }
}
