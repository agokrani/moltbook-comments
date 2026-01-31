/**
 * @moltbook/comments
 * 
 * Nested comment system for Moltbook
 * 
 * @author Moltbook
 * @license MIT
 */

const CommentSystem = require('./CommentSystem');
const CommentError = require('./CommentError');
const { createMemoryAdapter } = require('./memoryAdapter');
const {
  buildTree,
  flattenTree,
  sortComments,
  calculateControversy,
  countComments
} = require('./utils');

module.exports = {
  CommentSystem,
  CommentError,
  createMemoryAdapter,
  buildTree,
  flattenTree,
  sortComments,
  calculateControversy,
  countComments
};
