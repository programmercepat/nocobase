import { Database, mockDatabase } from '@nocobase/database';
import { ViewFieldInference } from '../../view/view-inference';
import { uid } from '@nocobase/utils';

describe('view inference', function () {
  let db: Database;

  beforeEach(async () => {
    db = mockDatabase({
      tablePrefix: '',
    });

    await db.clean({ drop: true });
  });

  afterEach(async () => {
    await db.close();
  });

  it('should infer field with cast', async () => {
    const TestCollection = db.collection({
      name: 'tests',
      fields: [
        {
          name: 'sales_name',
          type: 'string',
        },
        {
          name: 'money',
          type: 'double',
        },
        {
          name: 'progress',
          type: 'float',
        },
      ],
    });

    await db.sync();

    const viewName = `v_${uid()}`;
    const dropViewSQL = `DROP VIEW IF EXISTS ${viewName}`;
    await db.sequelize.query(dropViewSQL);

    const viewSQL = `
          CREATE VIEW ${viewName} as SELECT sales_name, progress,'2023-01-01' AS start_time,'2023-04-05' as stop_time FROM ${TestCollection.model.tableName}
          `;

    await db.sequelize.query(viewSQL);

    const inferredFields = await ViewFieldInference.inferFields({
      db,
      viewName,
      viewSchema: db.inDialect('postgres') ? 'public' : undefined,
    });

    expect(inferredFields['progress'].type).toBe('float');
  });

  it('should infer field with alias', async () => {
    if (db.options.dialect !== 'postgres') return;

    const UserCollection = db.collection({
      name: 'users',
      fields: [
        {
          name: 'id',
          type: 'bigInt',
          interface: 'bigInt',
        },
        {
          name: 'name',
          type: 'string',
          interface: 'test',
        },
      ],
    });

    await db.sync();

    const viewName = 'user_posts';

    const dropViewSQL = `DROP VIEW IF EXISTS ${viewName}`;
    await db.sequelize.query(dropViewSQL);

    const viewSQL = `
       CREATE VIEW ${viewName} as SELECT 1 as const_field, users.id as user_id_field, users.name FROM ${UserCollection.quotedTableName()} as users
    `;

    await db.sequelize.query(viewSQL);

    const inferredFields = await ViewFieldInference.inferFields({
      db,
      viewName,
      viewSchema: 'public',
    });

    expect(inferredFields['user_id_field'].source).toBe('users.id');
    expect(inferredFields['name'].source).toBe('users.name');
  });

  it('should infer collection fields', async () => {
    const UserCollection = db.collection({
      name: 'users',
      fields: [
        {
          name: 'name',
          type: 'string',
          interface: 'test',
        },
        {
          name: 'age',
          type: 'integer',
          interface: 'test',
        },
        {
          name: 'profile',
          type: 'json',
          interface: 'test',
        },
        {
          name: 'posts',
          type: 'hasMany',
          interface: 'test',
        },
      ],
    });

    const PostCollection = db.collection({
      name: 'posts',
      fields: [
        {
          name: 'title',
          type: 'string',
          interface: 'test',
        },
        {
          name: 'user',
          type: 'belongsTo',
          interface: 'test',
        },
      ],
    });

    await db.sync();

    const viewName = 'user_posts';

    const dropViewSQL = `DROP VIEW IF EXISTS ${viewName}`;
    await db.sequelize.query(dropViewSQL);

    const viewSQL = `
       CREATE VIEW ${viewName} as SELECT 1 as const_field, users.* FROM ${UserCollection.quotedTableName()} as users
    `;

    await db.sequelize.query(viewSQL);

    const inferredFields = await ViewFieldInference.inferFields({
      db,
      viewName,
      viewSchema: 'public',
    });

    const createdAt = UserCollection.model.rawAttributes['createdAt'].field;
    expect(inferredFields[createdAt]['type']).toBe('date');

    if (db.options.dialect == 'sqlite') {
      expect(inferredFields['name']).toMatchObject({
        name: 'name',
        type: 'string',
      });
    } else {
      expect(inferredFields['name']).toMatchObject({
        name: 'name',
        type: 'string',
        source: 'users.name',
      });

      expect(inferredFields['const_field']).toMatchObject({
        name: 'const_field',
        type: 'integer',
      });
    }

    await db.sequelize.query(dropViewSQL);
  });
});
