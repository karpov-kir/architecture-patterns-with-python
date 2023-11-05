import { FastifyReply, FastifyRequest } from 'fastify';

import { OrderLine } from '../../../domain/OrderLine';
import { AllocateUseCase } from '../../../useCases/AllocateUseCase';
import { UnitOfWorkPort } from '../../../useCases/UnitOfWork';
import { Controller } from './Controller';

export class AllocateController implements Controller {
  constructor(private readonly unitOfWorkFactory: () => Promise<UnitOfWorkPort>) {}

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
    const unitOfWork = await this.unitOfWorkFactory();
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
