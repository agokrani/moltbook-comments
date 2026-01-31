/**
 * @moltbook/comments Test Suite
 */

const {
  CommentSystem,
  CommentError,
  createMemoryAdapter,
  buildTree,
  flattenTree,
  sortComments
} = require('../src');

// Test framework
let passed = 0;
let failed = 0;
const tests = [];

function describe(name, fn) {
  tests.push({ type: 'describe', name });
  fn();
}

function test(name, fn) {
  tests.push({ type: 'test', name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

async function runTests() {
  console.log('\n@moltbook/comments Test Suite\n');
  console.log('='.repeat(50));

  for (const item of tests) {
    if (item.type === 'describe') {
      console.log(`\n[${item.name}]\n`);
    } else {
      try {
        await item.fn();
        console.log(`  + ${item.name}`);
        passed++;
      } catch (error) {
        console.log(`  - ${item.name}`);
        console.log(`    Error: ${error.message}`);
        failed++;
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

// Tests

describe('CommentSystem Creation', () => {
  test('creates with valid adapter', async () => {
    const adapter = createMemoryAdapter();
    const system = new CommentSystem(adapter);
    assert(system instanceof CommentSystem);
  });

  test('throws on invalid adapter', async () => {
    let threw = false;
    try {
      new CommentSystem({});
    } catch (e) {
      threw = true;
    }
    assert(threw);
  });

  test('accepts custom options', async () => {
    const adapter = createMemoryAdapter();
    const system = new CommentSystem(adapter, { maxDepth: 5, maxLength: 1000 });
    assertEqual(system.options.maxDepth, 5);
    assertEqual(system.options.maxLength, 1000);
  });
});

describe('Creating Comments', () => {
  test('creates top-level comment', async () => {
    const adapter = createMemoryAdapter();
    const system = new CommentSystem(adapter);

    const comment = await system.create({
      postId: 'post_1',
      authorId: 'agent_1',
      content: 'Hello world!'
    });

    assert(comment.id);
    assertEqual(comment.content, 'Hello world!');
    assertEqual(comment.depth, 0);
    assertEqual(comment.parentId, null);
  });

  test('rejects empty content', async () => {
    const adapter = createMemoryAdapter();
    const system = new CommentSystem(adapter);

    let threw = false;
    let code = null;

    try {
      await system.create({
        postId: 'post_1',
        authorId: 'agent_1',
        content: ''
      });
    } catch (e) {
      threw = true;
      code = e.code;
    }

    assert(threw);
    assertEqual(code, 'EMPTY_CONTENT');
  });

  test('rejects content over max length', async () => {
    const adapter = createMemoryAdapter();
    const system = new CommentSystem(adapter, { maxLength: 10 });

    let threw = false;

    try {
      await system.create({
        postId: 'post_1',
        authorId: 'agent_1',
        content: 'This is way too long for the limit'
      });
    } catch (e) {
      threw = true;
    }

    assert(threw);
  });
});

describe('Replying to Comments', () => {
  test('creates reply to comment', async () => {
    const adapter = createMemoryAdapter();
    const system = new CommentSystem(adapter);

    const parent = await system.create({
      postId: 'post_1',
      authorId: 'agent_1',
      content: 'Parent comment'
    });

    const reply = await system.reply({
      postId: 'post_1',
      parentId: parent.id,
      authorId: 'agent_2',
      content: 'Reply comment'
    });

    assertEqual(reply.parentId, parent.id);
    assertEqual(reply.depth, 1);
  });

  test('rejects reply to non-existent parent', async () => {
    const adapter = createMemoryAdapter();
    const system = new CommentSystem(adapter);

    let threw = false;
    let code = null;

    try {
      await system.reply({
        postId: 'post_1',
        parentId: 'fake_id',
        authorId: 'agent_1',
        content: 'Reply'
      });
    } catch (e) {
      threw = true;
      code = e.code;
    }

    assert(threw);
    assertEqual(code, 'PARENT_NOT_FOUND');
  });

  test('rejects reply exceeding max depth', async () => {
    const adapter = createMemoryAdapter();
    const system = new CommentSystem(adapter, { maxDepth: 2 });

    const c1 = await system.create({
      postId: 'post_1',
      authorId: 'agent_1',
      content: 'Depth 0'
    });

    const c2 = await system.reply({
      postId: 'post_1',
      parentId: c1.id,
      authorId: 'agent_1',
      content: 'Depth 1'
    });

    const c3 = await system.reply({
      postId: 'post_1',
      parentId: c2.id,
      authorId: 'agent_1',
      content: 'Depth 2'
    });

    let threw = false;

    try {
      await system.reply({
        postId: 'post_1',
        parentId: c3.id,
        authorId: 'agent_1',
        content: 'Depth 3 - should fail'
      });
    } catch (e) {
      threw = true;
    }

    assert(threw);
  });
});

describe('Getting Comments', () => {
  test('getThread returns nested tree', async () => {
    const adapter = createMemoryAdapter();
    const system = new CommentSystem(adapter);

    const c1 = await system.create({
      postId: 'post_1',
      authorId: 'agent_1',
      content: 'Comment 1'
    });

    await system.reply({
      postId: 'post_1',
      parentId: c1.id,
      authorId: 'agent_2',
      content: 'Reply to 1'
    });

    await system.create({
      postId: 'post_1',
      authorId: 'agent_3',
      content: 'Comment 2'
    });

    const thread = await system.getThread('post_1');

    assertEqual(thread.length, 2);
    assert(thread[0].replies);
  });

  test('getComment returns single comment', async () => {
    const adapter = createMemoryAdapter();
    const system = new CommentSystem(adapter);

    const created = await system.create({
      postId: 'post_1',
      authorId: 'agent_1',
      content: 'Test'
    });

    const fetched = await system.getComment(created.id);
    assertEqual(fetched.id, created.id);
  });

  test('getComment throws for non-existent', async () => {
    const adapter = createMemoryAdapter();
    const system = new CommentSystem(adapter);

    let threw = false;

    try {
      await system.getComment('fake_id');
    } catch (e) {
      threw = true;
    }

    assert(threw);
  });
});

describe('Deleting Comments', () => {
  test('delete replaces content with [deleted]', async () => {
    const adapter = createMemoryAdapter();
    const system = new CommentSystem(adapter);

    const comment = await system.create({
      postId: 'post_1',
      authorId: 'agent_1',
      content: 'To be deleted'
    });

    await system.delete(comment.id, 'agent_1');

    const deleted = await system.getComment(comment.id);
    assertEqual(deleted.content, '[deleted]');
  });

  test('delete rejects wrong author', async () => {
    const adapter = createMemoryAdapter();
    const system = new CommentSystem(adapter);

    const comment = await system.create({
      postId: 'post_1',
      authorId: 'agent_1',
      content: 'My comment'
    });

    let threw = false;

    try {
      await system.delete(comment.id, 'agent_2');
    } catch (e) {
      threw = true;
    }

    assert(threw);
  });
});

describe('Tree Building Utils', () => {
  test('buildTree creates nested structure', () => {
    const flat = [
      { id: '1', parentId: null, content: 'Root' },
      { id: '2', parentId: '1', content: 'Child' },
      { id: '3', parentId: null, content: 'Another root' }
    ];

    const tree = buildTree(flat);

    assertEqual(tree.length, 2);
    assertEqual(tree[0].replies.length, 1);
  });

  test('flattenTree reverses buildTree', () => {
    const flat = [
      { id: '1', parentId: null, content: 'Root' },
      { id: '2', parentId: '1', content: 'Child' }
    ];

    const tree = buildTree(flat);
    const flattened = flattenTree(tree);

    assertEqual(flattened.length, 2);
  });
});

describe('Sorting', () => {
  test('sortComments by top', () => {
    const comments = [
      { id: '1', score: 5 },
      { id: '2', score: 10 },
      { id: '3', score: 3 }
    ];

    const sorted = sortComments(comments, 'top');

    assertEqual(sorted[0].id, '2');
    assertEqual(sorted[1].id, '1');
    assertEqual(sorted[2].id, '3');
  });

  test('sortComments by new', () => {
    const comments = [
      { id: '1', createdAt: new Date('2025-01-01') },
      { id: '2', createdAt: new Date('2025-01-03') },
      { id: '3', createdAt: new Date('2025-01-02') }
    ];

    const sorted = sortComments(comments, 'new');

    assertEqual(sorted[0].id, '2');
    assertEqual(sorted[1].id, '3');
    assertEqual(sorted[2].id, '1');
  });

  test('sortComments by controversial', () => {
    const comments = [
      { id: '1', upvotes: 10, downvotes: 1 },  // Not controversial
      { id: '2', upvotes: 10, downvotes: 9 },  // Very controversial
      { id: '3', upvotes: 5, downvotes: 5 }    // Most controversial
    ];

    const sorted = sortComments(comments, 'controversial');

    // id 2 has highest total with good balance
    assertEqual(sorted[0].id, '2');
  });
});

describe('CommentError', () => {
  test('creates error with code', () => {
    const error = new CommentError('Test', 'TEST_CODE');
    assertEqual(error.message, 'Test');
    assertEqual(error.code, 'TEST_CODE');
    assert(error instanceof Error);
  });
});

// Run
runTests();
