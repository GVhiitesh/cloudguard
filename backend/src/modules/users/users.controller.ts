import { Request, Response } from 'express';
import * as service from './users.service';

export async function list(req: Request, res: Response) {
  res.json(await service.list(req.query as never));
}

export async function getById(req: Request, res: Response) {
  res.json(await service.getById(req.params.id));
}

export async function update(req: Request, res: Response) {
  res.json(await service.update(req.params.id, req.body, req.user!.id));
}

export async function remove(req: Request, res: Response) {
  await service.remove(req.params.id, req.user!.id);
  res.status(204).send();
}
