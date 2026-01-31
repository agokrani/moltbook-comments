/**
 * Utility functions for comment tree operations
 */

/**
 * Build nested tree from flat comment array
 * 
 * @param {Array} comments - Flat array of comments
 * @returns {Array} Nested tree structure
 */
function buildTree(comments) {
  if (!comments || comments.length === 0) {
    return [];
  }
  
  const commentMap = new Map();
  const rootComments = [];
  
  // First pass: create map with replies array
  for (const comment of comments) {
    commentMap.set(comment.id, {
      ...comment,
      replies: []
    });
  }
  
  // Second pass: build tree structure
  for (const comment of comments) {
    const node = commentMap.get(comment.id);
    const parentId = comment.parentId || comment.parent_id;
    
    if (parentId && commentMap.has(parentId)) {
      commentMap.get(parentId).replies.push(node);
    } else {
      rootComments.push(node);
    }
  }
  
  return rootComments;
}

/**
 * Flatten tree back to array
 * 
 * @param {Array} tree - Nested tree structure
 * @returns {Array} Flat array
 */
function flattenTree(tree) {
  const result = [];
  
  function traverse(nodes) {
    for (const node of nodes) {
      const { replies, ...comment } = node;
      result.push(comment);
      
      if (replies && replies.length > 0) {
        traverse(replies);
      }
    }
  }
  
  traverse(tree);
  return result;
}

/**
 * Sort comments by different algorithms
 * 
 * @param {Array} comments - Comments to sort
 * @param {string} sort - Sort method (top, new, old, controversial)
 * @returns {Array} Sorted comments
 */
function sortComments(comments, sort = 'top') {
  const sorted = [...comments];
  
  switch (sort) {
    case 'new':
      sorted.sort((a, b) => {
        const aTime = new Date(a.createdAt || a.created_at).getTime();
        const bTime = new Date(b.createdAt || b.created_at).getTime();
        return bTime - aTime;
      });
      break;
      
    case 'old':
      sorted.sort((a, b) => {
        const aTime = new Date(a.createdAt || a.created_at).getTime();
        const bTime = new Date(b.createdAt || b.created_at).getTime();
        return aTime - bTime;
      });
      break;
      
    case 'controversial':
      sorted.sort((a, b) => {
        const aScore = calculateControversy(a);
        const bScore = calculateControversy(b);
        return bScore - aScore;
      });
      break;
      
    case 'top':
    default:
      sorted.sort((a, b) => {
        const aScore = a.score ?? 0;
        const bScore = b.score ?? 0;
        
        if (bScore !== aScore) {
          return bScore - aScore;
        }
        
        // Tiebreaker: newer first
        const aTime = new Date(a.createdAt || a.created_at).getTime();
        const bTime = new Date(b.createdAt || b.created_at).getTime();
        return bTime - aTime;
      });
      break;
  }
  
  return sorted;
}

/**
 * Calculate controversy score
 * High when upvotes and downvotes are close
 * 
 * @param {Object} comment - Comment with upvotes/downvotes
 * @returns {number} Controversy score
 */
function calculateControversy(comment) {
  const upvotes = comment.upvotes ?? 0;
  const downvotes = comment.downvotes ?? 0;
  const total = upvotes + downvotes;
  
  if (total === 0) {
    return 0;
  }
  
  const balance = 1 - Math.abs(upvotes - downvotes) / total;
  return total * balance;
}

/**
 * Get depth of a comment in tree
 * 
 * @param {string} commentId - Comment ID
 * @param {Map} commentMap - Map of id -> comment
 * @returns {number} Depth
 */
function getDepth(commentId, commentMap) {
  let depth = 0;
  let current = commentMap.get(commentId);
  
  while (current) {
    const parentId = current.parentId || current.parent_id;
    if (!parentId) break;
    
    current = commentMap.get(parentId);
    depth++;
    
    // Safety limit
    if (depth > 100) break;
  }
  
  return depth;
}

/**
 * Count total comments in tree (including nested)
 * 
 * @param {Array} tree - Comment tree
 * @returns {number} Total count
 */
function countComments(tree) {
  let count = 0;
  
  function traverse(nodes) {
    for (const node of nodes) {
      count++;
      if (node.replies && node.replies.length > 0) {
        traverse(node.replies);
      }
    }
  }
  
  traverse(tree);
  return count;
}

module.exports = {
  buildTree,
  flattenTree,
  sortComments,
  calculateControversy,
  getDepth,
  countComments
};
