import Fastify from 'fastify';

import { errorHandler } from './errorHandler';
import { Controllers, createRoutes, Route } from './routes';

export class WebServer {
  #isListening = false;

  constructor(controllers: Controllers) {
    this.fastify.setErrorHandler(errorHandler);
    this.registerRoutes(createRoutes(controllers));
  }

  public isListening() {
    return this.#isListening;
  }

  private fastify = Fastify({
    logger: true,
  });

  private registerRoutes(routes: Route[]) {
    this.fastify.register(async function publicContext(childServer) {
      routes.forEach((route) => {
        childServer.route({
          method: route.method,
          schema: route.schema,
          url: route.path,
          handler: (request, reply) => route.controller.handle(request, reply),
        });
      });
    });
  }

  public async start() {
    const address = await this.fastify.listen({ port: 3000 });
    this.#isListening = true;
    console.log(`Server is listening on ${address}`);
  }

  public async stop(): Promise<void> {
    await this.fastify.close();
    this.#isListening = false;
  }
}
