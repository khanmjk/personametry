import type { ProLayoutProps } from '@ant-design/pro-components';

/**
 * Personametry Dashboard - Default Settings
 * Executive-grade visual configuration
 */
const Settings: ProLayoutProps & {
  pwa?: boolean;
  logo?: string;
} = {
  navTheme: 'light',
  // Teal primary color for executive look
  colorPrimary: '#0D7377',
  layout: 'mix',
  contentWidth: 'Fluid',
  fixedHeader: true,
  fixSiderbar: true,
  colorWeak: false,
  title: 'Personametry',
  pwa: false,
  // Custom logo - P icon
  logo: 'https://img.icons8.com/fluency/96/p.png',
  iconfontUrl: '',
  token: {
    // Executive color tokens
    sider: {
      colorMenuBackground: '#ffffff',
      colorTextMenuSelected: '#0D7377',
      colorBgMenuItemSelected: '#E6F7F8',
    },
    header: {
      colorBgHeader: '#ffffff',
      colorTextMenu: '#333333',
    },
  },
};

export default Settings;

