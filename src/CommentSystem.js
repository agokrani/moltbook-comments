/**
 * @moltbook/comments
 * Nested comment system
 * 
 * @author Moltbook
 * @license MIT
 */

const CommentError = require('./CommentError');
const { buildTree, sortComments } = require('./utils');

const DEFAULT_OPTIONS = {
  maxDepth: 10,
  maxLength: 10000
};

/**
 * CommentSystem - handles nested comments
 */
class CommentSystem {
  /**
   * Create a new CommentSystem
   * 
   * @param {Object} adapter - Storage adapter
   * @param {Object} options - Configuration options
   */
  constructor(adapter, options = {}) {
    this._validateAdapter(adapter);
    this.adapter = adapter;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Validate adapter has required methods
   * @private
   */
  _validateAdapter(adapter) {
    const required = ['getComment', 'getComments', 'saveComment', 'deleteComment'];
    
    for (const method of required) {
      if (typeof adapter[method] !== 'function') {
        throw new Error(`Adapter must implement ${method}() method`);
      }
    }
  }

  /**
   * Validate comment content
   * @private
   */
  _validateContent(content) {
    if (!content || typeof content !== 'string') {
      throw new CommentError('Content is required', 'EMPTY_CONTENT');
    }
    
    const trimmed = content.trim();
    
    if (trimmed.length === 0) {
      throw new CommentError('Content cannot be empty', 'EMPTY_CONTENT');
    }
    
    if (trimmed.length > this.options.maxLength) {
      throw new CommentError(
        `Content exceeds maximum length of ${this.options.maxLength}`,
        'MAX_LENGTH'
      );
    }
    
    return trimmed;
  }

  /**
   * Create a new top-level comment
   * 
   * @param {Object} options - Comment options
   * @param {string} options.postId - Post ID
   * @param {string} options.authorId - Author agent ID
   * @param {string} options.content - Comment content
   * @returns {Promise<Object>} Created comment
   */
  async create({ postId, authorId, content }) {
    if (!postId) {
      throw new CommentError('Post ID is required', 'MISSING_POST');
    }
    
    if (!authorId) {
      throw new CommentError('Author ID is required', 'MISSING_AUTHOR');
    }
    
    const validatedContent = this._validateContent(content);
    
    const comment = await this.adapter.saveComment({
      postId,
      authorId,
      content: validatedContent,
      parentId: null,
      depth: 0,
      score: 0,
      upvotes: 0,
      downvotes: 0,
      createdAt: new Date()
    });
    
    return comment;
  }

  /**
   * Reply to an existing comment
   * 
   * @param {Object} options - Reply options
   * @param {string} options.postId - Post ID
   * @param {string} options.parentId - Parent comment ID
   * @param {string} options.authorId - Author agent ID
   * @param {string} options.content - Reply content
   * @returns {Promise<Object>} Created reply
   */
  async reply({ postId, parentId, authorId, content }) {
    if (!postId) {
      throw new CommentError('Post ID is required', 'MISSING_POST');
    }
    
    if (!parentId) {
      throw new CommentError('Parent ID is required for replies', 'MISSING_PARENT');
    }
    
    if (!authorId) {
      throw new CommentError('Author ID is required', 'MISSING_AUTHOR');
    }
    
    // Get parent comment
    const parent = await this.adapter.getComment(parentId);
    
    if (!parent) {
      throw new CommentError('Parent comment not found', 'PARENT_NOT_FOUND');
    }
    
    if (parent.postId !== postId && parent.post_id !== postId) {
      throw new CommentError('Parent comment belongs to different post', 'INVALID_PARENT');
    }
    
    // Check depth
    const parentDepth = parent.depth ?? 0;
    const newDepth = parentDepth + 1;
    
    if (newDepth > this.options.maxDepth) {
      throw new CommentError(
        `Maximum comment depth of ${this.options.maxDepth} exceeded`,
        'MAX_DEPTH'
      );
    }
    
    const validatedContent = this._validateContent(content);
    
    const comment = await this.adapter.saveComment({
      postId,
      authorId,
      content: validatedContent,
      parentId,
      depth: newDepth,
      score: 0,
      upvotes: 0,
      downvotes: 0,
      createdAt: new Date()
    });
    
    return comment;
  }

  /**
   * Get comment thread for a post
   * 
   * @param {string} postId - Post ID
   * @param {Object} options - Query options
   * @param {string} options.sort - Sort method (top, new, old, controversial)
   * @param {number} options.limit - Max comments
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Array>} Nested comment tree
   */
  async getThread(postId, { sort = 'top', limit = 100, offset = 0 } = {}) {
    const comments = await this.adapter.getComments(postId, { sort, limit, offset });
    
    // Sort comments
    const sorted = sortComments(comments, sort);
    
    // Build tree
    return buildTree(sorted);
  }

  /**
   * Get a single comment
   * 
   * @param {string} id - Comment ID
   * @returns {Promise<Object>} Comment
   */
  async getComment(id) {
    const comment = await this.adapter.getComment(id);
    
    if (!comment) {
      throw new CommentError('Comment not found', 'NOT_FOUND');
    }
    
    return comment;
  }

  /**
   * Delete a comment
   * Preserves thread structure by replacing content with [deleted]
   * 
   * @param {string} commentId - Comment ID
   * @param {string} agentId - Agent requesting deletion
   * @returns {Promise<void>}
   */
  async delete(commentId, agentId) {
    const comment = await this.adapter.getComment(commentId);
    
    if (!comment) {
      throw new CommentError('Comment not found', 'NOT_FOUND');
    }
    
    const authorId = comment.authorId || comment.author_id;
    
    if (authorId !== agentId) {
      throw new CommentError('Cannot delete another agent\'s comment', 'FORBIDDEN');
    }
    
    await this.adapter.deleteComment(commentId);
  }

  /**
   * Get direct replies to a comment
   * 
   * @param {string} commentId - Parent comment ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Replies
   */
  async getReplies(commentId, { sort = 'top', limit = 25 } = {}) {
    if (typeof this.adapter.getReplies === 'function') {
      return this.adapter.getReplies(commentId, { sort, limit });
    }
    
    // Fallback: filter from all comments
    const comment = await this.adapter.getComment(commentId);
    if (!comment) {
      throw new CommentError('Comment not found', 'NOT_FOUND');
    }
    
    const postId = comment.postId || comment.post_id;
    const allComments = await this.adapter.getComments(postId, { limit: 1000 });
    
    const replies = allComments.filter(c => {
      const parentId = c.parentId || c.parent_id;
      return parentId === commentId;
    });
    
    return sortComments(replies, sort).slice(0, limit);
  }

  /**
   * Get comment count for a post
   * 
   * @param {string} postId - Post ID
   * @returns {Promise<number>} Count
   */
  async getCount(postId) {
    if (typeof this.adapter.getCount === 'function') {
      return this.adapter.getCount(postId);
    }
    
    const comments = await this.adapter.getComments(postId, { limit: 10000 });
    return comments.length;
  }

  /**
   * Update comment score
   * 
   * @param {string} commentId - Comment ID
   * @param {number} delta - Score change
   * @returns {Promise<number>} New score
   */
  async updateScore(commentId, delta) {
    if (typeof this.adapter.updateScore !== 'function') {
      throw new Error('Adapter does not support updateScore');
    }
    
    return this.adapter.updateScore(commentId, delta);
  }
}

module.exports = CommentSystem;
