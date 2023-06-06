import { ApiOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Dropdown, MenuProps, Tooltip } from 'antd';
import _ from 'lodash';
import React, { useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { useACLRoleContext } from '../acl/ACLProvider';
import { ActionContext, useCompile } from '../schema-component';
import { SettingsCenterContext, getPluginsTabs } from './index';

export const PluginManagerLink = () => {
  const { t } = useTranslation();
  const history = useHistory();
  return (
    <Tooltip title={t('Plugin manager')}>
      <Button
        icon={<ApiOutlined />}
        title={t('Plugin manager')}
        onClick={() => {
          history.push('/admin/pm/list/');
        }}
      />
    </Tooltip>
  );
};

const getBookmarkTabs = _.memoize((data) => {
  const bookmarkTabs = [];
  data.forEach((plugin) => {
    const tabs = plugin.tabs;
    tabs.forEach((tab) => {
      tab.isBookmark && tab.isAllow && bookmarkTabs.push({ ...tab, path: `${plugin.key}/${tab.key}` });
    });
  });
  return bookmarkTabs;
});
export const SettingsCenterDropdown = () => {
  const { snippets = [] } = useACLRoleContext();
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();
  const compile = useCompile();
  const history = useHistory();
  const itemData = useContext(SettingsCenterContext);
  const pluginsTabs = getPluginsTabs(itemData, snippets);
  const bookmarkTabs = getBookmarkTabs(pluginsTabs);
  const menu = useMemo<MenuProps>(() => {
    return {
      items: [
        ...bookmarkTabs.map((tab) => ({
          key: `/admin/settings/${tab.path}`,
          label: compile(tab.title),
        })),
        { type: 'divider' },
        {
          key: '/admin/settings',
          label: t('All plugin settings'),
        },
      ],
      onClick({ key }) {
        history.push(key);
      },
    };
  }, [bookmarkTabs, history]);

  return (
    <ActionContext.Provider value={{ visible, setVisible }}>
      <Dropdown placement="bottom" menu={menu}>
        <Button
          icon={<SettingOutlined />}
          // title={t('All plugin settings')}
        />
      </Dropdown>
    </ActionContext.Provider>
  );
};
