import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

/**
 * Middleware: validates login request body against loginSchema.
 */
export const validateLogin = (req, res, next) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      status: 'error',
      message: result.error.errors,
    });
  }
  req.body = result.data;
  next();
};
