import { uriConfig } from '../uriConfig';

export class uriCourse {
  static LIST = uriConfig.COURSE;
  static CREATE = uriConfig.COURSE;
  static MY_COURSES = uriConfig.COURSE + '/my';

  static DETAIL = (id: number) => `${uriConfig.COURSE}/${id}`;
  static ENROLL = (id: number) => `${uriConfig.COURSE}/${id}/enroll`;
  static TOGGLE_PUBLISH = (id: number) => `${uriConfig.COURSE}/${id}/publish`;
}
