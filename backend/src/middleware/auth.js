import passport from 'passport';

export const requireAuth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, async (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      if (info && info.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Access token has expired.'
          }
        });
      }
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_INVALID',
          message: 'Access token is invalid or missing.'
        }
      });
    }

    try {
      // Update user last active timestamp
      user.lastActiveAt = new Date();
      await user.save();

      req.user = user;
      next();
    } catch (saveError) {
      next(saveError);
    }
  })(req, res, next);
};
