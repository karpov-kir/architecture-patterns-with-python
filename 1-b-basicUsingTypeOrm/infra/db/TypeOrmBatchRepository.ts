import { Column, Entity as TypeOrmEntity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';

import { Batch } from '../../domain/Batch';
import { OrderLine } from '../../domain/OrderLine';
import { BatchRepository } from '../../useCases/UnitOfWork';
import { TypeOrmSession } from './TypeOrmSession';

const postgresIdMetaKey = Symbol('postgresId');

@TypeOrmEntity('batches')
export class BatchRecord {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Column()
  public reference!: string;

  @Column()
  public sku!: string;

  @Column({
    name: 'purchasedQuantity',
  })
  public purchasedQuantity!: number;

  @ManyToMany(() => OrderLineRecord, {
    cascade: true,
  })
  @JoinTable({
    name: 'allocations',
    joinColumn: {
      name: 'batchId',
    },
    inverseJoinColumn: {
      name: 'orderLineId',
    },
  })
  public allocatedOrderLines?: OrderLineRecord[];

  @Column()
  public eta?: Date;
}

@TypeOrmEntity('orderLines')
export class OrderLineRecord {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Column({
    name: 'orderId',
  })
  public orderId!: string;

  @Column()
  public sku!: string;

  @Column()
  public quantity!: number;
}

export class TypeOrmBatchRepository implements BatchRepository {
  constructor(private readonly session: TypeOrmSession) {}

  public async save(batch: Batch): Promise<void> {
    await this.session.manager.getRepository(BatchRecord).save(toPersistance(batch));
  }

  public async get(reference: string): Promise<Batch> {
    return fromPersistance(
      await this.session.manager.getRepository(BatchRecord).findOneOrFail({
        where: {
          reference,
        },
      }),
    );
  }

  public async list(): Promise<Batch[]> {
    const batchRecords = await this.session.manager.getRepository(BatchRecord).find({
      relations: ['allocatedOrderLines'],
    });

    return batchRecords.map(fromPersistance);
  }
}

/**
 * Pass DB IDs that don't make sense to the domain model through the meta property to avoid them leaking into the domain model props.
 *  - `OrderLine` is a value object, which should not have an ID, but we still want to store it in the DB, so we need an ID.
 *  - `Batch` is an entity, which is identified by the `reference` field. While it's true that the `reference` could be used as the primary key in the DB,
 *     but since it can be a quite long arbitrary text, it's been decided to use an auto-incremented ID instead.
 */
const setPostgresId = ({ meta }: { readonly meta: Record<string | symbol, unknown> }, id?: number) => {
  meta[postgresIdMetaKey] = id;
};
const getPostgresId = ({ meta }: { readonly meta: Record<string | symbol, unknown> }): number | undefined =>
  meta[postgresIdMetaKey] as number | undefined;

export const fromPersistance = (batchRecord: BatchRecord): Batch => {
  const orderLines = (batchRecord.allocatedOrderLines ?? []).map((orderLineRecord) => {
    const orderLine = new OrderLine({
      orderId: orderLineRecord.orderId,
      sku: orderLineRecord.sku,
      quantity: orderLineRecord.quantity,
    });

    setPostgresId(orderLine, orderLineRecord.id);

    return orderLine;
  });

  const batch = new Batch({
    reference: batchRecord.reference,
    sku: batchRecord.sku,
    purchasedQuantity: batchRecord.purchasedQuantity,
    allocatedOrderLines: orderLines,
    eta: batchRecord.eta,
  });

  setPostgresId(batch, batchRecord.id);

  return batch;
};

const toPersistance = (batch: Batch): BatchRecord => {
  const orderLineRecords = batch.props.allocatedOrderLines.map((orderLine) => ({
    id: getPostgresId(orderLine),
    orderId: orderLine.props.orderId,
    sku: orderLine.props.sku,
    quantity: orderLine.props.quantity,
  }));

  const batchRecord: BatchRecord = {
    id: getPostgresId(batch),
    reference: batch.props.reference,
    sku: batch.props.sku,
    purchasedQuantity: batch.props.purchasedQuantity,
    allocatedOrderLines: orderLineRecords,
    eta: batch.props.eta ? new Date(batch.props.eta.getTime()) : undefined,
  };

  return batchRecord;
};
