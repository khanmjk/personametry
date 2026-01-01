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
  // Sleep / Life Constraints
  {
    path: '/sleep',
    name: 'Sleep',
    icon: 'experiment',
    component: './Sleep',
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
  // Gains & Losses (Comparison)
  {
    path: '/work',
    name: 'Work',
    icon: 'briefcase',
    component: './Work',
  },
  {
    path: '/gains-losses',
    name: 'Gains/Losses',
    icon: 'rise',
    component: './GainsLosses',
  },
  // All Time / Historical Overview
  {
    path: '/alltime',
    name: 'All Time',
    icon: 'history',
    component: './AllTime',
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

