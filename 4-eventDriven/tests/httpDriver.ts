import { Batch } from '../domain/Batch';

interface Response<T = unknown> {
  data: T;
  status: number;
}

export const convertResponse = async (responsePromise: ReturnType<typeof fetch>): Promise<Response> => {
  const response = await responsePromise;

  return {
    data: await response.json(),
    status: response.status,
  };
};

export const sendAllocateRequest = (body: { orderId: string; quantity: number; sku: string }): Promise<Response> =>
  convertResponse(
    fetch('http://localhost:3000/allocate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }),
  );

export const sendAddBatchRequest = (batch: Batch) =>
  convertResponse(
    fetch('http://localhost:3000/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference: batch.props.reference,
        sku: batch.props.sku,
        purchasedQuantity: batch.props.purchasedQuantity,
        eta: batch.props.eta?.toISOString(),
      }),
    }),
  );

export const sendGetOrderAllocationsRequest = (orderId: string) =>
  convertResponse(
    fetch(`http://localhost:3000/allocations/${orderId}`, {
      method: 'GET',
    }),
  );
