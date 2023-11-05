import { ChangeBatchQuantityCommand } from '../domain/commands/ChangeBatchQuantityCommand';
import { CommandHandlerUseCase } from './UnitOfWork';

export class ChangeBatchQuantityUseCase extends CommandHandlerUseCase<ChangeBatchQuantityCommand> {
  protected async execute(changeBatchQuantityCommand: ChangeBatchQuantityCommand) {
    const product = await this.unitOfWork.productRepository.getByBatchReference(
      changeBatchQuantityCommand.props.batchReference,
    );

    product.changeBatchQuantity(
      changeBatchQuantityCommand.props.batchReference,
      changeBatchQuantityCommand.props.quantity,
    );

    await this.unitOfWork.productRepository.save(product);
    await this.commitAndPublishEvents();
  }
}
