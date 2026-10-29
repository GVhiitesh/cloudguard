import { Request, Response } from 'express';
import * as service from './recommendations.service';

export async function list(req: Request, res: Response) {
  res.json(await service.list(req.query as never));
}

export async function apply(req: Request, res: Response) {
  res.json(await service.apply(req.params.id, req.body, req.user!));
}
