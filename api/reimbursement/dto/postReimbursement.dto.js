import { z } from 'zod';

export const postReimbursementSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().min(1, { message: 'Description is required' }),
  amount: z.number({ invalid_type_error: 'Amount must be a number' }).positive({
    message: 'Amount must be a positive number',
  }),
});

/**
 * Middleware: validates POST /reimbursements request body.
 */
export const validatePostReimbursement = (req, res, next) => {
  const result = postReimbursementSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      status: 'error',
      message: result.error.errors,
    });
  }
  req.body = result.data;
  next();
};
