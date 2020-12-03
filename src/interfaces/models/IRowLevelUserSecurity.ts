
interface IRowLevelUserSecurity {
  isAdmin: boolean,
  holdingOrgIds: Array<string>,
  memberOrgIds: Array<string>
}

export default IRowLevelUserSecurity
