import { z } from 'zod';

export const assignSchema = z.object({
  userID_EMP: z.string().uuid({ message: 'userID_EMP must be a valid UUID' }),
  userID_RM: z.string().uuid({ message: 'userID_RM must be a valid UUID' }),
});

/**
 * Middleware: validates assign/unassign request body.
 * Expects { userID_EMP, userID_RM } — both must be valid UUIDs.
 */
export const validateAssign = (req, res, next) => {
  const result = assignSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      status: 'error',
      message: result.error.errors,
    });
  }
  req.body = result.data;
  next();
};
