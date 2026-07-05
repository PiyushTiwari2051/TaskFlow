export const validate = (schema) => (req, res, next) => {
  try {
    // Validate request body
    schema.parse(req.body);
    next();
  } catch (error) {
    const fields = {};
    if (error.errors) {
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        fields[path] = err.message;
      });
    }
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        fields
      }
    });
  }
};
