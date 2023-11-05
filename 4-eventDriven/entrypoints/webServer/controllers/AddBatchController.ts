import { FastifyReply, FastifyRequest } from 'fastify';

import { AddBatchCommand } from '../../../domain/commands/AddBatchCommand';
import { EventBusPort } from '../../../ports/EventBusPort';
import { Controller } from './Controller';

export class AddBatchController implements Controller {
  constructor(private readonly internalEventBus: EventBusPort) {}

  async handle(
    request: FastifyRequest<{
      Body: {
        reference: string;
        sku: string;
        purchasedQuantity: number;
        eta?: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    await this.internalEventBus.publish(
      new AddBatchCommand({
        reference: request.body.reference,
        sku: request.body.sku,
        purchasedQuantity: request.body.purchasedQuantity,
        eta: request.body.eta ? new Date(request.body.eta) : undefined,
      }),
    );

    reply.code(204).send();
  }
}
