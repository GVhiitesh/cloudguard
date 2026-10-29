import { Request, Response } from 'express';
import * as service from './auth.service';

export async function register(req: Request, res: Response) {
  const result = await service.register(req.body);
  res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
  const result = await service.login(req.body);
  res.json(result);
}

export async function me(req: Request, res: Response) {
  res.json(await service.me(req.user!.id));
}

export async function setupMfa(req: Request, res: Response) {
  const result = await service.generateMfaSetup(req.user!.id);
  res.json(result);
}

export async function verifyMfa(req: Request, res: Response) {
  const result = await service.verifyAndEnableMfa(req.user!.id, req.body.token);
  res.json(result);
}

export async function disableMfa(req: Request, res: Response) {
  const result = await service.disableMfa(req.user!.id, req.body.token);
  res.json(result);
}
