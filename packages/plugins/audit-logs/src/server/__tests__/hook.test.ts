import Database from '@nocobase/database';
import { mockServer, MockServer } from '@nocobase/test';
import logPlugin from '../';

describe('hook', () => {
  let api: MockServer;
  let db: Database;

  beforeEach(async () => {
    api = mockServer();
    await api.db.clean({ drop: true });

    api.plugin(logPlugin, { name: 'audit-logs' });
    await api.load();
    db = api.db;
    db.collection({
      name: 'posts',
      logging: true,
      fields: [
        {
          type: 'string',
          name: 'title',
        },
        {
          type: 'string',
          name: 'status',
          defaultValue: 'draft',
        },
        {
          type: 'belongsToMany',
          name: 'tags',
        },
      ],
    });
    db.collection({
      name: 'users',
      logging: false,
      fields: [
        { type: 'string', name: 'nickname' },
        { type: 'string', name: 'token' },
      ],
    });

    db.collection({
      name: 'tags',
      fields: [{ type: 'string', name: 'name' }],
    });

    await db.sync();
  });

  afterEach(async () => {
    await api.destroy();
  });

  it('should log association changes', async () => {
    const t1 = await db.getRepository('tags').create({
      values: {
        name: 't1',
      },
    });

    const post = await db.getRepository('posts').create({
      values: {
        title: 't1',
        tags: [
          {
            id: t1.get('id'),
          },
        ],
      },
    });

    const log = await db.getRepository('auditLogs').findOne({
      appends: ['changes'],
    });

    const changes = log.changes;
    expect(changes).toHaveLength(2);
  });

  it('model', async () => {
    const Post = db.getCollection('posts').model;
    const post = await Post.create({ title: 't1' });
    await post.update({ title: 't2' });
    await post.destroy();
    const auditLogs = await db.getCollection('auditLogs').repository.find({
      appends: ['changes'],
    });
    expect(auditLogs.length).toBe(3);

    expect(auditLogs[0].changes[0].before).toBeNull();
    expect(auditLogs[0].changes[0].after).toBe('t1');

    expect(auditLogs[1].changes[0].before).toBe('t1');
    expect(auditLogs[1].changes[0].after).toBe('t2');

    expect(auditLogs[2].changes[0].before).toBe('t2');
  });

  it('repository', async () => {
    const Post = db.getCollection('posts');
    const User = db.getCollection('users').model;
    const user = await User.create({ nickname: 'a', token: 'token1' });
    const post = await Post.repository.create({
      values: { title: 't1' },
      context: {
        state: {
          currentUser: user,
        },
      },
    });
    const AuditLog = db.getCollection('auditLogs');
    const log = await AuditLog.repository.findOne({
      appends: ['changes'],
    });
    expect(log.toJSON()).toMatchObject({
      collectionName: 'posts',
      type: 'create',
      userId: 1,
      recordId: `${post.get('id')}`,
      changes: [
        {
          field: {
            name: 'title',
            type: 'string',
          },
          before: null,
          after: 't1',
        },
      ],
    });
  });

  // it.skip('resource', async () => {
  //   const agent = api.agent();
  //   agent.set('Authorization', `Bearer token1`);
  //   const response = await agent.resource('posts').create({
  //     values: { title: 't1' },
  //   });
  //   await agent.resource('posts').update({
  //     resourceIndex: response.body.data.id,
  //     values: { title: 't2' },
  //   });
  //   await agent.resource('posts').destroy({
  //     resourceIndex: response.body.data.id,
  //   });
  //   const ActionLog = db.getCollection('action_logs').model;
  //   const count = await ActionLog.count();
  //   expect(count).toBe(3);
  // });
});
