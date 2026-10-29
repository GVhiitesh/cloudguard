import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { auth } from '../../middleware/auth';
import { asyncHandler } from '../../lib/async';
import { loginSchema, mfaVerifySchema, registerSchema } from './auth.schema';
import * as controller from './auth.controller';

export const authRouter = Router();

authRouter.post('/register', validate({ body: registerSchema }), asyncHandler(controller.register));
authRouter.post('/login', validate({ body: loginSchema }), asyncHandler(controller.login));
authRouter.get('/me', auth, asyncHandler(controller.me));

// TOTP Multi-Factor Authentication Endpoints
authRouter.post('/mfa/setup', auth, asyncHandler(controller.setupMfa));
authRouter.post('/mfa/verify', auth, validate({ body: mfaVerifySchema }), asyncHandler(controller.verifyMfa));
authRouter.post('/mfa/disable', auth, validate({ body: mfaVerifySchema }), asyncHandler(controller.disableMfa));
