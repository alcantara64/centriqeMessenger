import _ from 'lodash';
import AppException from "../exceptions/AppException";
import logger from "../loaders/logger-loader";
import { generateDateNoYearString } from "./date.util";
import security, { QueryLimiter } from './security.util';

export default {
  convertCriteriaToMongooseQueryAndAttachOrgLimiter
}


export type LogicalConcatenation = 'and' | 'or' | '' | null | 'AND' | 'OR';
export type Operator = '='
  | "<>"
  | ">"
  | "<"
  | ">="
  | "<="
  | "in list" | "In List"
  | "not in list" | "Not In List"
  | "contains" | "Contains"
  | "days before" | "Days Before"
  | "days after" | "Days After";

export type Criterion = {
  rowNumber: number;
  startParenthesisCount: number;
  endParenthesisCount: number;
  attributeName: string;
  operator: Operator;
  values: Array<any>;
  logicalConcatenation: LogicalConcatenation;
};
export type Criteria = Array<Criterion>;


export type LogicalGroup = {
  logicalConcatenation: LogicalConcatenation
  logicalGroups: LogicalGroups
  criteria: Criteria
  level: number
  query?: any
}
export type LogicalGroups = Array<LogicalGroup>





/**
 * Convert filter criteria into a proper mongodb query and attaches holdingOrg/ memberOrg limiter
 * @param criteria
 */
function convertCriteriaToMongooseQueryAndAttachOrgLimiter(criteria: Criteria, orgLimiter: QueryLimiter): LogicalGroup {

  const logicalGroup: LogicalGroup = convertCriteriaToMongooseQuery(criteria);

  let query = logicalGroup.query ? logicalGroup.query : {};
  query = security.attachMemberOrHoldingOrgToQuery(query, orgLimiter);

  return query;
}


/**
 * Convert filter criteria into a proper mongodb query.
 * @param criteria
 */
export function convertCriteriaToMongooseQuery(criteria: Criteria): LogicalGroup {
  //criteria = ensureOpeningAndClosingParenthesis(criteria);
  let logicalGroup: LogicalGroup = buildLogicalGroups(criteria);
  logicalGroup = buildMongooseQueriesOnLogicalGroups(logicalGroup);
  return logicalGroup;
}


/**
 * Need to check if this really is still needed.
 * @param criteria
 */
export function ensureOpeningAndClosingParenthesis(criteria: Criteria): Criteria {
  const criteriaToInvestigate = _.cloneDeep(criteria);

  if (criteriaToInvestigate[0].startParenthesisCount > 0) {
    //there is a start parenthesis already. Let's check if it surrounds the complete statement
    const endIdx = findIdxOfClosingParenthesis(criteria);
    if (endIdx === null || criteriaToInvestigate.length !== (endIdx + 1)) {
      criteriaToInvestigate[0].startParenthesisCount++;
      (<Criterion>_.last(criteriaToInvestigate)).endParenthesisCount++;
    }
  } else {
    criteriaToInvestigate[0].startParenthesisCount++;
    (<Criterion>_.last(criteriaToInvestigate)).endParenthesisCount++;
  }

  return criteriaToInvestigate;
}


/**
 * The is the first step in generating the mongodb query.
 * It goes through the criteria and isolates any logical groups defined by parentheses.
 * @param criteria
 * @returns Returns the root of all logical groups.
 */
export function buildLogicalGroups(criteria: Criteria): LogicalGroup {
  //stack used to keep strack of items to examine
  const logicalGroupStack: LogicalGroups = [];

  //Create the root logical group. It's sole purpose is to hold the rest of the structure
  let rootLogicalGroup = createLogicalGroup(0);
  //Assigning the complete list of criteria to the root. This is where we'll start processing.
  rootLogicalGroup.criteria = criteria;

  let logicalGroup: LogicalGroup | undefined = rootLogicalGroup;
  while (logicalGroup) {
    const criteria = logicalGroup.criteria;

    //In the criteria list, we need to jump to the next starting parenthesis.
    //This index gives us exactly that point in the criteria array.
    let nextIdxOfCriteriaToInvestigate = 0;
    while (nextIdxOfCriteriaToInvestigate < criteria.length) {
      const criterion = criteria[nextIdxOfCriteriaToInvestigate];

      //Cloning beceause we will change the criteria down the line (lowing parenthesis counts)
      //Technically not necessary, but it's cleaner this way.
      //Also, we're need to cut off the criteria we have already checked in the array, hence the "slice"
      const criteriaToInvestigate = _.cloneDeep(criteria.slice(nextIdxOfCriteriaToInvestigate));
      //The end index of the criterion with the closing parenthesis.
      let endIdx = null;

      const newLogicalGroup = createLogicalGroup(logicalGroup.level + 1);

      if (criterion.startParenthesisCount) {
        //Start new group if a parenthesis is encountered
        endIdx = findIdxOfClosingParenthesis(criteriaToInvestigate);

        if (endIdx !== null) {
          //Reducing the parenthesis count, otherwise the next round will find it again.
          criteriaToInvestigate[0].startParenthesisCount -= 1;
          criteriaToInvestigate[endIdx].endParenthesisCount -= 1;


          if (criteriaToInvestigate[0].startParenthesisCount > 0) {
            //&& criteriaToInvestigate[endIdx].endParenthesisCount > 0) {
            //We only need to investigate this new logical group again in case there are parenthesis left over.
            //I dont think that checking the end parenthesis makes sense. Commenting out for now.
            logicalGroupStack.push(newLogicalGroup);
          }
        } else {
          //There should definietly be a closing parenthesis. An earlier step should have caught this already though.
          logger.error("lib.search:buildLogicalGroups::No close paranethesis found.", criteria);
          throw Error("No close paranethesis found.");
        }

      } else {
        //Group does not have any parenthesis
        endIdx = findNextIdxOfStartingParenthesisOrEnd(criteriaToInvestigate)
      }

      if (endIdx !== null) {
        //Assining the found criteria to the logical group
        newLogicalGroup.criteria = criteriaToInvestigate.slice(0, endIdx + 1);
        //The last logical concatenation of the criteria is the one for the group.
        /*
          Example (A or B) and (C or D) and (E or F)
          Criteria rows: Aor, Band, Cor, Dand, Eor, Fnull
          This means, group (A or B) has "and" on group level
        */
        newLogicalGroup.logicalConcatenation = (<Criterion>_.last(newLogicalGroup.criteria)).logicalConcatenation;
        logicalGroup.logicalGroups.push(newLogicalGroup);
        nextIdxOfCriteriaToInvestigate = nextIdxOfCriteriaToInvestigate + endIdx + 1;
      } else {
        //Again, this should not happen. But hey, let's keep it as safeguard.
        logger.error("lib.search:buildLogicalGroupsBasedOnParenthesis::No close paranethesis found.", criteria);
        throw Error("No close paranethesis found.");
      }
    }
    logicalGroup = logicalGroupStack.pop();
  }
  return rootLogicalGroup;
}


/**
 * This is the second step in generating the mongodb query.
 * Here we are generating the actual mongodb queries for all logical groups.
 * @param logicalGroup The root.
 * @returns Same object as the input object but with all logicalGroups having their queries populated.
 */
export function buildMongooseQueriesOnLogicalGroups(logicalGroup: LogicalGroup): LogicalGroup {
  //The stack for remembering what groups to check on.
  const stack: LogicalGroups = [];

  //The current logical group we're looking at.
  let curr: LogicalGroup | null | undefined = logicalGroup;
  stack.push(curr);

  while (curr && stack.length > 0) {

    while (curr) {
      //We're pushing items to the stack in reverse order to be able to traverse the tree in the right order.
      //I suggest to draw this up on a piece of paper -- it should get clearer then.
      const lastIdx = curr.logicalGroups.length - 1;
      for (let i = lastIdx; i >= 0; i--) {
        const group = curr.logicalGroups[i];
        stack.push(group);
      }

      if (curr.logicalGroups.length > 0) {
        //We need to investigate if the last group of the stack has children
        //If so, we're going to add those to the stack again.
        curr = stack[stack.length - 1];
      } else {
        //If there are no children, we arrived at a leaf of the tree
        curr = null;
      }

    }

    curr = stack.pop();
    if (curr) {
      //The query we will assign to the current logicalGroup (curr)
      let query = {};
      //Are there children groups?
      if (curr.logicalGroups.length > 0) {
        //Each logical group has the last criterion's logical operator stored as it's logicalConcatenation.

        //We will need the previous logical concatenation to build up the queries.
        /*
          Example: A or B and C will be represented in the criterion as
          Aor, Band, Cnull
          and will have to result in query
          $and:[
            $or: [{A,B}],
            $and: [C]   side note: this doesnt have to be an array, but it makes things easier.
          ]
          When going through this in a loop, we need to know what logical operator each condition has.
          Obviously, even B is stored with "and", it actually needs "or" > we need to use the previous one.
          The first element simply gets it's assigned one. So A has "or".
        */
        let previousLogicalConcat = curr.logicalGroups[0].logicalConcatenation;
        //lastAdded is described in the attachQueryToQuery function.
        let lastAddedLogicalConcat = previousLogicalConcat;

        if (previousLogicalConcat) {
          //This should always be the case. If it's not there is either an error in the code or the criteria are not created correctly.
          for (const childrenGroup of curr.logicalGroups) {
            query = attachQueryToQuery(previousLogicalConcat, lastAddedLogicalConcat, query, childrenGroup.query);

            lastAddedLogicalConcat = previousLogicalConcat;
            previousLogicalConcat = childrenGroup.logicalConcatenation;
          }
        } else {
          //There is only one condition, for example country = "India". In this case there is no logical concatenation.
          query = convertLogicalGroupCriteriaToMongooseQuery(curr.criteria);
        }


      } else {
        //If there are no child groups, we're just creating the mongoose query based on the criteria.
        //This also means we're looking at a leaf of the tree.
        query = convertLogicalGroupCriteriaToMongooseQuery(curr.criteria);
      }

      curr.query = query;
    }

  }
  return logicalGroup;
}


/**
 * Finds the criteria array index of the corresponding closing parenthesis of the first open parenthesis found.
 * @param criteria
 * @returns Returns null in case no closing parenthesis is found.
 */
export function findIdxOfClosingParenthesis(criteria: Criteria): number | null {

  let criterionIdx = 0;
  let parenthesisCount = 0;
  for (const criterion of criteria) {
    //The logic is based on the fact that the parenthesis sum of opening and closing breakets
    //needs to be 0.
    parenthesisCount += criterion.startParenthesisCount;
    parenthesisCount -= criterion.endParenthesisCount;

    if (parenthesisCount === 0) {
      return criterionIdx;
    }
    criterionIdx++;
  }

  return null;
}

/**
 * Finds the next index of a starting parenthesis. If there is no parenthesis it will return
 * the index of the last element.
 * @param criteria
 */
export function findNextIdxOfStartingParenthesisOrEnd(criteria: Criteria): number {
  let criterionIdx = -1;

  for (const criterion of criteria) {
    criterionIdx++;
    if (criterion.startParenthesisCount > 0) {
      return criterionIdx;
    }
  }

  return criterionIdx;
}


/**
 * Creates a logical group
 * @param level
 * @param logicalConcatenation
 */
export function createLogicalGroup(level?: number, logicalConcatenation?: LogicalConcatenation): LogicalGroup {
  return {
    logicalConcatenation: logicalConcatenation ? logicalConcatenation : null,
    logicalGroups: [],
    criteria: [],
    level: _.isNumber(level) ? level : -1
  }
}

/**
 * Creates a query based on the passed criteria
 * @param criteria
 */
export function convertLogicalGroupCriteriaToMongooseQuery(criteria: Criteria): any {
  let query: any = {};

  if (criteria.length > 0) {
    //For why we need the previous one, check out explanation in buildMongooseQueriesOnLogicalGroups.
    let previousLogicalConcat = criteria[0].logicalConcatenation;
    let lastAddedLogicalConcat = previousLogicalConcat;

    if (previousLogicalConcat) {

      for (const criterion of criteria) {
        const criterionQuery = convertCriterionToCondition(criterion);

        query = attachQueryToQuery(previousLogicalConcat, lastAddedLogicalConcat, query, criterionQuery);
        lastAddedLogicalConcat = previousLogicalConcat;
        previousLogicalConcat = criterion.logicalConcatenation;
      }
    } else {
      query = convertCriterionToCondition(criteria[0]);
    }

  } else {
    //empty criteria results with empty query
    query = {};
  }

  return query;
}


/**
 *
 * @param logicalConcat Will wrap the existing query with this logical operator and add the new query (attachQuery)
 * @param lastAddedLogicalConcat This is needed to identify a switch of logical operators.
 * Look at the following example to understand why that is necessary.
 * Example: A or B and C or D needs to end up in
 * $or: [
 *  $and: [
 *    $or: [A,B]
 *    $and: [C]
 *  $or: [D]
 * ]
 * @param oldQuery
 * @param attachQuery
 */
export function attachQueryToQuery(logicalConcat: LogicalConcatenation, lastAddedLogicalConcat: LogicalConcatenation, oldQuery: any, attachQuery: any): any {
  //We will add stuff to the query. As a standard practice, we're not changing the one that is passed into the function.
  let query: any = _.cloneDeep(oldQuery);

  if (logicalConcat) {
    //The mongodb query needs to have the operators with a $ sign.
    //$or $and, etc
    let logicalConcatAttribute = `$${logicalConcat.toLowerCase()}`;

    if (logicalConcat !== lastAddedLogicalConcat) {
      //If the previous added is different to the current, go one level up
      /*
        Example
        A or B and C
        1) $or: [A,B]
        2) $and: [
             $or: [A,B],
             $and: [C]
           ]
      */
      let newQuery: any = {};
      newQuery[logicalConcatAttribute] = [query];
      query = newQuery;
    }

    let logicalArray = query[logicalConcatAttribute];

    if (logicalArray === undefined) {
      logicalArray = [];
      query[logicalConcatAttribute] = logicalArray;
    }
    logicalArray.push(attachQuery);

  } else {
    //If no logicalConcat was passed into the function then there is no logical concatenation as wrapper needed.
    query = attachQuery;
  }

  return query;
}

/**
 * Converts one criterion into an actual mongoose condition
 * @param criterion
 */
export function convertCriterionToCondition(criterion: Criterion): any {
  let condition: any = {};
  const operator = criterion.operator;

  switch (operator) {
    case "=":
      condition[criterion.attributeName] = { $eq: criterion.values[0] };
      break;

    case "<>":
      condition[criterion.attributeName] = { $ne: criterion.values[0] };
      break;

    case ">":
      condition[criterion.attributeName] = { $gt: criterion.values[0] };
      break;

    case "<":
      condition[criterion.attributeName] = { $lt: criterion.values[0] };
      break;

    case ">=":
      condition[criterion.attributeName] = { $gte: criterion.values[0] };
      break;

    case "<=":
      condition[criterion.attributeName] = { $lte: criterion.values[0] };
      break;

    case "In List":
    case "in list":
      condition[criterion.attributeName] = { $in: criterion.values };
      break;

    case "Not In List":
    case "not in list":
      condition[criterion.attributeName] = { $nin: criterion.values };
      break;

    case "Contains":
    case "contains":
      condition[criterion.attributeName] = new RegExp(`.*${criterion.values[0]}.*`, 'i');
      break;

    case "Days After":
    case "days after":
    case "Days Before":
    case "days before": {
      condition = buildDaysRangeCondition(criterion, operator);
      break;
    }

    default:
      const errorStr = `Operator not supported ${operator}`;
      logger.error(`lib.search:convertCriterionToCondition::${errorStr}`, criterion);
      throw new AppException(errorStr);
  }

  return condition;
}

/**
 *
 * @param condition An already existing condition; not null
 * @param criterion The criterion
 * @param operator "Days After", "days after", "Days Before" or "days before"
 */
export function buildDaysRangeCondition(criterion: Criterion, operator: Operator): any {
  const days = criterion.values[0];
  const startDate = new Date();
  const endDate = new Date();
  if (operator === "Days After" || operator === "days after") {
    endDate.setDate(startDate.getDate() + days);
  }
  else if (operator === "Days Before" || operator === "days before") {
    startDate.setDate(startDate.getDate() - days);
  }
  else {
    const errStr = `This operator is not supported for this function: ${operator}`;
    logger.error(errStr, criterion)
    throw new AppException(errStr)
  }


  const startDateNoYear = generateDateNoYearString(startDate);
  const endDateNoYear = generateDateNoYearString(endDate);

  const startDateCondition: any = {};
  startDateCondition[`${criterion.attributeName}NoYear`] = { $gte: startDateNoYear };
  const endDateCondition: any = {}
  endDateCondition[`${criterion.attributeName}NoYear`] = { $lte: endDateNoYear };

  return {
    $and: [
      startDateCondition,
      endDateCondition
    ]
  }
}
