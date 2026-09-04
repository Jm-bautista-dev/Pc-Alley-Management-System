const { Op } = require('sequelize');

/**
 * Helper to extract and sanitize pagination, search, and sorting parameters.
 * Handles inputs securely to prevent malicious limit payloads or SQL injections.
 * 
 * @param {Object} query Express request query object (req.query)
 * @param {number} defaultLimit Default limit size if not provided
 * @returns {Object} Cleaned parameters: { page, limit, offset, search, filter, sort }
 */
function getPaginationParams(query = {}, defaultLimit = 20) {
  const page = Math.max(1, parseInt(query?.page, 10) || 1);
  // Restrict limit to a maximum of 1000 to prevent Denial of Service (DoS) while accommodating bulk list views
  const limit = Math.max(1, Math.min(1000, parseInt(query?.limit, 10) || defaultLimit));
  const offset = (page - 1) * limit;

  // Trim and sanitize search/filter strings
  const search = typeof query?.search === 'string' ? query.search.trim() : '';
  const filter = typeof query?.filter === 'string' ? query.filter.trim() : '';
  const sort = typeof query?.sort === 'string' ? query.sort.trim() : '';

  return { page, limit, offset, search, filter, sort };
}

/**
 * Builds offset, where, and order parameters for Sequelize queries based on input pagination.
 * 
 * @param {Object} params Parameters containing page, limit, search, and searchableFields
 * @param {number} defaultLimit Default limit size if not provided
 * @returns {Object} { offset, where, order, page, limit }
 */
function buildPagination({ page, limit, search, searchableFields } = {}, defaultLimit = 20) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(1000, parseInt(limit, 10) || defaultLimit));
  const offset = (pageNum - 1) * limitNum;

  const where = {};
  if (search && searchableFields && Array.isArray(searchableFields) && searchableFields.length > 0) {
    const trimmedSearch = String(search).trim();
    if (trimmedSearch) {
      where[Op.or] = searchableFields.map(field => ({
        [field]: { [Op.like]: `%${trimmedSearch}%` }
      }));
    }
  }

  const order = [['createdAt', 'DESC']];

  return {
    offset,
    where,
    order,
    page: pageNum,
    limit: limitNum,
    search: typeof search === 'string' ? search.trim() : ''
  };
}

// Bind named properties to buildPagination
buildPagination.pagination = buildPagination;
buildPagination.buildPagination = buildPagination;
buildPagination.getPaginationParams = getPaginationParams;

// Support default and named exports
module.exports = buildPagination;
module.exports.pagination = buildPagination;
module.exports.buildPagination = buildPagination;
module.exports.getPaginationParams = getPaginationParams;
module.exports.default = buildPagination;

