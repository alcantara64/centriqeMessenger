
import Privilege from '../../enums/Privilege'

interface IRoleBasedUserSecurity {
  privileges: Array<Privilege>;
}

export default IRoleBasedUserSecurity
