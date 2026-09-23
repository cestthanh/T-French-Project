import { uriConfig } from '../uriConfig';

export class uriLead {
  static CREATE = uriConfig.LEAD;
  static LIST = uriConfig.LEAD;
  static STATS = uriConfig.LEAD + '/stats';

  static UPDATE = (id: number) => `${uriConfig.LEAD}/${id}`;
  static DELETE = (id: number) => `${uriConfig.LEAD}/${id}`;
  static CONVERT = (id: number) => `${uriConfig.LEAD}/${id}/convert`;
}
