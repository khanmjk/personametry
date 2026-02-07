import { LinkOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history, Link } from '@umijs/max';
import React, { useEffect } from 'react';
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
import { getLastRefreshedTime } from '@/services/personametryService';
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
 * Error Boundary Wrapper Component
 * Captures ChunkLoadErrors and reloads the page once to fix version mismatches.
 */
const GlobalErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const isChunkError = /Loading chunk [\d]+ failed/.test(event.message) || /Loading CSS chunk [\d]+ failed/.test(event.message);
      
      if (isChunkError) {
        event.preventDefault();
        const lastReload = sessionStorage.getItem('chunk_reload_ts');
        const now = Date.now();
        
        // Only reload if we haven't reloaded recently (e.g., within 10 seconds) to prevent loops
        if (!lastReload || now - parseInt(lastReload) > 10000) {
          console.warn('Chunk load error detected. Reloading page...');
          sessionStorage.setItem('chunk_reload_ts', now.toString());
          window.location.reload();
        }
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return <>{children}</>;
};

/**
 * UmiJS Root Container - wraps the entire application
 * This is the right place to put global providers like YearContext
 * @see https://umijs.org/docs/api/runtime-config#rootcontainer
 */
export function rootContainer(container: React.ReactNode) {
  return (
    <GlobalErrorBoundary>
      <YearProvider>{container}</YearProvider>
    </GlobalErrorBoundary>
  );
}

// Personametry Layout Configuration
export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  return {
    // Center the global year selector in the header (hidden on Playground)
    actionsRender: () => {
      const isPlayground = history.location.pathname === '/playground';
      
      // Get refresh time safely
      // We need to import it properly or use a hook if reactivity is needed. 
      // Since app.tsx is a bit static, we can try to get it if loaded.
      // However, data might not be loaded yet. 
      // A better place might be the Footer, but let's try to add it next to the selector if we can.
      // For now, let's just use the service getter directly.
      const lastRefreshed = getLastRefreshedTime();
      const refreshedDate = lastRefreshed ? new Date(lastRefreshed).toLocaleString() : '';

      if (isPlayground) return []; // Playground has its own filters
      return [
        <div key="year-selector" style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <GlobalYearSelector />
          {refreshedDate && (
             <span style={{ fontSize: '10px', color: '#888', marginLeft: '16px', whiteSpace: 'nowrap' }}>
               Refreshed: {refreshedDate}
             </span>
          )}
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
