import { uriConfig } from '../uriConfig';

export class uriProfile {
  static GET = uriConfig.PROFILE;
  static UPDATE = uriConfig.PROFILE;
  static CHANGE_PASSWORD = uriConfig.PROFILE + '/change-password';
}

export class uriDashboard {
  static STATS = uriConfig.DASHBOARD + '/stats';
}
