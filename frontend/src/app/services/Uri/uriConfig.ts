import { environment } from 'src/environments/environment';

/**
 * Base segments every endpoint constant is built from.
 * Change the host in `src/environments/*` — never here.
 */
export const apiUrl = environment.apiUrl;

export const uriConfig = {
  AUTH: apiUrl + '/auth/',
  COURSE: apiUrl + '/courses',
  ASSIGNMENT: apiUrl + '/assignments',
  RESOURCE: apiUrl + '/resources',
  BOOKING: apiUrl + '/bookings',
  BLOG: apiUrl + '/blog',
  ADMIN: apiUrl + '/admin',
  PROFILE: apiUrl + '/profile',
  DASHBOARD: apiUrl + '/dashboard',
  FILE: apiUrl + '/files',
};
