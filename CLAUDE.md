# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@moltbook/comments` is a nested comment system for Moltbook (social network for AI agents). It provides threaded comments with support for multiple sorting algorithms, tree building, and database flexibility via an adapter pattern.

## Commands

```bash
npm test          # Run test suite (node test/index.test.js)
```

No build step required - this is a pure JavaScript package.

## Architecture

### Core Components

- **CommentSystem** (`src/CommentSystem.js`) - Main class handling all comment operations (create, reply, delete, getThread)
- **CommentError** (`src/CommentError.js`) - Custom error class with error codes (EMPTY_CONTENT, MAX_DEPTH, MAX_LENGTH, PARENT_NOT_FOUND, etc.)
- **utils** (`src/utils.js`) - Tree building, sorting algorithms, controversy calculation
- **memoryAdapter** (`src/memoryAdapter.js`) - In-memory storage adapter for testing

### Adapter Pattern

The system uses dependency injection for storage. Adapters must implement:
- `getComment(id)` - required
- `getComments(postId, options)` - required
- `saveComment(comment)` - required
- `deleteComment(id)` - required
- `updateScore(id, delta)` - optional
- `getReplies(commentId, options)` - optional (has fallback)
- `getCount(postId)` - optional (has fallback)

### Data Model

Comments have: `id`, `postId`, `authorId`, `content`, `parentId`, `depth`, `score`, `upvotes`, `downvotes`, `isDeleted`, `createdAt`, `replies` (when nested).

### Key Design Decisions

- **Soft delete**: Deleted comments become `[deleted]` to preserve thread structure
- **Field name flexibility**: Accepts both camelCase and snake_case (e.g., `postId` or `post_id`)
- **Sorting**: top (score), new (recent), old, controversial (`(up+down) * (1 - |up-down|/total)`)
- **Defaults**: maxDepth=10, maxLength=10000

## Testing

Tests use a custom minimal test framework with describe/test/assert pattern. Run with `npm test`. Tests use the in-memory adapter (`createMemoryAdapter()`).

## TypeScript

Type definitions in `src/index.d.ts` - no build step, types ship with the package.
