import {
  Column,
  Entity as TypeOrmEntity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Batch } from '../../domain/Batch';
import { OrderLine } from '../../domain/OrderLine';
import { Product } from '../../domain/Product';
import { ProductRepository } from '../../useCases/UnitOfWork';
import { TypeOrmSession } from './TypeOrmSession';

const postgresIdMetaKey = Symbol('postgresId');

@TypeOrmEntity('products')
export class ProductRecord {
  @PrimaryColumn()
  public sku!: string;

  @Column()
  public version!: number;

  @OneToMany(() => BatchRecord, (batchRecord) => batchRecord.product, {
    cascade: true,
    eager: true,
  })
  public batches?: BatchRecord[];
}

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
    eager: true,
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

  @ManyToOne(() => ProductRecord, (product) => product.batches, {
    eager: false,
    cascade: false,
  })
  @JoinColumn({ name: 'sku' })
  public product?: ProductRecord;

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

export class TypeOrmProductsRepository implements ProductRepository {
  constructor(private readonly session: TypeOrmSession) {}

  public readonly seen: Product[] = [];

  private addToSeenAndReturn(product: Product): Product {
    this.seen.push(product);

    return product;
  }

  public async save(product: Product): Promise<void> {
    const savedProductRecord = await this.session.manager.getRepository(ProductRecord).save(toPersistance(product));

    injectPostgresIdMeta(product, savedProductRecord);
  }

  public async find(sku: string): Promise<Product | undefined> {
    const productRecord = await this.session.manager.getRepository(ProductRecord).findOne({
      where: {
        sku,
      },
    });

    if (!productRecord) {
      return undefined;
    }

    return this.addToSeenAndReturn(fromPersistance(productRecord));
  }

  public async get(sku: string): Promise<Product> {
    return this.addToSeenAndReturn(
      fromPersistance(
        await this.session.manager.getRepository(ProductRecord).findOneOrFail({
          where: {
            sku,
          },
          relations: ['batches'],
        }),
      ),
    );
  }
}

/**
 * Pass DB IDs that don't make sense to the domain model through the meta property to avoid them leaking into the domain model props.
 *  - `OrderLine` is a value object, which should not have an ID, but we still want to store it in the DB, so we need an ID.
 *  - `Batch` is an entity, which is identified by the `reference` field. While it's true that the `reference` could be used as the primary key in the DB,
 *     but since it can be a quite long arbitrary text, it's been decided to use an auto-incremented ID instead.
 * - `Product` is referenced by the `sku` field, so the ID injection is not needed.
 */
const setPostgresId = ({ meta }: { readonly meta: Record<string | symbol, unknown> }, id?: number) => {
  meta[postgresIdMetaKey] = id;
};
const getPostgresId = ({ meta }: { readonly meta: Record<string | symbol, unknown> }): number | undefined =>
  meta[postgresIdMetaKey] as number | undefined;

const injectPostgresIdMeta = (product: Product, productRecord: ProductRecord) => {
  product.props.batches.forEach((batch) => {
    const batchRecord = productRecord.batches?.find((batchRecord) => batchRecord.reference === batch.props.reference);

    setPostgresId(batch, batchRecord?.id);

    batch.props.allocatedOrderLines.forEach((orderLine) => {
      setPostgresId(
        orderLine,
        batchRecord?.allocatedOrderLines?.find(
          (orderLineRecord) =>
            orderLineRecord.orderId === orderLine.props.orderId &&
            orderLineRecord.orderId === orderLine.props.orderId &&
            orderLineRecord.sku === orderLine.props.sku,
        )?.id,
      );
    });
  });
};

export const fromPersistance = (productRecord: ProductRecord): Product => {
  const batches = (productRecord.batches ?? []).map((batchRecord) => {
    const orderLines = (batchRecord.allocatedOrderLines ?? []).map(
      (orderLineRecord) =>
        new OrderLine({
          orderId: orderLineRecord.orderId,
          sku: orderLineRecord.sku,
          quantity: orderLineRecord.quantity,
        }),
    );

    return new Batch({
      reference: batchRecord.reference,
      sku: batchRecord.sku,
      purchasedQuantity: batchRecord.purchasedQuantity,
      allocatedOrderLines: orderLines,
      // Set to undefined instead of null
      eta: batchRecord.eta || undefined,
    });
  });

  const product = new Product({
    sku: productRecord.sku,
    version: productRecord.version,
    batches,
  });

  injectPostgresIdMeta(product, productRecord);

  return product;
};

const toPersistance = (product: Product): ProductRecord => {
  const batchRecords = product.props.batches.map((publicBatchEntity) => {
    const { props: batchProperties } = publicBatchEntity;
    const orderLineRecords: OrderLineRecord[] = batchProperties.allocatedOrderLines.map((orderLine) => ({
      id: getPostgresId(orderLine),
      orderId: orderLine.props.orderId,
      sku: orderLine.props.sku,
      quantity: orderLine.props.quantity,
    }));

    const batchRecord: BatchRecord = {
      id: getPostgresId(publicBatchEntity),
      reference: batchProperties.reference,
      sku: batchProperties.sku,
      purchasedQuantity: batchProperties.purchasedQuantity,
      allocatedOrderLines: orderLineRecords,
      eta: batchProperties.eta ? new Date(batchProperties.eta.getTime()) : undefined,
    };

    return batchRecord;
  });

  const productRecord: ProductRecord = {
    sku: product.props.sku,
    version: product.props.version,
    batches: batchRecords,
  };

  return productRecord;
};
