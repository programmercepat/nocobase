import { Collection } from '../collection';
import { Database } from '../database';
import { updateAssociations } from '../update-associations';
import { mockDatabase } from './';

describe('update associations', () => {
  describe('update with nested associations', function () {
    let db: Database;
    beforeEach(async () => {
      db = mockDatabase();
      await db.clean({ drop: true });
    });

    afterEach(async () => {
      await db.close();
    });

    it('should update nested', async () => {
      const createCollection = (name: string, fields = []) => {
        return db.collection({
          name,
          fields: [{ type: 'string', name: 'name' }, ...fields],
        });
      };
      const A = createCollection('a', [{ type: 'hasOne', name: 'b', target: 'b', foreignKey: 'a_id' }]);
      const B = createCollection('b', [{ type: 'hasOne', name: 'c', target: 'c', foreignKey: 'b_id' }]);
      const C = createCollection('c', [{ type: 'hasOne', name: 'd', target: 'd', foreignKey: 'c_id' }]);
      const D = createCollection('d');

      await db.sync();

      await A.repository.create({
        values: {
          name: 'a1',
          b: {
            name: 'b1',
            c: {
              name: 'c1',
              d: {
                name: 'd1',
              },
            },
          },
        },
      });

      const a1 = await A.repository.findOne({
        appends: ['b.c.d'],
      });

      await A.repository.update({
        filter: {
          id: a1.get('id'),
        },
        values: {
          name: 'a11',
          b: {
            id: a1.get('b').get('id'),
            name: 'b11',
            c: {
              id: a1.get('b').get('c').get('id'),
              name: 'c11',
              d: {
                id: a1.get('b').get('c').get('d').get('id'),
                name: 'd11',
              },
            },
          },
        },
        updateAssociationValues: ['b.c.d', 'b'],
      });

      const a = await A.repository.findOne({
        appends: ['b', 'b.c', 'b.c.d'],
      });

      expect(a.get('b').get('name')).toEqual('b11');
      expect(a.get('b').get('c').get('name')).toEqual('c1');
      expect(a.get('b').get('c').get('d').get('name')).toEqual('d11');
    });
  });

  describe('belongsTo', () => {
    let db: Database;
    beforeEach(async () => {
      db = mockDatabase();
    });

    afterEach(async () => {
      await db.close();
    });

    it('post.user', async () => {
      const User = db.collection<{ id: string; name: string }, { name: string }>({
        name: 'users',
        fields: [{ type: 'string', name: 'name' }],
      });

      const Post = db.collection({
        name: 'posts',
        fields: [
          { type: 'string', name: 'name' },
          { type: 'belongsTo', name: 'user' },
        ],
      });

      await db.sync();

      const user = await User.model.create({ name: 'user1' });
      const post1 = await Post.model.create({ name: 'post1' });

      await updateAssociations(post1, {
        user,
      });

      expect(post1.toJSON()).toMatchObject({
        id: 1,
        name: 'post1',
        userId: 1,
        user: {
          id: 1,
          name: 'user1',
        },
      });

      const post2 = await Post.model.create({ name: 'post2' });
      await updateAssociations(post2, {
        user: user.getDataValue('id'),
      });

      expect(post2.toJSON()).toMatchObject({
        id: 2,
        name: 'post2',
        userId: 1,
      });

      const post3 = await Post.model.create({ name: 'post3' });
      await updateAssociations(post3, {
        user: {
          name: 'user3',
        },
      });

      expect(post3.toJSON()).toMatchObject({
        id: 3,
        name: 'post3',
        userId: 2,
        user: {
          id: 2,
          name: 'user3',
        },
      });

      const post4 = await Post.model.create({ name: 'post4' });
      await updateAssociations(post4, {
        user: {
          id: user.getDataValue('id'),
          name: 'user4',
        },
      });

      const p4 = await db.getRepository('posts').findOne({
        filterByTk: post4.id,
        appends: ['user'],
      });

      expect(p4?.toJSON()).toMatchObject({
        id: 4,
        name: 'post4',
        userId: 1,
        user: {
          id: 1,
          name: 'user1',
        },
      });
    });
  });

  describe('hasMany', () => {
    let db: Database;
    let User: Collection;
    let Post: Collection;
    beforeEach(async () => {
      db = mockDatabase();
      User = db.collection({
        name: 'users',
        fields: [
          { type: 'string', name: 'name' },
          { type: 'hasMany', name: 'posts' },
        ],
      });
      Post = db.collection({
        name: 'posts',
        fields: [{ type: 'string', name: 'name' }],
      });
      await db.sync();
    });
    afterEach(async () => {
      await db.close();
    });
    it('user.posts', async () => {
      const user1 = await User.model.create<any>({ name: 'user1' });
      await updateAssociations(user1, {
        posts: {
          name: 'post1',
        },
      });
      expect(user1.toJSON()).toMatchObject({
        name: 'user1',
        posts: [
          {
            name: 'post1',
            userId: user1.id,
          },
        ],
      });
    });
    it('user.posts', async () => {
      const user1 = await User.model.create<any>({ name: 'user1' });
      await updateAssociations(user1, {
        posts: [
          {
            name: 'post1',
          },
        ],
      });
      expect(user1.toJSON()).toMatchObject({
        name: 'user1',
        posts: [
          {
            name: 'post1',
            userId: user1.id,
          },
        ],
      });
    });
    it('user.posts', async () => {
      const user1 = await User.model.create<any>({ name: 'user1' });
      const post1 = await Post.model.create<any>({ name: 'post1' });
      await updateAssociations(user1, {
        posts: post1.id,
      });
      expect(user1.toJSON()).toMatchObject({
        name: 'user1',
      });
      const post11 = await Post.model.findByPk(post1.id);
      expect(post11.toJSON()).toMatchObject({
        userId: user1.id,
      });
    });
    it('user.posts', async () => {
      const user1 = await User.model.create<any>({ name: 'user1' });
      const post1 = await Post.model.create<any>({ name: 'post1' });
      await updateAssociations(user1, {
        posts: post1,
      });

      expect(user1.toJSON()).toMatchObject({
        name: 'user1',
      });
      const post11 = await Post.model.findByPk(post1.id);
      expect(post11.toJSON()).toMatchObject({
        userId: user1.id,
      });
    });
    it('user.posts', async () => {
      const user1 = await User.model.create<any>({ name: 'user1' });
      const post1 = await Post.model.create<any>({ name: 'post1' });
      await updateAssociations(user1, {
        posts: {
          id: post1.id,
          name: 'post111',
        },
      });

      expect(user1.toJSON()).toMatchObject({
        name: 'user1',
      });
      const post11 = await Post.model.findByPk(post1.id);
      expect(post11.toJSON()).toMatchObject({
        userId: user1.id,
        name: 'post1',
      });
    });
    it('user.posts', async () => {
      const user1 = await User.model.create<any>({ name: 'user1' });
      const post1 = await Post.model.create<any>({ name: 'post1' });
      const post2 = await Post.model.create<any>({ name: 'post2' });
      const post3 = await Post.model.create<any>({ name: 'post3' });
      await updateAssociations(user1, {
        posts: [
          {
            id: post1.id,
            name: 'post111',
          },
          post2.id,
          post3,
        ],
      });

      expect(user1.toJSON()).toMatchObject({
        name: 'user1',
      });
      const post11 = await Post.model.findByPk(post1.id);
      expect(post11.toJSON()).toMatchObject({
        userId: user1.id,
        name: 'post1',
      });
      const post22 = await Post.model.findByPk(post2.id);
      expect(post22.toJSON()).toMatchObject({
        userId: user1.id,
        name: 'post2',
      });
      const post33 = await Post.model.findByPk(post3.id);
      expect(post33.toJSON()).toMatchObject({
        userId: user1.id,
        name: 'post3',
      });
    });
  });

  describe('nested', () => {
    let db: Database;
    let User: Collection;
    let Post: Collection;
    let Comment: Collection;

    beforeEach(async () => {
      db = mockDatabase();
      User = db.collection({
        name: 'users',
        fields: [
          { type: 'string', name: 'name' },
          { type: 'hasMany', name: 'posts' },
        ],
      });
      Post = db.collection({
        name: 'posts',
        fields: [
          { type: 'string', name: 'name' },
          { type: 'belongsTo', name: 'user' },
          { type: 'hasMany', name: 'comments' },
        ],
      });
      Comment = db.collection({
        name: 'comments',
        fields: [
          { type: 'string', name: 'name' },
          { type: 'belongsTo', name: 'post' },
        ],
      });
      await db.sync();
    });

    afterEach(async () => {
      await db.close();
    });

    test('create many with nested associations', async () => {
      await User.repository.createMany({
        records: [
          {
            name: 'u1',
            posts: [
              {
                name: 'u1p1',
                comments: [
                  {
                    name: 'u1p1c1',
                  },
                ],
              },
            ],
          },
          {
            name: 'u2',
            posts: [
              {
                name: 'u2p1',
                comments: [
                  {
                    name: 'u2p1c1',
                  },
                ],
              },
            ],
          },
        ],
      });
    });

    it('nested', async () => {
      const user = await User.model.create({ name: 'user1' });
      await updateAssociations(user, {
        posts: [
          {
            name: 'post1',
            comments: [
              {
                name: 'comment1',
              },
              {
                name: 'comment12',
              },
            ],
          },
          {
            name: 'post2',
            comments: [
              {
                name: 'comment21',
              },
              {
                name: 'comment22',
              },
            ],
          },
        ],
      });

      const post1 = await Post.model.findOne({
        where: { name: 'post1' },
      });

      const comment1 = await Comment.model.findOne({
        where: { name: 'comment1' },
      });

      expect(post1).toMatchObject({
        userId: user.get('id'),
      });

      expect(comment1).toMatchObject({
        postId: post1.get('id'),
      });
    });
  });

  describe('belongsToMany', () => {
    let db: Database;
    let Post: Collection;
    let Tag: Collection;
    let PostTag: Collection;

    beforeEach(async () => {
      db = mockDatabase();
      await db.clean({ drop: true });
      PostTag = db.collection({
        name: 'posts_tags',
        fields: [{ type: 'string', name: 'tagged_at' }],
      });
      Post = db.collection({
        name: 'posts',
        fields: [
          { type: 'belongsToMany', name: 'tags', through: 'posts_tags' },
          { type: 'string', name: 'title' },
        ],
      });

      Tag = db.collection({
        name: 'tags',
        fields: [
          { type: 'belongsToMany', name: 'posts', through: 'posts_tags' },
          { type: 'string', name: 'name' },
        ],
      });

      await db.sync();
    });

    afterEach(async () => {
      await db.close();
    });
    test('set through value', async () => {
      const p1 = await Post.repository.create({
        values: {
          title: 'hello',
          tags: [
            {
              name: 't1',
              posts_tags: {
                tagged_at: '123',
              },
            },
            { name: 't2' },
          ],
        },
      });
      const count = await PostTag.repository.count({
        filter: {
          tagged_at: '123',
        },
      });
      expect(count).toEqual(1);
    });
  });
});
