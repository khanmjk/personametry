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
  
  // --- FOUNDATION (Life & Analysis) ---
  {
    path: '/sleep',
    name: 'Sleep',
    icon: 'experiment',
    component: './Sleep',
  }, // P0
  {
    path: '/individual',
    name: 'Individual',
    icon: 'heart',
    component: './Individual',
  }, // P2
  {
    path: '/personas',
    name: 'Personas',
    icon: 'team',
    component: './Personas',
  }, // P1/P4/P5
  {
    path: '/work',
    name: 'Work',
    icon: 'schedule',
    component: './Work',
  }, // P3

  {
    path: '/gains-losses',
    name: 'Gains/Losses',
    icon: 'rise',
    component: './GainsLosses',
  },
  {
    path: '/alltime',
    name: 'All Time Insights',
    icon: 'history',
    component: './AllTime',
  },

  // --- MACHINE LEARNING (Advanced Intelligence) ---
  {
    path: '/machine-learning',
    name: 'ML Goal Optimizer',
    icon: 'robot',
    component: './MachineLearning',
  },
  {
    path: '/anomaly-detection',
    name: 'ML Anomaly Detector',
    icon: 'alert',
    component: './AnomalyDetection',
  },

  // --- DATA DIVING (Raw Access) ---
  {
    path: '/playground',
    name: 'Data Nerds Playground',
    icon: 'experiment',
    component: './Playground',
  },

  // --- DEVELOPER (System) ---
  {
    path: '/about',
    name: 'About: Developer',
    icon: 'infoCircle',
    component: './About',
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
