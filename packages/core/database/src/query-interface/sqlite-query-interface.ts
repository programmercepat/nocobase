import QueryInterface from './query-interface';
import { Collection } from '../collection';
import sqlParser from '../sql-parser';

export default class SqliteQueryInterface extends QueryInterface {
  constructor(db) {
    super(db);
  }

  async collectionTableExists(collection: Collection, options?) {
    const transaction = options?.transaction;

    const tableName = collection.model.tableName;

    const sql = `SELECT name
                 FROM sqlite_master
                 WHERE type = 'table'
                   AND name = '${tableName}';`;
    const results = await this.db.sequelize.query(sql, { type: 'SELECT', transaction });
    return results.length > 0;
  }

  async listViews() {
    const sql = `
      SELECT name , sql as definition
      FROM sqlite_master
      WHERE type = 'view'
      ORDER BY name;
    `;

    return await this.db.sequelize.query(sql, {
      type: 'SELECT',
    });
  }

  async viewColumnUsage(options: { viewName: string; schema?: string }): Promise<{
    [view_column_name: string]: {
      column_name: string;
      table_name: string;
      table_schema?: string;
    };
  }> {
    try {
      const viewDefinition = await this.db.sequelize.query(
        `SELECT sql FROM sqlite_master WHERE name = '${options.viewName}' AND type = 'view'`,
        {
          type: 'SELECT',
        },
      );

      const createView = viewDefinition[0]['sql'];
      const regex = /(?<=AS\s)([\s\S]*)/i;
      const match = createView.match(regex);
      const sql = match[0];

      const { ast } = sqlParser.parse(sql);

      const columns = ast.columns;

      const results = [];

      for (const column of columns) {
        if (column.expr.type === 'column_ref') {
          let tableName = column.expr.table;

          if (!tableName && ast.from.length == 1) {
            tableName = ast.from[0].table;
          }

          results.push([
            column.as || column.expr.column,
            {
              column_name: column.expr.column,
              table_name: tableName,
            },
          ]);
        }
      }

      return Object.fromEntries(results);
    } catch (e) {
      this.db.logger.warn(e);
      return {};
    }
  }
}
