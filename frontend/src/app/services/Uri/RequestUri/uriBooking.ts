import { uriConfig } from '../uriConfig';

export class uriBooking {
  static LIST = uriConfig.BOOKING;
  static CREATE = uriConfig.BOOKING;

  static BOOK = (id: number) => `${uriConfig.BOOKING}/${id}/book`;
  static CANCEL = (id: number) => `${uriConfig.BOOKING}/${id}/cancel`;
  static DELETE = (id: number) => `${uriConfig.BOOKING}/${id}`;
}
