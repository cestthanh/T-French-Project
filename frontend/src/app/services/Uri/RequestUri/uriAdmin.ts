import { uriConfig } from '../uriConfig';

export class uriAdmin {
  static STATS = uriConfig.ADMIN + '/stats';
  static USERS = uriConfig.ADMIN + '/users';
  static BLOG = uriConfig.ADMIN + '/blog';

  static CHANGE_ROLE = (userId: number) => `${uriConfig.ADMIN}/users/${userId}/role`;
  static DELETE_USER = (userId: number) => `${uriConfig.ADMIN}/users/${userId}`;
  static BLOG_DETAIL = (id: number) => `${uriConfig.ADMIN}/blog/${id}`;
  static UPDATE_BLOG = (id: number) => `${uriConfig.ADMIN}/blog/${id}`;
  static TOGGLE_PUBLISH = (id: number) => `${uriConfig.ADMIN}/blog/${id}/publish`;
  static DELETE_BLOG = (id: number) => `${uriConfig.ADMIN}/blog/${id}`;
}
