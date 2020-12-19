import mongoose from 'mongoose';
import { DEFAULT_MODEL_OPTIONS, codeSchema, isUnique, statusSchema } from '../../lib/mongoose.util';
import Privilege from '../../enums/Privilege';
import enumUtil from '../../lib/enum.util';


const privilegesArray = enumUtil.toArray(Privilege)


const roleSchema = new mongoose.Schema({
  code: codeSchemaInternal(),
  name: {
    type: String,
    required: true,
  },
  status: statusSchema(),
  privileges: {
    type: [String],
    enum : privilegesArray,
    required: true,
    validate: [
      {
        validator: (v: any) => { return v.length >= 1 },
        message: props => `A role must at least have one privilege.`,
        type: 'format'
      }
    ]
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
},
DEFAULT_MODEL_OPTIONS
);


roleSchema.statics.getAllPrivileges = function () {
  return privilegesArray;
};




function codeSchemaInternal(): any {
  return codeSchema({
    isUnique: isUniqueCode
  });
}

async function isUniqueCode(doc: any, code: any): Promise<boolean> {
  return await isUnique(RoleModel, doc, {
    code: code
  });
}


const RoleModel = mongoose.model('Role', roleSchema);

export default RoleModel;
