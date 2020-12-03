import mongoose from 'mongoose';
import AppException from '../exceptions/AppException';
import validator  from 'validator';
import _ from 'lodash';
import IRowLevelUserSecurity from '../interfaces/models/IRowLevelUserSecurity';
import security from './security.util';
import ModelStatus from '../enums/ModelStatus';
import enumUtil from './enum.util';


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
    lowercase: true,
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




/**
 * Use this to get the filter data that can be used in drop downs, etc.
 * @param model
 * @param fieldNames
 * @param userSecurity
 */
// export async function getSearchFilterData(model: mongoose.Model<any>, fieldNames: Array<string>, userSecurity: IRowLevelUserSecurity) {

//   //1 - get model attribute definitions
//   const searchFilterData = getMongooseModelAttributes(model, fieldNames);

//   //2 - define where we need to query the db to get filter data
//   //essentially we dont want db unique values for anything that has data already through enums
//   //or for dates and numbers
//   let fieldNamesForFilterData: Array<string> = [];
//   Object.keys(searchFilterData).forEach(function (key) {
//     const attribute = searchFilterData[key];

//     if ((!attribute.data || attribute.data.length == 0) && !['Date', 'Number'].includes(attribute.type)) {
//       fieldNamesForFilterData.push(key);
//     }
//   });


//   //3 - get unique data
//   const filterData = await getUniqeFilterValues(model, fieldNamesForFilterData, userSecurity);

//   Object.keys(filterData).forEach(function (key) {
//     searchFilterData[key].data = filterData[key]
//   });

//   return searchFilterData;
// }


/**
 * Retrieves unique values for the specified mongoose model fieldNames by honoring userSecurity
 * @param model
 * @param fieldNames
 * @param userSecurity
 */
export async function getUniqeFilterValues(model: mongoose.Model<any>, fieldNames: Array<string>, userSecurity: IRowLevelUserSecurity) {
  /*
  build up something like this...

  let filterData = await Customer.aggregate([{
    $group: {
      _id: null,
      country: {$addToSet: '$country'},
      memberOrg: {$addToSet: '$memberOrg'},
      holdingOrg: {$addToSet: '$holdingOrg'}
    }
  }]);
  */

  const aggregation = [];

  const queryRestriction = security.buildAccessQuery(userSecurity);

  if (queryRestriction !== null) {
    aggregation.push({ $match: queryRestriction });
  }

  const group: any = { _id: null }; //_id always has to be added, see mongoose documentation
  fieldNames.forEach((fieldName) => {
    group[fieldName] = { $addToSet: `$${fieldName}` }
  });
  aggregation.push({ $group: group });

  let filterData: any = await model.aggregate(aggregation);

  if (filterData.length > 0) {
    //cleanup [some of those steps can maybe be done in mongoose/mongodb. This needs to be checked.]
    //1 - flatten object -- it's an array
    filterData = filterData[0]

    //2 - remove _id -- that's null anyway and doesnt make sense in this scenario
    delete filterData._id

    //3 - remove null from arrays and sort
    Object.keys(filterData).forEach(function (key) {
      filterData[key] = filterData[key].filter((obj: any) => obj).sort();
    })
  }

  return filterData;
}

// export function getMongooseModelAttributes(model: mongoose.Model<any>, fieldNames: Array<string>): any {
//   const searchSchema: any = {};
//   const schemaPaths = <any>model.schema.paths

//   //********note: this doesnt necessarily have to be dynamic. We could also just hardcode this instead of using the mongoose definition.
//   //depends on if we're going to reuse this or not.
//   fieldNames.forEach((fieldName) => {

//     if (schemaPaths[fieldName]) {
//       const type = schemaPaths[fieldName].instance

//       let enumValues = schemaPaths[fieldName].enumValues;
//       if (type === 'Number') {
//         enumValues = schemaPaths[fieldName].options.enum
//       }

//       searchSchema[fieldName] = {};
//       searchSchema[fieldName].type = type;
//       if (enumValues) {
//         enumValues = enumValues.filter((v: any) => {
//           //filter empty items
//           return (typeof v !== 'string' && v !== null)
//             || (typeof v === 'string' && v !== null && v !== '');
//         });
//         searchSchema[fieldName].data = enumValues;
//       }

//     } else {
//       throw new AppException("Internal server error", `Field does not exist ${fieldName}`)
//     }

//   });

//   return searchSchema;
// };

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
