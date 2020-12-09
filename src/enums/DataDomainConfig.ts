import DataDomainMode from './DataDomainMode'
import DataDomain from './DataDomain'

class DataDomainConfig {

  public static CUSTOMER = {
    attributeName: DataDomain.CUSTOMER,
    name: "Customer",
    businessName: "Customer",
    mode: DataDomainMode.SINGLE
  };

  public static PRODUCT = {
    attributeName: DataDomain.PRODUCT,
    name: "Product",
    businessName: "Product",
    mode: DataDomainMode.SINGLE
  };

  public static REVENUE = {
    attributeName: DataDomain.REVENUE,
    name: "Revenue",
    businessName: "Revenue",
    mode: DataDomainMode.SINGLE
  };

  public static COST = {
    attributeName: DataDomain.COST,
    name: "Cost",
    businessName: "Cost",
    mode: DataDomainMode.MULTI
  };

  public static COMM = {
    attributeName: DataDomain.COMM,
    name: "Communication",
    businessName: "Email Templates & Campaigns",
    mode: DataDomainMode.MULTI
  };

  public static RESP = {
    attributeName: DataDomain.RESP,
    name: "Response",
    businessName: "Feedback Templates & Campaigns",
    mode: DataDomainMode.MULTI
  };

  public static NPS = {
    attributeName: DataDomain.NPS,
    name: "NPS",
    businessName: "NPS Templates & Campaigns",
    mode: DataDomainMode.MULTI
  };

  public static PROFIT_EDGE = {
    attributeName: DataDomain.PROFIT_EDGE,
    name: "Profit Edge",
    businessName: "Profit Edge",
    mode: DataDomainMode.MULTI
  };


  public static MARKET_PLACE = {
    attributeName: DataDomain.MARKET_PLACE,
    name: "Market Place",
    businessName: "Market Place",
    mode: DataDomainMode.MULTI
  };


  /**
   * Converts static attributes to an object where attributeName is the key.
   */
  public static getAsObject() {
    const obj: any = {};

    Object.keys(DataDomainConfig).map((k) => {
      const value = (<any>DataDomainConfig)[k];

      if(value.attributeName) {
        obj[value.attributeName] = {
          name: value.name,
          businessName: value.businessName,
          mode: value.mode
        }
      }

    });

    return obj;
  }


  /**
   * Converts static attributes to an array where attributeName is the content for each element
   */
  public static getAsEnumArray(): Array<string> {
    const list: Array<string> = [];

    Object.keys(DataDomainConfig).map((k) => {
      const value = (<any>DataDomainConfig)[k];

      if(value.attributeName) {
        list.push(value.attributeName)
      }

    });

    return list;
  }



}

export default DataDomainConfig;
