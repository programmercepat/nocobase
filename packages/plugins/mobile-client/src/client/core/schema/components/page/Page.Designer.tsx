import { GeneralSchemaDesigner, SchemaSettings, useDesignable } from '@nocobase/client';
import React from 'react';
import { useTranslation } from '../../../../locale';
import { useFieldSchema } from '@formily/react';
import { findGridSchema } from '../../helpers';

export const PageDesigner = (props) => {
  const { showBack } = props;
  const { t } = useTranslation();
  const fieldSchema = useFieldSchema();
  const { dn } = useDesignable();
  const headerSchema = fieldSchema?.properties?.['header'];
  const tabsSchema = fieldSchema?.properties?.['tabs'];

  return (
    <GeneralSchemaDesigner draggable={false}>
      <SchemaSettings.SwitchItem
        checked={!!headerSchema}
        title={t('Enable Header')}
        onChange={async (v) => {
          if (v) {
            await dn.insertAfterBegin({
              type: 'void',
              name: 'header',
              'x-component': 'MHeader',
              'x-designer': 'MHeader.Designer',
              'x-component-props': {
                title: fieldSchema.parent['x-component-props']?.name,
                showBack,
              },
            });
          } else {
            await dn.remove(headerSchema);
          }
          dn.refresh();
        }}
      />
      <SchemaSettings.SwitchItem
        checked={!!tabsSchema}
        title={t('Enable Tabs')}
        onChange={async (v) => {
          if (v) {
            const gridSchema = findGridSchema(fieldSchema);
            await dn.remove(gridSchema);
            await dn.insertBeforeEnd({
              type: 'void',
              name: 'tabs',
              'x-component': 'Tabs',
              'x-component-props': {},
              'x-initializer': 'TabPaneInitializers',
              'x-initializer-props': {
                gridInitializer: 'MBlockInitializers',
              },
              properties: {
                tab1: {
                  type: 'void',
                  title: '{{t("Untitled")}}',
                  'x-component': 'Tabs.TabPane',
                  'x-designer': 'Tabs.Designer',
                  'x-component-props': {},
                  properties: {
                    grid: gridSchema,
                  },
                },
              },
            });
          } else {
            const gridSchema = findGridSchema(tabsSchema.properties[Object.keys(tabsSchema.properties)[0]]);
            await dn.remove(tabsSchema);
            await dn.insertBeforeEnd(gridSchema, {});
          }
          dn.refresh();
        }}
      />
      <SchemaSettings.Divider />
      <SchemaSettings.Template componentName="MPage" needRender />
    </GeneralSchemaDesigner>
  );
};