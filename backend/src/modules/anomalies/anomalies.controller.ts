import { Request, Response } from 'express';
import * as service from './anomalies.service';

export async function list(req: Request, res: Response) {
  res.json(await service.list(req.query as never));
}

export async function getById(req: Request, res: Response) {
  res.json(await service.getById(req.params.id));
}

export async function updateStatus(req: Request, res: Response) {
  res.json(await service.updateStatus(req.params.id, req.body.status, req.user!));
}
