import { Request, Response } from 'express';
import * as service from './alerts.service';

export async function list(req: Request, res: Response) {
  res.json(await service.list(req.query as never, req.user!));
}

export async function markRead(req: Request, res: Response) {
  res.json(await service.markRead(req.params.id, req.user!));
}

export async function markAllRead(req: Request, res: Response) {
  res.json(await service.markAllRead(req.user!));
}
