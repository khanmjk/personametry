import { LinkOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history, Link } from '@umijs/max';
import React from 'react';
import {
  AvatarDropdown,
  AvatarName,
  Footer,
  Question,
  SelectLang,
} from '@/components';
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

// Personametry Layout Configuration
export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  return {
    // Clean header - remove unnecessary actions
    actionsRender: () => [],
    // Simple avatar
    avatarProps: {
      src: initialState?.currentUser?.avatar,
      title: <AvatarName />,
      render: (_, avatarChildren) => (
        <AvatarDropdown>{avatarChildren}</AvatarDropdown>
      ),
    },
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
    // Clean children - no settings drawer for executive look
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
