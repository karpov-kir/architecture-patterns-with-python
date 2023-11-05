export abstract class PubSub<Channel, Handler, Data> {
  protected handlers: Map<Channel, Array<Handler>> = new Map();

  protected abstract handle(data: Data, handler: Handler): Promise<void> | undefined;

  public subscribe(channel: Channel, handler: Handler) {
    const handlers = this.handlers.get(channel) || [];
    this.handlers.set(channel, [...handlers, handler]);
  }

  public async publish(channel: Channel, data: Data): Promise<void> {
    const handlers = this.handlers.get(channel) || [];

    for (let i = 0, l = handlers.length; i < l; i++) {
      await this.handle(data, handlers[i]);
    }
  }
}

type MapKey<M> = M extends Map<
  infer K,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
>
  ? K
  : never;
type MapValue<M> = M extends Map<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  infer V
>
  ? V
  : never;

type HandlerPerChannel<C, D> = Map<
  C,
  {
    handle: (data: D) => Promise<void> | undefined;
  }
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HandlerData<M extends HandlerPerChannel<any, any>> = Parameters<MapValue<M>['handle']>[0];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler<M extends HandlerPerChannel<any, any>> = {
  handle: (data: HandlerData<M>) => Promise<void> | undefined;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Channel<M extends HandlerPerChannel<any, any>> = MapKey<M>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class MultiChannelPubSub<M extends HandlerPerChannel<any, any>> extends PubSub<
  Channel<M>,
  Handler<M>,
  HandlerData<M>
> {
  protected async handle(data: HandlerData<M>, handler: Handler<M>): Promise<void> {
    return handler.handle(data);
  }

  public subscribe(channel: Channel<M>, handler: Handler<M>) {
    super.subscribe(channel, handler);
  }

  public async publish(channel: Channel<M>, data: HandlerData<M>): Promise<void> {
    return super.publish(channel, data);
  }
}
