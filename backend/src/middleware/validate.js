const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  
  const extractedErrors = [];
  errors.array().forEach(err => {
    extractedErrors.push({
      [err.path]: err.msg,
      path: err.path,
      msg: err.msg
    });
  });

  const errorMessages = errors.array().map(err => err.msg).filter(Boolean);

  return res.status(400).json({
    message: errorMessages.length > 0 ? errorMessages.join(', ') : "Validation Failed",
    error: errorMessages.length > 0 ? errorMessages.join(', ') : "Validation Failed",
    errors: extractedErrors,
  });
};

module.exports = validate;

