import { FastifyReply, FastifyRequest } from 'fastify';

import { Batch } from '../../../domain/Batch';
import { TypeOrmUnitOfWork } from '../../../infra/db/TypeOrmUnitOfWork';
import { AddBatchUseCase } from '../../../useCases/AddBatchUseCase';
import { Controller } from './Controller';

export class AddBatchController implements Controller {
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
    const unitOfWork = await TypeOrmUnitOfWork.create();
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
