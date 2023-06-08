import { css } from '@emotion/css';
import { error } from '@nocobase/utils/client';
import { Dropdown, MenuProps, Modal } from 'antd';
import React, { createContext, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { useACLRoleContext, useAPIClient, useCurrentUserContext } from '..';
import { useCurrentAppInfo } from '../appInfo/CurrentAppInfoProvider';
import { useChangePassword } from './ChangePassword';
import { useEditProfile } from './EditProfile';
import { useLanguageSettings } from './LanguageSettings';
import { useSwitchRole } from './SwitchRole';
import { useThemeSettings } from './ThemeSettings';

const useApplicationVersion = () => {
  const data = useCurrentAppInfo();
  return useMemo(() => {
    return {
      key: 'version',
      disabled: true,
      label: `Version ${data?.data?.version}`,
    };
  }, [data?.data?.version]);
};

export const DropdownVisibleContext = createContext(null);

export const CurrentUser = () => {
  const history = useHistory();
  const api = useAPIClient();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const { data } = useCurrentUserContext();
  const { allowAll, snippets } = useACLRoleContext();
  const appAllowed = allowAll || snippets?.includes('app');
  const silenceApi = useAPIClient();
  const check = useCallback(async () => {
    return await new Promise((resolve) => {
      const heartbeat = setInterval(() => {
        silenceApi
          .silent()
          .resource('app')
          .getInfo()
          .then((res) => {
            console.log(res);
            if (res?.status === 200) {
              resolve('ok');
              clearInterval(heartbeat);
            }
            return res;
          })
          .catch((err) => {
            error(err);
          });
      }, 3000);
    });
  }, [silenceApi]);
  const divider = useMemo<MenuProps['items'][0]>(() => {
    return {
      type: 'divider',
    };
  }, []);
  const appVersion = useApplicationVersion();
  const editProfile = useEditProfile({ setVisible });
  const changePassword = useChangePassword({ setVisible });
  const switchRole = useSwitchRole();
  const languageSettings = useLanguageSettings();
  const themeSettings = useThemeSettings();
  const controlApp = useMemo<MenuProps['items']>(() => {
    if (!appAllowed) {
      return [];
    }

    return [
      {
        key: 'cache',
        label: t('Clear cache'),
        onClick: async () => {
          await api.resource('app').clearCache();
          window.location.reload();
        },
      },
      {
        key: 'reboot',
        label: t('Reboot application'),
        onClick: async () => {
          Modal.confirm({
            title: t('Reboot application'),
            content: t('The will interrupt service, it may take a few seconds to restart. Are you sure to continue?'),
            okText: t('Reboot'),
            okButtonProps: {
              danger: true,
            },
            onOk: async () => {
              await api.resource('app').reboot();
              await check();
              window.location.reload();
            },
          });
        },
      },
      divider,
    ];
  }, [appAllowed, check]);
  const menu = useMemo<MenuProps>(() => {
    return {
      items: [
        appVersion,
        divider,
        editProfile,
        changePassword,
        divider,
        switchRole,
        languageSettings,
        themeSettings,
        divider,
        ...controlApp,
        {
          key: 'signout',
          label: t('Sign out'),
          onClick: async () => {
            await api.resource('users').signout();
            api.auth.setToken(null);
            history.push('/signin');
          },
        },
      ],
    };
  }, [
    appVersion,
    changePassword,
    controlApp,
    divider,
    editProfile,
    history,
    languageSettings,
    switchRole,
    themeSettings,
  ]);

  return (
    <div style={{ display: 'inline-flex', verticalAlign: 'top' }}>
      <DropdownVisibleContext.Provider value={{ visible, setVisible }}>
        <Dropdown
          open={visible}
          onOpenChange={(visible) => {
            setVisible(visible);
          }}
          menu={menu}
        >
          <span
            className={css`
              max-width: 160px;
              overflow: hidden;
              display: inline-block;
              line-height: 12px;
              white-space: nowrap;
              text-overflow: ellipsis;
            `}
            style={{ cursor: 'pointer', border: 0, padding: '16px', color: 'rgba(255, 255, 255, 0.65)' }}
          >
            {data?.data?.nickname || data?.data?.email}
          </span>
        </Dropdown>
      </DropdownVisibleContext.Provider>
    </div>
  );
};
