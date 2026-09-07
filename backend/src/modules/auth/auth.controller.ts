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
