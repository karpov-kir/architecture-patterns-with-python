import { OrderLine } from '../domain/OrderLine';
import { UnprocessableInputError } from '../shared/errors/UnprocessableInputError';
import { UseCaseWithUnitOfWork } from './UnitOfWork';

export class AllocateUseCase extends UseCaseWithUnitOfWork<[OrderLine], string> {
  protected async execute(orderLine: OrderLine) {
    const product = await this.unitOfWork.productRepository.find(orderLine.props.sku);

    if (!product) {
      throw new UnprocessableInputError(`Invalid SKU ${orderLine.props.sku}`);
    }

    const allocatedToBatch = product.allocate(orderLine);

    await this.unitOfWork.productRepository.save(product);
    await this.unitOfWork.commit();

    // If we want this error to propagate up to the controller, we need to throw it here and
    // it must be thrown after `unitOfWork.commit()` is called, because `unitOfWork.commit()` also publishes gathered events.
    // I think the event publishing step should be moved outside of the `unitOfWork.commit()` method.
    if (!allocatedToBatch) {
      throw new UnprocessableInputError(`Out of stock for SKU ${orderLine.props.sku}`);
    }

    return allocatedToBatch.props.reference;
  }
}
