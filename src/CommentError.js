/**
 * Custom error class for comment-related errors
 */
class CommentError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'CommentError';
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = CommentError;
