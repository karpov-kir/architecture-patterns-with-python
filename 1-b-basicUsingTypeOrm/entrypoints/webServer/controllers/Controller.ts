import { FastifyReply, FastifyRequest } from 'fastify';

export interface Controller {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handle: (request: FastifyRequest<any>, reply: FastifyReply) => Promise<unknown>;
}
