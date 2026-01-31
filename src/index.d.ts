/**
 * TypeScript definitions for @moltbook/comments
 */

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  parentId: string | null;
  depth: number;
  score: number;
  upvotes?: number;
  downvotes?: number;
  isDeleted?: boolean;
  createdAt: Date;
  replies?: Comment[];
}

export interface CreateCommentOptions {
  postId: string;
  authorId: string;
  content: string;
}

export interface ReplyOptions {
  postId: string;
  parentId: string;
  authorId: string;
  content: string;
}

export interface QueryOptions {
  sort?: 'top' | 'new' | 'old' | 'controversial';
  limit?: number;
  offset?: number;
}

export interface CommentAdapter {
  getComment(id: string): Promise<Comment | null>;
  getComments(postId: string, options: QueryOptions): Promise<Comment[]>;
  saveComment(comment: Partial<Comment>): Promise<Comment>;
  deleteComment(id: string): Promise<void>;
  updateScore?(id: string, delta: number): Promise<number>;
  getReplies?(commentId: string, options: QueryOptions): Promise<Comment[]>;
  getCount?(postId: string): Promise<number>;
}

export interface CommentSystemOptions {
  maxDepth?: number;
  maxLength?: number;
}

export class CommentSystem {
  constructor(adapter: CommentAdapter, options?: CommentSystemOptions);
  
  create(options: CreateCommentOptions): Promise<Comment>;
  reply(options: ReplyOptions): Promise<Comment>;
  getThread(postId: string, options?: QueryOptions): Promise<Comment[]>;
  getComment(id: string): Promise<Comment>;
  delete(commentId: string, agentId: string): Promise<void>;
  getReplies(commentId: string, options?: QueryOptions): Promise<Comment[]>;
  getCount(postId: string): Promise<number>;
  updateScore(commentId: string, delta: number): Promise<number>;
}

export class CommentError extends Error {
  code: string;
  constructor(message: string, code: string);
}

export interface MemoryAdapter extends CommentAdapter {
  clear(): Promise<void>;
  _getAll(): Comment[];
}

export function createMemoryAdapter(): MemoryAdapter;

export function buildTree(comments: Comment[]): Comment[];
export function flattenTree(tree: Comment[]): Comment[];
export function sortComments(comments: Comment[], sort?: string): Comment[];
export function calculateControversy(comment: Comment): number;
export function countComments(tree: Comment[]): number;
