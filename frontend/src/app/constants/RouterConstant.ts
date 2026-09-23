/**
 * Every route path in the application, in one place.
 *
 * Values carry no leading slash so they can be dropped straight into a
 * `Routes` config. Templates keep literal `routerLink="/…"` strings.
 */
export const RouterConstant = {
  // ─── Public ────────────────────────────────────────────────────────────────
  home: 'home',
  courses: 'courses',
  blog: 'blog',

  // ─── Auth ──────────────────────────────────────────────────────────────────
  auth: 'auth',
  signIn: 'auth/login',
  signUp: 'auth/register',

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: 'dashboard',
  assignments: 'dashboard/assignments',
  resources: 'dashboard/resources',
  bookings: 'dashboard/bookings',
  classes: 'dashboard/classes',
  quizzes: 'dashboard/quizzes',
  profile: 'dashboard/profile',
  admin: 'dashboard/admin',
};

/**
 * Segments used inside `RouterModule.forChild()`, where paths are relative to
 * the parent route and therefore cannot reuse the absolute values above.
 */
export const RouteSegment = {
  empty: '',
  wildcard: '**',
  byId: ':id',
  bySlug: ':slug',
  login: 'login',
  register: 'register',
  assignments: 'assignments',
  resources: 'resources',
  bookings: 'bookings',
  classes: 'classes',
  quizzes: 'quizzes',
  profile: 'profile',
  admin: 'admin',
};
