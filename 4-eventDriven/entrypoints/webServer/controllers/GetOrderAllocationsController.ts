import { FastifyReply, FastifyRequest } from 'fastify';

import { TypeOrmConnectionPool } from '../../../infra/db/TypeOrmConnectionPool';
import { getOrderAllocations } from '../../../infra/db/views/GetOrderAllocations';
import { Controller } from './Controller';

export class GetOrderAllocationsController implements Controller {
  async handle(
    request: FastifyRequest<{
      Params: {
        orderId: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    const orderAllocations = await getOrderAllocations(
      request.params.orderId,
      await TypeOrmConnectionPool.getInstance(),
    );

    reply.code(200).send(orderAllocations);
  }
}
