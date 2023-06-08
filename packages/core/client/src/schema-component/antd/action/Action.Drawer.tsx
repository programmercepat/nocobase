import { css } from '@emotion/css';
import { observer, RecursionField, useField, useFieldSchema } from '@formily/react';
import { Drawer } from 'antd';
import classNames from 'classnames';
import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { OpenSize } from './';
import { useActionContext } from './hooks';
import { ComposedActionDrawer } from './types';

const openSizeWidthMap = new Map<OpenSize, string>([
  ['small', '30%'],
  ['middle', '50%'],
  ['large', '70%'],
]);
export const ActionDrawer: ComposedActionDrawer = observer(
  (props) => {
    const { footerNodeName = 'Action.Drawer.Footer', ...others } = props;
    const { t } = useTranslation();
    const { visible, setVisible, openSize = 'middle' } = useActionContext();
    const schema = useFieldSchema();
    const field = useField();
    const openSizeFromParent = schema.parent?.['x-component-props']?.['openSize'];
    const finalOpenSize = openSizeFromParent || openSize;
    const footerSchema = schema.reduceProperties((buf, s) => {
      if (s['x-component'] === footerNodeName) {
        return s;
      }
      return buf;
    });
    return (
      <>
        {createPortal(
          <div
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Drawer
              width={openSizeWidthMap.get(finalOpenSize)}
              title={field.title}
              {...others}
              destroyOnClose
              open={visible}
              onClose={() => setVisible(false, true)}
              rootClassName={classNames(
                others.className,
                css`
                  &.nb-action-popup {
                    .ant-drawer-header {
                      display: none;
                    }

                    .ant-drawer-body {
                      padding-top: 14px;
                    }

                    .ant-drawer-content {
                      background: #f0f2f5;
                    }
                  }

                  &.nb-record-picker-selector {
                    .nb-block-item {
                      margin-bottom: 24px;

                      .general-schema-designer {
                        top: -8px;
                        bottom: -8px;
                        left: -8px;
                        right: -8px;
                      }
                    }
                  }
                `,
              )}
              footer={
                footerSchema && (
                  <div
                    className={css`
                      display: flex;
                      justify-content: flex-end;
                      width: 100%;

                      .ant-btn {
                        margin-right: 8px;
                      }
                    `}
                  >
                    <RecursionField
                      basePath={field.address}
                      schema={schema}
                      onlyRenderProperties
                      filterProperties={(s) => {
                        return s['x-component'] === footerNodeName;
                      }}
                    />
                  </div>
                )
              }
            >
              <RecursionField
                basePath={field.address}
                schema={schema}
                onlyRenderProperties
                filterProperties={(s) => {
                  return s['x-component'] !== footerNodeName;
                }}
              />
            </Drawer>
          </div>,
          document.body,
        )}
      </>
    );
  },
  { displayName: 'ActionDrawer' },
);

ActionDrawer.Footer = observer(
  () => {
    const field = useField();
    const schema = useFieldSchema();
    return <RecursionField basePath={field.address} schema={schema} onlyRenderProperties />;
  },
  { displayName: 'ActionDrawer.Footer' },
);

export default ActionDrawer;
