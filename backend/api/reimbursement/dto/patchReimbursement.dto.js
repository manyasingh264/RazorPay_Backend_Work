import { z } from 'zod';

export const patchReimbursementSchema = z.object({
  // userID here refers to the reimbursement record's primary key (id)
  userID: z.string().uuid({ message: 'userID must be a valid UUID (reimbursement id)' }),
  status: z.enum(['APPROVED', 'REJECTED'], {
    errorMap: () => ({ message: 'status must be APPROVED or REJECTED' }),
  }),
});

/**
 * Middleware: validates PATCH /reimbursements request body.
 */
export const validatePatchReimbursement = (req, res, next) => {
  const result = patchReimbursementSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      status: 'error',
      message: result.error.errors,
    });
  }
  req.body = result.data;
  next();
};
