import { z } from 'zod';

export const rolesSchema = z.object({
  user: z.string().email({ message: 'user must be a valid email address' }),
  role: z.enum(['EMP', 'RM', 'APE'], {
    errorMap: () => ({ message: 'role must be one of EMP, RM, or APE' }),
  }),
});

/**
 * Middleware: validates role assignment request body.
 * Expects { user: <email>, role: 'EMP' | 'RM' | 'APE' }
 * Note: CFO cannot be assigned via this endpoint (CFO is seeded).
 */
export const validateRoles = (req, res, next) => {
  const result = rolesSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      status: 'error',
      message: result.error.errors,
    });
  }
  req.body = result.data;
  next();
};
