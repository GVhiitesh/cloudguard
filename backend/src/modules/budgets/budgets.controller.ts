import { Request, Response } from 'express';
import * as service from './budgets.service';

export async function list(_req: Request, res: Response) {
  res.json(await service.list());
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await service.create(req.body, req.user!));
}

export async function update(req: Request, res: Response) {
  res.json(await service.update(req.params.id, req.body.limitPerMonth, req.user!));
}

export async function remove(req: Request, res: Response) {
  await service.remove(req.params.id, req.user!);
  res.status(204).send();
}

export async function status(_req: Request, res: Response) {
  res.json(await service.status());
}
