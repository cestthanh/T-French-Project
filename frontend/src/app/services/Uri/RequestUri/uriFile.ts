import { uriConfig } from '../uriConfig';

export class uriFile {
  static UPLOAD = uriConfig.FILE;

  static DOWNLOAD = (publicId: string) => `${uriConfig.FILE}/${publicId}`;
  static INFO = (publicId: string) => `${uriConfig.FILE}/${publicId}/info`;
}
