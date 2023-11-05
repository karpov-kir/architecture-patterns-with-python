import { Batch } from '../domain/Batch';
import { UseCaseWithUnitOfWork } from './UnitOfWork';

export class AddBatchUseCase extends UseCaseWithUnitOfWork<[Batch], string> {
  protected async execute(batch: Batch) {
    await this.unitOfWork.batchRepository.save(batch);
    await this.unitOfWork.commit();

    return batch.props.reference;
  }
}
