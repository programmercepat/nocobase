import { css } from '@emotion/css';
import { ISchema, observer } from '@formily/react';
import { error } from '@nocobase/utils/client';
import { Button, Dropdown, Menu, MenuProps, Switch } from 'antd';
import classNames from 'classnames';
import React, { createContext, useContext, useMemo, useState } from 'react';
import { Icon } from '../icon';
import { useCompile, useDesignable } from '../schema-component/hooks';
import './style.less';
import {
  SchemaInitializerButtonProps,
  SchemaInitializerItemComponent,
  SchemaInitializerItemOptions,
  SchemaInitializerItemProps,
} from './types';

const menuClassName = css`
  background-color: transparent;
  border-right: none;

  .ant-menu-item {
    padding: 0;
    margin: 0;
    line-height: 1.5715;
    height: fit-content;
    :active,
    :hover {
      color: currentColor;
      background-color: transparent;
    }
  }
`;

const defaultWrap = (s: ISchema) => s;

export const SchemaInitializerItemContext = createContext(null);
export const SchemaInitializerButtonContext = createContext<any>({});

export const SchemaInitializer = () => null;

const menuItemGroupCss = 'nb-menu-item-group';

SchemaInitializer.Button = observer(
  (props: SchemaInitializerButtonProps) => {
    const {
      title,
      insert,
      wrap = defaultWrap,
      items = [],
      insertPosition = 'beforeEnd',
      dropdown,
      component,
      style,
      icon,
      onSuccess,
      ...others
    } = props;
    const compile = useCompile();
    const { insertAdjacent, findComponent, designable } = useDesignable();
    const [visible, setVisible] = useState(false);
    const insertSchema = (schema) => {
      if (props.insert) {
        props.insert(wrap(schema));
      } else {
        insertAdjacent(insertPosition, wrap(schema), { onSuccess });
      }
    };

    const renderItems = (items: any) => {
      return items
        .filter((v: any) => {
          return v && (v?.visible ? v.visible() : true);
        })
        ?.map((item: any, indexA: number) => {
          if (item.type === 'divider') {
            return { type: 'divider', key: item.key || `item-${indexA}` };
          }
          if (item.type === 'item' && item.component) {
            const Component = findComponent(item.component);
            if (!Component) {
              error(`SchemaInitializer: component "${item.component}" not found`);
              return null;
            }
            item.key = `${item.key || item.title}-${indexA}`;
            return {
              key: item.key,
              label: (
                <SchemaInitializerItemContext.Provider
                  key={item.key}
                  value={{
                    index: indexA,
                    item,
                    info: item,
                    insert: insertSchema,
                  }}
                >
                  <Component
                    {...item}
                    item={{
                      ...item,
                      title: compile(item.title),
                    }}
                    insert={insertSchema}
                  />
                </SchemaInitializerItemContext.Provider>
              ),
            };
          }
          if (item.type === 'itemGroup') {
            return (
              !!item.children?.length && {
                type: 'group',
                key: item.key || `item-group-${indexA}`,
                label: compile(item.title),
                title: compile(item.title),
                children: renderItems(item.children),
              }
            );
          }
          if (item.type === 'subMenu') {
            return (
              !!item.children?.length && {
                key: item.key || `item-group-${indexA}`,
                label: compile(item.title),
                title: compile(item.title),
                popupClassName: menuItemGroupCss,
                children: renderItems(item.children),
              }
            );
          }
        });
    };

    const menuItems = useMemo<MenuProps['items']>(() => {
      return renderItems(items);
    }, [items]);

    const menu = useMemo<MenuProps>(() => {
      return {
        style: { maxHeight: '60vh', overflowY: 'auto' },
        items: menuItems,
      };
    }, [menuItems]);

    if (!designable && props.designable !== true) {
      return null;
    }
    return (
      <SchemaInitializerButtonContext.Provider value={{ visible, setVisible }}>
        <Dropdown
          className={classNames('nb-schema-initializer-button')}
          openClassName={`nb-schema-initializer-button-open`}
          overlayClassName={classNames(
            'nb-schema-initializer-button-overlay',
            css`
              .ant-dropdown-menu-item-group-list {
                max-height: 40vh;
                overflow: auto;
              }
            `,
          )}
          open={visible}
          onOpenChange={(visible) => {
            setVisible(visible);
          }}
          {...dropdown}
          menu={menu}
        >
          {component ? (
            component
          ) : (
            <Button
              type={'dashed'}
              style={{
                borderColor: '#f18b62',
                color: '#f18b62',
                ...style,
              }}
              {...others}
              icon={<Icon type={icon as string} />}
            >
              {compile(props.children || props.title)}
            </Button>
          )}
        </Dropdown>
      </SchemaInitializerButtonContext.Provider>
    );
  },
  { displayName: 'SchemaInitializer.Button' },
);

SchemaInitializer.Item = function Item(props: SchemaInitializerItemProps) {
  const { info } = useContext(SchemaInitializerItemContext);
  const compile = useCompile();
  const { items = [], children = info?.title, icon, onClick } = props;

  if (items?.length > 0) {
    const renderMenuItem = (items: SchemaInitializerItemOptions[]) => {
      if (!items?.length) {
        return null;
      }
      return items.map((item, indexA) => {
        if (item.type === 'divider') {
          return { type: 'divider', key: `divider-${indexA}` };
        }
        if (item.type === 'itemGroup') {
          const label = compile(item.title);
          return {
            type: 'group',
            key: item.key || `item-group-${indexA}`,
            label,
            title: label,
            className: menuItemGroupCss,
            children: renderMenuItem(item.children),
          } as MenuProps['items'][0];
        }
        if (item.type === 'subMenu') {
          const label = compile(item.title);
          return {
            key: item.key || `sub-menu-${indexA}`,
            label,
            title: label,
            children: renderMenuItem(item.children),
          };
        }
        const label = compile(item.title);
        return {
          key: item.key,
          label,
          title: label,
          eventKey: item.key,
          onClick: (info) => {
            item?.clearKeywords?.();
            if (item.onClick) {
              item.onClick({ ...info, item });
            } else {
              onClick({ ...info, item });
            }
          },
        };
      });
    };

    const item = {
      key: info.key,
      label: compile(children),
      icon: typeof icon === 'string' ? <Icon type={icon as string} /> : icon,
      children: renderMenuItem(items),
    };

    return <Menu className={menuClassName} items={[item]} selectable={false}></Menu>;
  }

  const label = compile(children);
  const item = {
    key: info.key,
    label,
    title: label,
    icon: typeof icon === 'string' ? <Icon type={icon as string} /> : icon,
    onClick: (opts) => {
      info?.clearKeywords?.();
      onClick({ ...opts, item: info });
    },
  };

  return <Menu className={menuClassName} items={[item]} selectable={false}></Menu>;
};

SchemaInitializer.itemWrap = (component?: SchemaInitializerItemComponent) => {
  return component;
};

SchemaInitializer.SwitchItem = (props) => {
  return (
    <SchemaInitializer.Item onClick={props.onClick}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {props.title} <Switch style={{ marginLeft: 20 }} size={'small'} checked={props.checked} />
      </div>
    </SchemaInitializer.Item>
  );
};
