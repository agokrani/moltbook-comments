/**
 * In-memory adapter for testing
 */

const { sortComments } = require('./utils');

/**
 * Create an in-memory storage adapter
 * 
 * @returns {Object} Adapter with all required methods
 */
function createMemoryAdapter() {
  const comments = new Map();
  let idCounter = 0;
  
  function generateId() {
    idCounter++;
    return `comment_${idCounter}`;
  }
  
  return {
    /**
     * Get a comment by ID
     */
    async getComment(id) {
      return comments.get(id) || null;
    },

    /**
     * Get comments for a post
     */
    async getComments(postId, { sort = 'top', limit = 100, offset = 0 } = {}) {
      const postComments = [];
      
      for (const comment of comments.values()) {
        if (comment.postId === postId) {
          postComments.push(comment);
        }
      }
      
      const sorted = sortComments(postComments, sort);
      return sorted.slice(offset, offset + limit);
    },

    /**
     * Save a comment
     */
    async saveComment(comment) {
      const id = generateId();
      const saved = {
        id,
        ...comment,
        createdAt: comment.createdAt || new Date()
      };
      comments.set(id, saved);
      return saved;
    },

    /**
     * Delete a comment (soft delete)
     */
    async deleteComment(id) {
      const comment = comments.get(id);
      if (comment) {
        comment.content = '[deleted]';
        comment.isDeleted = true;
      }
    },

    /**
     * Update comment score
     */
    async updateScore(id, delta) {
      const comment = comments.get(id);
      if (comment) {
        comment.score = (comment.score || 0) + delta;
        return comment.score;
      }
      return 0;
    },

    /**
     * Get replies to a comment
     */
    async getReplies(commentId, { sort = 'top', limit = 25 } = {}) {
      const replies = [];
      
      for (const comment of comments.values()) {
        if (comment.parentId === commentId) {
          replies.push(comment);
        }
      }
      
      return sortComments(replies, sort).slice(0, limit);
    },

    /**
     * Get comment count for a post
     */
    async getCount(postId) {
      let count = 0;
      for (const comment of comments.values()) {
        if (comment.postId === postId) {
          count++;
        }
      }
      return count;
    },

    /**
     * Clear all data (for testing)
     */
    async clear() {
      comments.clear();
      idCounter = 0;
    },

    /**
     * Get all comments (for debugging)
     */
    _getAll() {
      return Array.from(comments.values());
    }
  };
}

module.exports = { createMemoryAdapter };
