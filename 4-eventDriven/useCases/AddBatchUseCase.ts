import { Batch } from '../domain/Batch';
import { AddBatchCommand } from '../domain/commands/AddBatchCommand';
import { Product } from '../domain/Product';
import { CommandHandlerUseCase } from './UnitOfWork';

export class AddBatchUseCase extends CommandHandlerUseCase<AddBatchCommand> {
  protected async execute(createBatchCommand: AddBatchCommand) {
    let product = await this.unitOfWork.productRepository.find(createBatchCommand.props.sku);
    const batch = new Batch({
      ...createBatchCommand.props,
      allocatedOrderLines: [],
    });

    if (!product) {
      product = new Product({ sku: createBatchCommand.props.sku, version: 1, batches: [batch] });
    } else {
      product.addBatch(batch);
    }

    await this.unitOfWork.productRepository.save(product);
    await this.commitAndPublishEvents();
  }
}
