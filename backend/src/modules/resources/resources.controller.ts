import { Request, Response } from 'express';
import * as service from './resources.service';

export async function list(req: Request, res: Response) {
  res.json(await service.list(req.query as never));
}

export async function getById(req: Request, res: Response) {
  res.json(await service.getById(req.params.id));
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await service.create(req.body, req.user!));
}

export async function update(req: Request, res: Response) {
  res.json(await service.update(req.params.id, req.body, req.user!));
}

export async function remove(req: Request, res: Response) {
  await service.remove(req.params.id, req.user!);
  res.status(204).send();
}

export async function twin(req: Request, res: Response) {
  const { days } = req.query as unknown as { days: number };
  res.json(await service.twin(req.params.id, days));
}

export async function lifecycle(req: Request, res: Response) {
  res.json(await service.changeLifecycle(req.params.id, req.body.to, req.user!, req.body.note));
}
