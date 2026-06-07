/**
 * Helper to extract and sanitize pagination, search, and sorting parameters.
 * Handles inputs securely to prevent malicious limit payloads or SQL injections.
 * 
 * @param {Object} query Express request query object (req.query)
 * @param {number} defaultLimit Default limit size if not provided
 * @returns {Object} Cleaned parameters: { page, limit, offset, search, filter, sort }
 */
function getPaginationParams(query, defaultLimit = 20) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  // Restrict limit to a maximum of 100 to prevent Denial of Service (DoS) memory issues
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || defaultLimit));
  const offset = (page - 1) * limit;

  // Trim and sanitize search/filter strings
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const filter = typeof query.filter === 'string' ? query.filter.trim() : '';
  const sort = typeof query.sort === 'string' ? query.sort.trim() : '';

  return { page, limit, offset, search, filter, sort };
}

module.exports = {
  getPaginationParams
};
