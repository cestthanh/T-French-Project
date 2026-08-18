import { uriConfig } from '../uriConfig';

export class uriBlog {
  static LIST = uriConfig.BLOG;

  static DETAIL_BY_SLUG = (slug: string) => `${uriConfig.BLOG}/${slug}`;
}
