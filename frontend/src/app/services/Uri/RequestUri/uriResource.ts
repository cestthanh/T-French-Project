import { uriConfig } from '../uriConfig';

export class uriResource {
  static LIST = uriConfig.RESOURCE;
  static CREATE = uriConfig.RESOURCE;
  static CATEGORIES = uriConfig.RESOURCE + '/categories';

  static UPDATE = (id: number) => `${uriConfig.RESOURCE}/${id}`;
  static DELETE = (id: number) => `${uriConfig.RESOURCE}/${id}`;
}
