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

    return allocatedToBatch.props.reference;
  }
}
