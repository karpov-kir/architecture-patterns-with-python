import Fastify from 'fastify';

import { OrderLine } from '../domain/OrderLine';
import { KnexUnitOfWork } from '../infra/db/KnexUnitOfWork';
import { AllocateUseCase } from '../useCases/AllocateUseCase';
import { errorHandler } from './errorHandler';

const fastify = Fastify({
  logger: true,
});

fastify.setErrorHandler(errorHandler);

fastify.post<{
  Body: {
    orderId: string;
    sku: string;
    quantity: number;
  };
}>(
  '/allocate',
  {
    schema: {
      body: {
        type: 'object',
        required: ['orderId', 'sku', 'quantity'],
        properties: {
          orderId: {
            type: 'string',
          },
          sku: {
            type: 'string',
          },
          quantity: {
            type: 'number',
          },
        },
      },
    },
  },
  async (request, reply) => {
    const unitOfWork = await KnexUnitOfWork.create();
    const orderLine = new OrderLine(request.body.orderId, request.body.sku, request.body.quantity);
    const batchReference = await new AllocateUseCase(unitOfWork).handle(orderLine);

    reply.code(201).send({ batchReference });
  },
);

export const listen = () => fastify.listen({ port: 3000 });
