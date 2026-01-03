import { LinkOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history, Link } from '@umijs/max';
import React from 'react';
import { Divider } from 'antd';
import {
  AvatarDropdown,
  AvatarName,
  Footer,
  Question,
  SelectLang,
} from '@/components';
import GlobalYearSelector from '@/components/GlobalYearSelector';
import { YearProvider } from '@/contexts/YearContext';
import { currentUser as queryCurrentUser } from '@/services/ant-design-pro/api';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';

const isDev = process.env.NODE_ENV === 'development';
const isDevOrTest = isDev || process.env.CI;
const loginPath = '/user/login';

/**
 * @see https://umijs.org/docs/api/runtime-config#getinitialstate
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  loading?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
}> {
  // MVP: Use mock user to bypass authentication
  const mockUser: API.CurrentUser = {
    name: 'Muhammad Khan',
    avatar: 'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png',
    userid: '1',
    email: 'khanmjk@personametry.com',
    signature: 'Personametry Dashboard User',
    title: 'Product Owner',
    group: 'Personametry',
    access: 'admin',
  };

  const fetchUserInfo = async () => mockUser;

  return {
    fetchUserInfo,
    currentUser: mockUser,
    settings: defaultSettings as Partial<LayoutSettings>,
  };
}

/**
 * UmiJS Root Container - wraps the entire application
 * This is the right place to put global providers like YearContext
 * @see https://umijs.org/docs/api/runtime-config#rootcontainer
 */
export function rootContainer(container: React.ReactNode) {
  return <YearProvider>{container}</YearProvider>;
}

// Personametry Layout Configuration
export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  const dividerPaths = new Set(['/playground', '/about']);

  return {
    // Center the global year selector in the header (hidden on Playground)
    actionsRender: () => {
      const isPlayground = history.location.pathname === '/playground';
      if (isPlayground) return []; // Playground has its own filters
      return [
        <div key="year-selector" style={{ display: 'flex', justifyContent: 'center', flex: 1 }}>
          <GlobalYearSelector />
        </div>
      ];
    },
    // Remove avatar - year selector is the main header element now
    avatarProps: undefined,
    // DISABLED: No watermarks for clean executive look
    waterMarkProps: {
      content: '',
    },
    // Clean footer
    footerRender: () => null,
    onPageChange: () => {
      // No auth redirects needed for MVP
    },
    // DISABLED: No background images for clean look
    bgLayoutImgList: [],
    // DISABLED: No dev links
    links: [],
    menuItemRender: (item, defaultDom) => {
      const itemPath = item.path || item.itemPath;
      if (!itemPath || !dividerPaths.has(itemPath)) {
        return defaultDom;
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Divider style={{ margin: '6px 12px' }} />
          {defaultDom}
        </div>
      );
    },
    menuHeaderRender: undefined,
    // Children render - no extra wrapper needed, rootContainer handles provider
    childrenRender: (children) => {
      return <>{children}</>;
    },
    ...initialState?.settings,
  };
};

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request: RequestConfig = {
  baseURL: isDev ? '' : 'https://proapi.azurewebsites.net',
  ...errorConfig,
};
