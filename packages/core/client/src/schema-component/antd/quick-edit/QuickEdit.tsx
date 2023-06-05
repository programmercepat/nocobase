import React from 'react';
import { EditOutlined } from '@ant-design/icons';
import { Popover, Tooltip } from 'antd';
import { useField, observer, useFieldSchema, RecursionField } from '@formily/react';
import { EllipsisWithTooltip } from '../input';
import { FormItem, FormLayout } from '@formily/antd';
import CollectionField from '../../../collection-manager/CollectionField';
import { useCollectionManager } from '../../../collection-manager';
import { FormProvider } from '../../core';

export const QuickEdit = observer((props) => {
  const field: any = useField();
  const { getCollectionJoinField } = useCollectionManager();
  const fieldSchema = useFieldSchema();
  const collectionField = getCollectionJoinField(fieldSchema['x-collection-field']);
  const schema: any = {
    name: fieldSchema.name,
    'x-collection-field': fieldSchema['x-collection-field'],
    'x-component': 'CollectionField',
    default: field.value,
    'x-component-props': {
      onChange: async (e) => {
        const data = e.target?.value;
        if (['hasMany', 'belongsToMany'].includes(collectionField.type)) {
          const result = field.value || [];
          result.push(data);
          field.value = result;
        } else {
          if (['circle', 'point', 'richText', 'polygon', 'lineString'].includes(collectionField.interface)) {
            field.value = e;
          } else {
            field.value = data;
          }
        }
        field.onInput(field.value);
      },
    },
  };
  const content = (
    <div style={{ width: '100%', height: '100%', minWidth: 300 }}>
      <FormProvider>
        <FormLayout feedbackLayout="popover">
          <RecursionField schema={schema} name={fieldSchema.name} />
        </FormLayout>
      </FormProvider>
    </div>
  );

  return (
    <Popover content={content} trigger="click">
      <span style={{ maxHeight: 30, display: 'block', cursor: 'pointer' }}>
        <Tooltip
          title={field.selfErrors.length > 0 ? field.selfErrors : null}
          overlayInnerStyle={{ color: 'red' }}
          color="white"
        >
          <EditOutlined
            style={{ marginRight: '8px', lineHeight: '35px', float: 'left', color: !field.valid ? 'red' : null }}
          />
        </Tooltip>
        <EllipsisWithTooltip ellipsis>{field.value}</EllipsisWithTooltip>
        <FormItem {...props} wrapperStyle={{ visibility: 'hidden' }} feedbackLayout="none">
          <CollectionField value={field.value ?? null} />
        </FormItem>
      </span>
    </Popover>
  );
});