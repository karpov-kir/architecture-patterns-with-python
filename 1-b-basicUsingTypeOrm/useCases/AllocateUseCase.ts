import { BatchDomainService } from '../domain/BatchDomainService';
import { OrderLine } from '../domain/OrderLine';
import { UseCaseWithUnitOfWork } from './UnitOfWork';

export class AllocateUseCase extends UseCaseWithUnitOfWork<[OrderLine], string> {
  protected async execute(orderLine: OrderLine) {
    const batches = await this.unitOfWork.batchRepository.list();
    const allocatedToBatch = BatchDomainService.allocate(orderLine, batches);

    await this.unitOfWork.batchRepository.save(allocatedToBatch);
    await this.unitOfWork.commit();

    return allocatedToBatch.props.reference;
  }
}
