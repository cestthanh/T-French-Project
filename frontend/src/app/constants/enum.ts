/** Roles as returned by the API's `UserRole` enum. */
export enum UserRole {
  Admin = 'Admin',
  Teacher = 'Teacher',
  Student = 'Student',
}

/** localStorage keys owned by the app. */
export const StorageKey = {
  token: 'tf_token',
  user: 'tf_user',
};

/** Default page size for the public blog listing. */
export const PageSize = {
  blog: 9,
};
