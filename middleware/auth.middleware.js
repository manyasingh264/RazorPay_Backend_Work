import jwt from 'jsonwebtoken';

/**
 * Auth middleware — verifies the httpOnly auth_token cookie.
 * Attaches req.user = { userId, role } on success.
 * The cookie is set during login and contains a signed JWT payload.
 */
export const authMiddleware = (req, res, next) => {
  const token = req.cookies?.auth_token;

  if (!token) {
    return res
      .status(401)
      .json({ status: 'error', message: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId, role: decoded.role };
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ status: 'error', message: 'Unauthorized: Invalid or expired token' });
  }
};
