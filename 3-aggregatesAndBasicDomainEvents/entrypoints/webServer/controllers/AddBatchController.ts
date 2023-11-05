import { FastifyReply, FastifyRequest } from 'fastify';

import { Batch } from '../../../domain/Batch';
import { AddBatchUseCase } from '../../../useCases/AddBatchUseCase';
import { UnitOfWorkPort } from '../../../useCases/UnitOfWork';
import { Controller } from './Controller';

export class AddBatchController implements Controller {
  constructor(private readonly unitOfWorkFactory: () => Promise<UnitOfWorkPort>) {}

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
    const unitOfWork = await this.unitOfWorkFactory();
    const batchReference = await new AddBatchUseCase(unitOfWork).handle(
      new Batch({
        reference: request.body.reference,
        sku: request.body.sku,
        purchasedQuantity: request.body.purchasedQuantity,
        allocatedOrderLines: [],
        eta: request.body.eta ? new Date(request.body.eta) : undefined,
      }),
    );

    reply.code(201).send({ batchReference });
  }
}
