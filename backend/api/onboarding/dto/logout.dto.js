/**
 * Logout DTO — logout carries no request body, so this is a pass-through middleware.
 * Kept for structural consistency with the router spec.
 */
export const validateLogout = (req, res, next) => {
  next();
};
