import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../lib/async';
import { idParamSchema, listUsersQuerySchema, updateUserSchema } from './users.schema';
import * as controller from './users.controller';

export const usersRouter = Router();

usersRouter.use(auth, requireRole('ADMIN'));

usersRouter.get('/', validate({ query: listUsersQuerySchema }), asyncHandler(controller.list));
usersRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(controller.getById));
usersRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateUserSchema }),
  asyncHandler(controller.update),
);
usersRouter.delete('/:id', validate({ params: idParamSchema }), asyncHandler(controller.remove));
