import { Batch } from '../domain/Batch';
import { Product } from '../domain/Product';
import { UseCaseWithUnitOfWork } from './UnitOfWork';

export class AddBatchUseCase extends UseCaseWithUnitOfWork<[Batch], string> {
  protected async execute(batch: Batch) {
    let product = await this.unitOfWork.productRepository.find(batch.props.sku);

    if (!product) {
      product = new Product({ sku: batch.props.sku, version: 1, batches: [batch] });
    } else {
      product.addBatch(batch);
    }

    await this.unitOfWork.productRepository.save(product);
    await this.unitOfWork.commit();

    return batch.props.reference;
  }
}
