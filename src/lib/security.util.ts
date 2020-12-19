import Privilege from "../enums/Privilege";
import IRoleBasedUserSecurity from "../interfaces/models/IRoleBasedUserSecurity";
import AppException from "../exceptions/AppException";
import IRowLevelSecurityData from "../interfaces/models/IRowLevelSecurityData";
import IRowLevelUserSecurity from "../interfaces/models/IRowLevelUserSecurity";
import mongoose from 'mongoose';
import DataDomain from "../enums/DataDomain";


export default {
  isRowLevelAccessAllowed,
  buildAccessQuery,
  attachAccessRestrictionToQuery,
  extractRowLevelSecurityData,
  isRoleBasedAccessAllowed,
  attachMemberOrHoldingOrgToQuery,
  attachQueryToQuery
}

/** Check if a user has access to the specified data. */
function isRowLevelAccessAllowed(
  dataDomain: DataDomain,
  userSecurity: IRowLevelUserSecurity,
  data: IRowLevelSecurityData | IRowLevelSecurityData[]): boolean {

  let hasAccess = userSecurity.isAdmin;

  if (!hasAccess) {
    const dataList: IRowLevelSecurityData[] = Array.isArray(data) ? data : [data];

    if ((<any>userSecurity)[dataDomain].holdingOrgs) {
      hasAccess = dataList.every(v => {
        return v.holdingOrgId ? (<any>userSecurity)[dataDomain].holdingOrgs.includes(v.holdingOrgId) : true;
      })
    }


    if ((<any>userSecurity)[dataDomain].memberOrgs) {
      hasAccess = hasAccess && dataList.every(v => {
        return v.memberOrgId ? (<any>userSecurity)[dataDomain].memberOrgs.includes(v.memberOrgId) : true;
      })
    }

  }
  return hasAccess;
}

/**
 * Attaches the security filter to an existing query.
 * @param query
 * @param userSecurity
 * @param limiter Limits the security restriction to either memberOrg or holdingOrg. This is only needed for holdingOrg and memberOrg services.
 */
function attachAccessRestrictionToQuery(query: any, dataDomain: DataDomain, userSecurity: IRowLevelUserSecurity, limiter?: BuildAccessQueryLimiter): any {
  let accessQuery: any = buildAccessQuery(dataDomain, userSecurity, limiter);

  if (accessQuery !== null) {
    accessQuery = { $and: [{ ...query }, accessQuery] };
  } else {
    accessQuery = { ...query };
  }

  return accessQuery;
}




export type BuildAccessQueryLimiter = "holdingOrg" | "memberOrg";
/**
 * Builds the query for mongoose to restrict result set to items the user has access to.
 * Also check out "attachAccessQueryRestriction" that attaches this to a query directly.
 *
 * @returns Returns null in case userSecurity.isAdmin = true
*/
function buildAccessQuery(dataDomain: DataDomain, userSecurity: IRowLevelUserSecurity, limiter?: BuildAccessQueryLimiter): any {
  let accessQuery: any = null;

  if (userSecurity.isAdmin === true) {
    accessQuery = null;
  } else {
    let attachHoldingOrgIds = (<any>userSecurity)[dataDomain].holdingOrgs && (<any>userSecurity)[dataDomain].holdingOrgs.length > 0;
    let attachMemberOrgIds = (<any>userSecurity)[dataDomain].memberOrgs && (<any>userSecurity)[dataDomain].memberOrgs.length > 0;

    if (limiter) {
      //if limiter active, only attach the one that's mentioned in the limiter
      attachHoldingOrgIds = limiter === 'holdingOrg' ? attachHoldingOrgIds : false;
      attachMemberOrgIds = limiter === 'memberOrg' ? attachMemberOrgIds : false;
    }

    if (attachHoldingOrgIds && attachMemberOrgIds) {
      accessQuery = { $or: [] };

      //model.find() would allow for { holdingOrg: userSecurity.holdingOrgIds }
      //however, model.aggregate() requires this more complex solution with $in and ObjectIds
      const holdingOrgObjectIds = (<any>userSecurity)[dataDomain].holdingOrgs.map((v: any) => { return new mongoose.Types.ObjectId(v); });
      const memberOrgObjectIds = (<any>userSecurity)[dataDomain].memberOrgs.map((v: any) => { return new mongoose.Types.ObjectId(v); });

      accessQuery.$or.push({ holdingOrg: { $in: holdingOrgObjectIds } });
      accessQuery.$or.push({ memberOrg: { $in: memberOrgObjectIds } });
    }
    else if (attachHoldingOrgIds) {
      const holdingOrgObjectIds = (<any>userSecurity)[dataDomain].holdingOrgs.map((v: any) => { return new mongoose.Types.ObjectId(v); });
      accessQuery = { holdingOrg: { $in: holdingOrgObjectIds } }
    }
    else if (attachMemberOrgIds) {
      const memberOrgObjectIds = (<any>userSecurity)[dataDomain].memberOrgs.map((v: any) => { return new mongoose.Types.ObjectId(v); });
      accessQuery = { memberOrg: { $in: memberOrgObjectIds } }
    }
    else {
      //should give no results. It's unlikely that there is a memberOrg with an id of "00000000000000000000000"
      accessQuery = { memberOrg: new mongoose.Types.ObjectId('000000000000000000000000') }
    }
  }
  return accessQuery;
}





/**
 * Extracts row level security relevant attributes from mongoose model.
 * @param data
 * @returns Throws AppException if holdingOrg or memberOrg are not defined.
 */
function extractRowLevelSecurityData(data: any): IRowLevelSecurityData[] {
  const results: IRowLevelSecurityData[] = [];

  const dataList: any[] = Array.isArray(data) ? data : [data];
  dataList.forEach(v => {
    if (v.holdingOrg === undefined && v.memberOrg === undefined) {
      //at least one of them has to be there
      throw new AppException("Expecting holdingOrg and memberOrg attributes.");
    }
    results.push({
      holdingOrgId: v.holdingOrg,
      memberOrgId: v.memberOrg
    });
  });

  return results;
}


/**
 * Uses lib.security.isRoleBasedAccessAllowed
 * @param roleSecurity The user's role security.
 * @param grantingPrivileges The list of privileges that grant access to this endpoint.
 *
 * @returns true = has access - false = no access
 */
function isRoleBasedAccessAllowed(
  roleSecurity: IRoleBasedUserSecurity,
  grantingPriviledges: Array<Privilege>): boolean {

  let hasAccess = false;
  const userPrivileges = roleSecurity.privileges;

  for (const grantingPrivilege of grantingPriviledges) {
    hasAccess = userPrivileges.includes(grantingPrivilege);
    if (hasAccess) {
      //if one match is found, we can stop looking
      break;
    }
  }

  return hasAccess;
}


export type QueryLimiter = {
  memberOrg?: string
  holdingOrg?: string
}
/**
 * Adds the limiter to the existing query with an "and"
 * @param query A mongodb query
 * @param limiter
 */
function attachMemberOrHoldingOrgToQuery(query: any, limiter: QueryLimiter): any {
  let limitedQuery = {}
  if (limiter.memberOrg) {
    limitedQuery = {
      $and: [
        query,
        { memberOrg: new mongoose.Types.ObjectId(limiter.memberOrg) }
      ]
    }
  }
  else if (limiter.holdingOrg) {
    limitedQuery = {
      $and: [
        query,
        { holdingOrg: new mongoose.Types.ObjectId(limiter.holdingOrg) }
      ]
    }
  } else {
    limitedQuery = query;
  }

  return limitedQuery;
}


function attachQueryToQuery(query1: any, query2: any, operator: "$and" | "$or") {

  let extendedQuery: any = { }
  extendedQuery[operator] = [query1, query2];

  return extendedQuery;
}
