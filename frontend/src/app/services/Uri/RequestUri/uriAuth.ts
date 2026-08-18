import { uriConfig } from '../uriConfig';

export class uriAuth {
  static REGISTER = uriConfig.AUTH + 'register';
  static LOGIN = uriConfig.AUTH + 'login';
  static ME = uriConfig.AUTH + 'me';
}
