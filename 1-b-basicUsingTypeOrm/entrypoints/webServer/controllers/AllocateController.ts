import { FastifyReply, FastifyRequest } from 'fastify';

import { OrderLine } from '../../../domain/OrderLine';
import { TypeOrmUnitOfWork } from '../../../infra/db/TypeOrmUnitOfWork';
import { AllocateUseCase } from '../../../useCases/AllocateUseCase';
import { Controller } from './Controller';

export class AllocateController implements Controller {
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
    const unitOfWork = await TypeOrmUnitOfWork.create();
    const batchReference = await new AllocateUseCase(unitOfWork).handle(
      new OrderLine({
        orderId: request.body.orderId,
        sku: request.body.sku,
        quantity: request.body.quantity,
      }),
    );

    reply.code(201).send({ batchReference });
  }
}
