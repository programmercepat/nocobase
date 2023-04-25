import { ArrayCollapse, ArrayItems, FormLayout } from '@formily/antd';
import { Field } from '@formily/core';
import { ISchema, useField, useFieldSchema } from '@formily/react';
import { uid } from '@formily/shared';
import _ from 'lodash';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFilterByTk, useFormBlockContext } from '../../../block-provider';
import {
  useCollection,
  useCollectionFilterOptions,
  useCollectionManager,
  useSortFields,
} from '../../../collection-manager';
import { isTitleField } from '../../../collection-manager/Configuration/CollectionFields';
import { GeneralSchemaDesigner, SchemaSettings, isPatternDisabled, isShowDefaultValue } from '../../../schema-settings';
import { useCompile, useDesignable, useFieldComponentOptions } from '../../hooks';
import { removeNullCondition } from '../filter';
import { FilterDynamicComponent } from '../table-v2/FilterDynamicComponent';

const AssociationSelectDesigner = function Designer() {
  const { getCollectionFields, getInterface, getCollectionJoinField, getCollection } = useCollectionManager();
  const { getField } = useCollection();
  const { form } = useFormBlockContext();
  const field = useField<Field>();
  const fieldSchema = useFieldSchema();
  const { t } = useTranslation();
  const tk = useFilterByTk();
  const { dn, refresh, insertAdjacent } = useDesignable();
  const compile = useCompile();
  const collectionField = getField(fieldSchema['name']) || getCollectionJoinField(fieldSchema['x-collection-field']);
  const fieldComponentOptions = useFieldComponentOptions();
  const isSubFormAssociationField = field.address.segments.includes('__form_grid');
  const interfaceConfig = getInterface(collectionField?.interface);
  const validateSchema = interfaceConfig?.['validateSchema']?.(fieldSchema);
  const originalTitle = collectionField?.uiSchema?.title;
  const targetFields = collectionField?.target ? getCollectionFields(collectionField.target) : [];
  const initialValue = {
    title: field.title === originalTitle ? undefined : field.title,
  };
  const sortFields = useSortFields(collectionField?.target);

  const defaultSort = field.componentProps?.service?.params?.sort || [];
  const defaultFilter = field.componentProps?.service?.params?.filter || {};
  const dataSource = useCollectionFilterOptions(collectionField?.target);
  const divWrap = (schema: ISchema) => {
    return {
      type: 'void',
      'x-component': 'div',
      properties: {
        [schema.name || uid()]: schema,
      },
    };
  };
  const sort = defaultSort?.map((item: string) => {
    return item.startsWith('-')
      ? {
          field: item.substring(1),
          direction: 'desc',
        }
      : {
          field: item,
          direction: 'asc',
        };
  });
  if (!field.readPretty) {
    initialValue['required'] = field.required;
  }

  const options = targetFields
    .filter((field) => isTitleField(field))
    .map((field) => ({
      value: field?.name,
      label: compile(field?.uiSchema?.title) || field?.name,
    }));

  let readOnlyMode = 'editable';
  if (fieldSchema['x-disabled'] === true) {
    readOnlyMode = 'readonly';
  }
  if (fieldSchema['x-read-pretty'] === true) {
    readOnlyMode = 'read-pretty';
  }

  return (
    <GeneralSchemaDesigner>
      {collectionField && (
        <SchemaSettings.ModalItem
          key="edit-field-title"
          title={t('Edit field title')}
          schema={
            {
              type: 'object',
              title: t('Edit field title'),
              properties: {
                title: {
                  title: t('Field title'),
                  default: field?.title,
                  description: `${t('Original field title: ')}${collectionField?.uiSchema?.title}`,
                  'x-decorator': 'FormItem',
                  'x-component': 'Input',
                  'x-component-props': {},
                },
              },
            } as ISchema
          }
          onSubmit={({ title }) => {
            if (title) {
              field.title = title;
              fieldSchema.title = title;
              dn.emit('patch', {
                schema: {
                  'x-uid': fieldSchema['x-uid'],
                  title: fieldSchema.title,
                },
              });
            }
            dn.refresh();
          }}
        />
      )}
      {!field.readPretty && (
        <SchemaSettings.ModalItem
          key="edit-description"
          title={t('Edit description')}
          schema={
            {
              type: 'object',
              title: t('Edit description'),
              properties: {
                description: {
                  // title: t('Description'),
                  default: field?.description,
                  'x-decorator': 'FormItem',
                  'x-component': 'Input.TextArea',
                  'x-component-props': {},
                },
              },
            } as ISchema
          }
          onSubmit={({ description }) => {
            field.description = description;
            fieldSchema.description = description;
            dn.emit('patch', {
              schema: {
                'x-uid': fieldSchema['x-uid'],
                description: fieldSchema.description,
              },
            });
            dn.refresh();
          }}
        />
      )}
      {field.readPretty && (
        <SchemaSettings.ModalItem
          key="edit-tooltip"
          title={t('Edit tooltip')}
          schema={
            {
              type: 'object',
              title: t('Edit description'),
              properties: {
                tooltip: {
                  default: fieldSchema?.['x-decorator-props']?.tooltip,
                  'x-decorator': 'FormItem',
                  'x-component': 'Input.TextArea',
                  'x-component-props': {},
                },
              },
            } as ISchema
          }
          onSubmit={({ tooltip }) => {
            field.decoratorProps.tooltip = tooltip;
            fieldSchema['x-decorator-props'] = fieldSchema['x-decorator-props'] || {};
            fieldSchema['x-decorator-props']['tooltip'] = tooltip;
            dn.emit('patch', {
              schema: {
                'x-uid': fieldSchema['x-uid'],
                'x-decorator-props': fieldSchema['x-decorator-props'],
              },
            });
            dn.refresh();
          }}
        />
      )}
      {!field.readPretty && (
        <SchemaSettings.SwitchItem
          key="required"
          title={t('Required')}
          checked={fieldSchema.required as boolean}
          onChange={(required) => {
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            field.required = required;
            fieldSchema['required'] = required;
            schema['required'] = required;
            dn.emit('patch', {
              schema,
            });
            refresh();
          }}
        />
      )}
      {form && !form?.readPretty && validateSchema && (
        <SchemaSettings.ModalItem
          title={t('Set validation rules')}
          components={{ ArrayCollapse, FormLayout }}
          schema={
            {
              type: 'object',
              title: t('Set validation rules'),
              properties: {
                rules: {
                  type: 'array',
                  default: fieldSchema?.['x-validator'],
                  'x-component': 'ArrayCollapse',
                  'x-decorator': 'FormItem',
                  'x-component-props': {
                    accordion: true,
                  },
                  maxItems: 3,
                  items: {
                    type: 'object',
                    'x-component': 'ArrayCollapse.CollapsePanel',
                    'x-component-props': {
                      header: '{{ t("Validation rule") }}',
                    },
                    properties: {
                      index: {
                        type: 'void',
                        'x-component': 'ArrayCollapse.Index',
                      },
                      layout: {
                        type: 'void',
                        'x-component': 'FormLayout',
                        'x-component-props': {
                          labelStyle: {
                            marginTop: '6px',
                          },
                          labelCol: 8,
                          wrapperCol: 16,
                        },
                        properties: {
                          ...validateSchema,
                          message: {
                            type: 'string',
                            title: '{{ t("Error message") }}',
                            'x-decorator': 'FormItem',
                            'x-component': 'Input.TextArea',
                            'x-component-props': {
                              autoSize: {
                                minRows: 2,
                                maxRows: 2,
                              },
                            },
                          },
                        },
                      },
                      remove: {
                        type: 'void',
                        'x-component': 'ArrayCollapse.Remove',
                      },
                      moveUp: {
                        type: 'void',
                        'x-component': 'ArrayCollapse.MoveUp',
                      },
                      moveDown: {
                        type: 'void',
                        'x-component': 'ArrayCollapse.MoveDown',
                      },
                    },
                  },
                  properties: {
                    add: {
                      type: 'void',
                      title: '{{ t("Add validation rule") }}',
                      'x-component': 'ArrayCollapse.Addition',
                      'x-reactions': {
                        dependencies: ['rules'],
                        fulfill: {
                          state: {
                            disabled: '{{$deps[0].length >= 3}}',
                          },
                        },
                      },
                    },
                  },
                },
              },
            } as ISchema
          }
          onSubmit={(v) => {
            const rules = [];
            for (const rule of v.rules) {
              rules.push(_.pickBy(rule, _.identity));
            }
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            // return;
            // if (['number'].includes(collectionField?.interface) && collectionField?.uiSchema?.['x-component-props']?.['stringMode'] === true) {
            //   rules['numberStringMode'] = true;
            // }
            if (['percent'].includes(collectionField?.interface)) {
              for (const rule of rules) {
                if (!!rule.maxValue || !!rule.minValue) {
                  rule['percentMode'] = true;
                }

                if (rule.percentFormat) {
                  rule['percentFormats'] = true;
                }
              }
            }
            const concatValidator = _.concat([], collectionField?.uiSchema?.['x-validator'] || [], rules);
            field.validator = concatValidator;
            fieldSchema['x-validator'] = rules;
            schema['x-validator'] = rules;
            dn.emit('patch', {
              schema,
            });
            refresh();
          }}
        />
      )}
      {form &&
        !form?.readPretty &&
        isShowDefaultValue(collectionField, getInterface) &&
        !isPatternDisabled(fieldSchema) && (
          <SchemaSettings.ModalItem
            title={t('Set default value')}
            components={{ ArrayCollapse, FormLayout }}
            width={800}
            schema={
              {
                type: 'object',
                title: t('Set default value'),
                properties: {
                  default: {
                    ...(fieldSchema || {}),
                    'x-decorator': 'FormItem',
                    'x-component-props': {
                      ...fieldSchema['x-component-props'],
                      component: collectionField?.target ? 'AssociationSelect' : undefined,
                      service: {
                        resource: collectionField?.target,
                      },
                    },
                    name: 'default',
                    title: t('Default value'),
                    default: fieldSchema.default || collectionField.defaultValue,
                  },
                },
              } as ISchema
            }
            onSubmit={(v) => {
              const schema: ISchema = {
                ['x-uid']: fieldSchema['x-uid'],
              };
              if (field.value !== v.default) {
                field.value = v.default;
              }
              fieldSchema.default = v.default;
              schema.default = v.default;
              dn.emit('patch', {
                schema,
              });
              refresh();
            }}
          />
        )}
      {form && !isSubFormAssociationField && fieldComponentOptions && (
        <SchemaSettings.SelectItem
          title={t('Field component')}
          options={fieldComponentOptions}
          value={fieldSchema['x-component']}
          onChange={(type) => {
            const schema: ISchema = {
              name: collectionField.name,
              type: 'void',
              required: fieldSchema['required'],
              description: fieldSchema['description'],
              default: fieldSchema['default'],
              'x-decorator': 'FormItem',
              'x-designer': 'FormItem.Designer',
              'x-component': type,
              'x-validator': fieldSchema['x-validator'],
              'x-collection-field': fieldSchema['x-collection-field'],
              'x-decorator-props': fieldSchema['x-decorator-props'],
              'x-component-props': {
                ...collectionField?.uiSchema?.['x-component-props'],
                ...fieldSchema['x-component-props'],
              },
            };

            interfaceConfig?.schemaInitialize?.(schema, {
              field: collectionField,
              block: 'Form',
              readPretty: field.readPretty,
              action: tk ? 'get' : null,
              targetCollection: getCollection(collectionField.target),
            });

            if (type === 'CollectionField') {
              schema['type'] = 'string';
            }

            insertAdjacent('beforeBegin', divWrap(schema), {
              onSuccess: () => {
                dn.remove(null, {
                  removeParentsIfNoChildren: true,
                  breakRemoveOn: {
                    'x-component': 'Grid',
                  },
                });
              },
            });
          }}
        />
      )}

      {!field.readPretty && (
        <SchemaSettings.SwitchItem
          key="allowAddNew"
          title={t('Allow add new data')}
          checked={(fieldSchema['x-add-new'] !== false) as boolean}
          onChange={(allowAddNew) => {
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            field['x-add-new'] = allowAddNew;
            fieldSchema['x-add-new'] = allowAddNew;
            schema['x-add-new'] = allowAddNew;
            dn.emit('patch', {
              schema,
            });
            refresh();
          }}
        />
      )}

      {form &&
        !form?.readPretty &&
        ['o2m', 'm2m'].includes(collectionField.interface) &&
        fieldSchema['x-component'] !== 'TableField' && (
          <SchemaSettings.SwitchItem
            key="multiple"
            title={t('Multiple')}
            checked={
              fieldSchema['x-component-props']?.multiple === undefined
                ? true
                : fieldSchema['x-component-props'].multiple
            }
            onChange={(value) => {
              const schema = {
                ['x-uid']: fieldSchema['x-uid'],
              };
              fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
              field.componentProps = field.componentProps || {};

              fieldSchema['x-component-props'].multiple = value;
              field.componentProps.multiple = value;

              schema['x-component-props'] = fieldSchema['x-component-props'];
              dn.emit('patch', {
                schema,
              });
              refresh();
            }}
          />
        )}
      <SchemaSettings.ModalItem
        title={t('Set the data scope')}
        schema={
          {
            type: 'object',
            title: t('Set the data scope'),
            properties: {
              filter: {
                default: defaultFilter,
                // title: '数据范围',
                enum: dataSource,
                'x-component': 'Filter',
                'x-component-props': {
                  dynamicComponent: (props) => FilterDynamicComponent({ ...props }),
                },
              },
            },
          } as ISchema
        }
        onSubmit={({ filter }) => {
          filter = removeNullCondition(filter);
          _.set(field.componentProps, 'service.params.filter', filter);
          fieldSchema['x-component-props'] = field.componentProps;
          dn.emit('patch', {
            schema: {
              ['x-uid']: fieldSchema['x-uid'],
              'x-component-props': field.componentProps,
            },
          });
        }}
      />
      <SchemaSettings.ModalItem
        title={t('Set default sorting rules')}
        components={{ ArrayItems }}
        schema={
          {
            type: 'object',
            title: t('Set default sorting rules'),
            properties: {
              sort: {
                type: 'array',
                default: sort,
                'x-component': 'ArrayItems',
                'x-decorator': 'FormItem',
                items: {
                  type: 'object',
                  properties: {
                    space: {
                      type: 'void',
                      'x-component': 'Space',
                      properties: {
                        sort: {
                          type: 'void',
                          'x-decorator': 'FormItem',
                          'x-component': 'ArrayItems.SortHandle',
                        },
                        field: {
                          type: 'string',
                          enum: sortFields,
                          'x-decorator': 'FormItem',
                          'x-component': 'Select',
                          'x-component-props': {
                            style: {
                              width: 260,
                            },
                          },
                        },
                        direction: {
                          type: 'string',
                          'x-decorator': 'FormItem',
                          'x-component': 'Radio.Group',
                          'x-component-props': {
                            optionType: 'button',
                          },
                          enum: [
                            {
                              label: t('ASC'),
                              value: 'asc',
                            },
                            {
                              label: t('DESC'),
                              value: 'desc',
                            },
                          ],
                        },
                        remove: {
                          type: 'void',
                          'x-decorator': 'FormItem',
                          'x-component': 'ArrayItems.Remove',
                        },
                      },
                    },
                  },
                },
                properties: {
                  add: {
                    type: 'void',
                    title: t('Add sort field'),
                    'x-component': 'ArrayItems.Addition',
                  },
                },
              },
            },
          } as ISchema
        }
        onSubmit={({ sort }) => {
          const sortArr = sort.map((item) => {
            return item.direction === 'desc' ? `-${item.field}` : item.field;
          });

          _.set(field.componentProps, 'service.params.sort', sortArr);
          fieldSchema['x-component-props'] = field.componentProps;
          dn.emit('patch', {
            schema: {
              ['x-uid']: fieldSchema['x-uid'],
              'x-component-props': field.componentProps,
            },
          });
        }}
      />
      {form && !form?.readPretty && !isPatternDisabled(fieldSchema) && (
        <SchemaSettings.SelectItem
          key="pattern"
          title={t('Pattern')}
          options={[
            { label: t('Editable'), value: 'editable' },
            { label: t('Readonly'), value: 'readonly' },
            { label: t('Easy-reading'), value: 'read-pretty' },
          ]}
          value={readOnlyMode}
          onChange={(v) => {
            const schema: ISchema = {
              ['x-uid']: fieldSchema['x-uid'],
            };

            switch (v) {
              case 'readonly': {
                fieldSchema['x-read-pretty'] = false;
                fieldSchema['x-disabled'] = true;
                schema['x-read-pretty'] = false;
                schema['x-disabled'] = true;
                field.readPretty = false;
                field.disabled = true;
                break;
              }
              case 'read-pretty': {
                fieldSchema['x-read-pretty'] = true;
                fieldSchema['x-disabled'] = false;
                schema['x-read-pretty'] = true;
                schema['x-disabled'] = false;
                field.readPretty = true;
                break;
              }
              default: {
                fieldSchema['x-read-pretty'] = false;
                fieldSchema['x-disabled'] = false;
                schema['x-read-pretty'] = false;
                schema['x-disabled'] = false;
                field.readPretty = false;
                field.disabled = false;
                break;
              }
            }

            dn.emit('patch', {
              schema,
            });

            dn.refresh();
          }}
        />
      )}
      {collectionField?.target && ['CollectionField', 'AssociationSelect'].includes(fieldSchema['x-component']) && (
        <SchemaSettings.SelectItem
          key="title-field"
          title={t('Title field')}
          options={options}
          value={field?.componentProps?.fieldNames?.label ?? 'id'}
          onChange={(label) => {
            const schema = {
              ['x-uid']: fieldSchema['x-uid'],
            };
            const fieldNames = {
              ...collectionField?.uiSchema?.['x-component-props']?.['fieldNames'],
              ...field.componentProps.fieldNames,
              label,
            };
            field.componentProps.fieldNames = fieldNames;
            fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
            fieldSchema['x-component-props']['fieldNames'] = fieldNames;
            schema['x-component-props'] = fieldSchema['x-component-props'];
            dn.emit('patch', {
              schema,
            });
            dn.refresh();
          }}
        />
      )}
      {collectionField && <SchemaSettings.Divider />}
      <SchemaSettings.Remove
        key="remove"
        removeParentsIfNoChildren
        confirm={{
          title: t('Delete field'),
        }}
        breakRemoveOn={{
          'x-component': 'Grid',
        }}
      />
    </GeneralSchemaDesigner>
  );
};

export { AssociationSelectDesigner };