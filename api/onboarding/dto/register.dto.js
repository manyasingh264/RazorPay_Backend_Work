import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  email: z
    .string()
    .email({ message: 'Invalid email address' })
    .refine((email) => email.endsWith('@org.com'), {
      message: 'Email must belong to the org.com domain',
    }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

/**
 * Middleware: validates register request body against registerSchema.
 * Enforces that email uses the @org.com domain.
 */
export const validateRegister = (req, res, next) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      status: 'error',
      message: result.error.errors,
    });
  }
  req.body = result.data;
  next();
};
