import mongoose from 'mongoose';
import { emailSchema, isUnique, statusSchema } from '../../lib/mongoose.util';
import jwt from 'jsonwebtoken';
import config from '../../lib/config'

import _ from 'lodash';

import Role from '../../models/org/role.model';
import logger from '../../lib/logger';
import Privilege from '../../enums/Privilege';
import DataDomainConfig from '../../enums/DataDomainConfig';



const rowLevelSercurityUiSchema = new mongoose.Schema(
  {
    dataDomain: {
      type: String,
      enum: DataDomainConfig.getAsEnumArray(),
      required: true
    },

    holHoldingOrg: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HoldingOrg',
    },

    molHoldingOrg: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HoldingOrg'
    },

    molMemberOrgs: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MemberOrg'
    }],

  },
  { _id: false }
);


export const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 20,
      unique: true,
      lowercase: true,
      validate: {
        validator: function (v: any) { return isUniqueUserId(this, v) },
        message: props => 'UserId is already in use',
        type: 'unique'
      }
    },
    email: emailSchemaInternal(),
    firstName: String,
    lastName: String,
    name: String,
    title: {
      type: String,
      minlength: 3,
      maxlength: 50
    },
    status: statusSchema(),
    password: {
      type: String,
      required: true,
      //minlength: 6,
      //maxlength: 20 doesnt make sense. this is the hash value
    },
    roles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role'
    }],
    isAdmin: {
      type: Boolean,
      default: false
    },
    resetPasswordNextLogon: Boolean,
    resetPasswordCode: {
      type: String,
      default: '',
    },
    resetPasswordToken: {
      type: String,
      default: '',
    },
    resetPasswordExpires: {
      type: Number,
      default: 0,
    },


    rowLevelSecurityFromUi: {
      type: [rowLevelSercurityUiSchema],
      set: setFowLevelSecurityFromUi
    },

    rowLevelSecurity: {
      customer: {
        hol: {
          holdingOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'HoldingOrg'
          }]
        },

        mol: {
          holdingOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'HoldingOrg'
          }],

          memberOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MemberOrg'
          }],

        }
      },

      product: {
        hol: {
          holdingOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'HoldingOrg'
          }]
        },

        mol: {
          holdingOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'HoldingOrg'
          }],

          memberOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MemberOrg'
          }],
        }
      },

      revenue: {
        hol: {
          holdingOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'HoldingOrg'
          }]
        },

        mol: {
          holdingOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'HoldingOrg'
          }],

          memberOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MemberOrg'
          }],
        }
      },

      cost: {
        hol: {
          holdingOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'HoldingOrg'
          }]
        },

        mol: {
          holdingOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'HoldingOrg'
          }],

          memberOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MemberOrg'
          }],
        }
      },

      communication: {
        hol: {
          holdingOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'HoldingOrg'
          }]
        },

        mol: {
          holdingOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'HoldingOrg'
          }],

          memberOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MemberOrg'
          }],
        }
      },

      response: {
        hol: {
          holdingOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'HoldingOrg'
          }]
        },

        mol: {
          holdingOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'HoldingOrg'
          }],

          memberOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MemberOrg'
          }],
        }
      },

      nps: {
        hol: {
          holdingOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'HoldingOrg'
          }]
        },

        mol: {
          holdingOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'HoldingOrg'
          }],

          memberOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MemberOrg'
          }],
        }
      },

      profitEdge: {
        hol: {
          holdingOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'HoldingOrg'
          }]
        },

        mol: {
          holdingOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'HoldingOrg'
          }],

          memberOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MemberOrg'
          }],
        }
      },

      marketPlace: {
        hol: {
          holdingOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'HoldingOrg'
          }]
        },

        mol: {
          holdingOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'HoldingOrg'
          }],

          memberOrgs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MemberOrg'
          }],
        }
      }
    }
  },
  {
    toJSON: { virtuals: true },
    timestamps: true
  }
);



userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      name: this.name,
      isAdmin: this.isAdmin,
    }, config.jwtSecret, { expiresIn: '12h' }
  );
};

/**
 * Retrieves all holdingOrgs for the global holdingOrg selector on the UI. HoldingOrg will be included if
 * a) user has access to any of the dataDomains for that holdingOrg or
 * b) user has access to any of the dataDomains for the corresponding memberOrg
 */
userSchema.methods.getHoldingOrgsForGlobalSelector = function (): Array<string> {
  const holdingOrgIds: Array<string> = [];

  //collect all holdingOrgIds
  for (let rowLevel of this.rowLevelSecurityFromUi) {
    if (rowLevel.holHoldingOrg) {
      holdingOrgIds.push(rowLevel.holHoldingOrg.toString());
    }

    if (rowLevel.molHoldingOrg) {
      holdingOrgIds.push(rowLevel.molHoldingOrg.toString());
    }
  }

  const holdingOrgIdsUnique = [...new Set<string>(holdingOrgIds)];

  return holdingOrgIdsUnique;
};


userSchema.virtual('privileges').get(function (this: any): Array<Privilege> {
  let privileges: Array<Privilege> = [];

  if (this.populated('roles')) {

    privileges = _.chain(this.roles).map(a => a.privileges).flatten().uniq().value()
    if (this.isAdmin === true) {
      //admin has access to everything
      logger.debug(`models.user:getPrivileges::User is admin. Adding all privilegs.`)
      privileges = _.chain((<any>Role).getAllPrivileges()).concat().uniq().value()
    }
    //only return if roles was populated. This means this virtual is absent if roles was not populated.
    logger.debug(`models.user:getPrivileges::User has the following privileges: ${privileges}`);
    return _.sortBy(privileges);
  }

  return privileges;
});



async function isUniqueUserId(doc: any, userId: any): Promise<boolean> {
  return await isUnique(UserModel, doc, {
    userId: userId
  });
}


function emailSchemaInternal(): any {
  return emailSchema({
    required: true,
    isUnique: isUniqeEmail
  });
}

async function isUniqeEmail(doc: any, email: any): Promise<boolean> {
  return await isUnique(UserModel, doc, {
    email: email
  });
}



function setFowLevelSecurityFromUi(this: any, values: any): any {
  const rowLevelSecurityObj: any = {}

  for (let item of values) {
    //check if dataDomain object already exists
    let obj = rowLevelSecurityObj[item.dataDomain];
    if (obj === undefined) {
      //if not, create new object corresponding to schema definition of rowLevelSecurity
      rowLevelSecurityObj[item.dataDomain] = {
        hol: {
          holdingOrgs: []
        },
        mol: {
          holdingOrgs: [],
          memberOrgs: []
        }
      }

      obj = rowLevelSecurityObj[item.dataDomain];
    }

    if (item.holHoldingOrg) {
      //if there is a holdingOrg set on holdingOrgLevel, add it to the object
      obj.hol.holdingOrgs.push(item.holHoldingOrg);
    }

    if (item.molHoldingOrg && (!item.molMemberOrgs || item.molMemberOrgs.length === 0)) {
      //only add holdingOrg on memberOrg level if there are no memberOrgs
      //this means, the user has access to all memberOrgs for that holdingOrg
      //subsequent code will dynamically query for all memberOrgs of that holdingOrg
      obj.mol.holdingOrgs.push(item.molHoldingOrg);
    } else {
      //if memberorgs are specified, only add those -- no holdingOrg in this case
      obj.mol.memberOrgs = [...obj.mol.memberOrgs, ...item.molMemberOrgs];
    }
  }

  this.rowLevelSecurity = rowLevelSecurityObj;
  return values;
}


const UserModel = mongoose.model("User", userSchema);
export default UserModel


