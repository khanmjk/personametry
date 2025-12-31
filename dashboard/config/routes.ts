/**
 * @name Personametry Routes Configuration
 * @description Dashboard routes for personal telemetry visualization
 */
export default [
  {
    path: '/user',
    layout: false,
    routes: [
      {
        name: 'login',
        path: '/user/login',
        component: './user/login',
      },
    ],
  },
  // Main Dashboard
  {
    path: '/dashboard',
    name: 'Dashboard',
    icon: 'dashboard',
    component: './Personametry',
  },
  // Trend Analysis
  {
    path: '/trends',
    name: 'Trends',
    icon: 'lineChart',
    component: './Trends',
  },
  // Personas Deep Dive
  {
    path: '/personas',
    name: 'Personas',
    icon: 'team',
    component: './Personas',
  },
  // RAGE Scorecard
  {
    path: '/scorecard',
    name: 'Scorecard',
    icon: 'trophy',
    component: './Scorecard',
  },
  // Home redirect
  {
    path: '/',
    redirect: '/dashboard',
  },
  // 404
  {
    component: '404',
    layout: false,
    path: './*',
  },
];
