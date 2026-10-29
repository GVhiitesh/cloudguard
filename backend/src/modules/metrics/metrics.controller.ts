import { Request, Response } from 'express';
import * as service from './metrics.service';

export async function listForResource(req: Request, res: Response) {
  res.json(await service.listForResource(req.params.id, req.query as never));
}

export async function ingest(req: Request, res: Response) {
  res.status(201).json(await service.ingest(req.body));
}
