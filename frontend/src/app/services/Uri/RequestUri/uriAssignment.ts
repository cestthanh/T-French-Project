import { uriConfig } from '../uriConfig';

export class uriAssignment {
  static LIST = uriConfig.ASSIGNMENT;
  static CREATE = uriConfig.ASSIGNMENT;
  static MY_SUBMISSIONS = uriConfig.ASSIGNMENT + '/my-submissions';

  static DETAIL = (id: number) => `${uriConfig.ASSIGNMENT}/${id}`;
  static UPDATE = (id: number) => `${uriConfig.ASSIGNMENT}/${id}`;
  static DELETE = (id: number) => `${uriConfig.ASSIGNMENT}/${id}`;
  static SUBMIT = (id: number) => `${uriConfig.ASSIGNMENT}/${id}/submit`;
  static GRADE = (assignmentId: number, submissionId: number) =>
    `${uriConfig.ASSIGNMENT}/${assignmentId}/submissions/${submissionId}/grade`;
}
