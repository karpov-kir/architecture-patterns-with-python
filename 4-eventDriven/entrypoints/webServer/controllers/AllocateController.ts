import { FastifyReply, FastifyRequest } from 'fastify';

import { AllocateCommand } from '../../../domain/commands/AllocateCommand';
import { EventBusPort } from '../../../ports/EventBusPort';
import { Controller } from './Controller';

export class AllocateController implements Controller {
  constructor(private readonly internalEventBus: EventBusPort) {}

  async handle(
    request: FastifyRequest<{
      Body: {
        orderId: string;
        sku: string;
        quantity: number;
      };
    }>,
    reply: FastifyReply,
  ) {
    await this.internalEventBus.publish(
      new AllocateCommand({
        orderId: request.body.orderId,
        sku: request.body.sku,
        quantity: request.body.quantity,
      }),
    );

    reply.code(204).send();
  }
}
