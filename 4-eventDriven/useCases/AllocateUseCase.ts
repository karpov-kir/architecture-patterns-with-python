import { AllocateCommand } from '../domain/commands/AllocateCommand';
import { OrderLine } from '../domain/OrderLine';
import { UnprocessableInputError } from '../shared/errors/UnprocessableInputError';
import { CommandHandlerUseCase } from './UnitOfWork';

export class AllocateUseCase extends CommandHandlerUseCase<AllocateCommand> {
  protected async execute(allocateCommand: AllocateCommand) {
    const product = await this.unitOfWork.productRepository.get(allocateCommand.props.sku);

    const orderLine = new OrderLine(allocateCommand.props);
    const allocatedToBatch = product.allocate(orderLine);

    await this.unitOfWork.productRepository.save(product);
    await this.commitAndPublishEvents();

    if (!allocatedToBatch) {
      throw new UnprocessableInputError(`Out of stock for SKU ${orderLine.props.sku}`);
    }
  }
}
