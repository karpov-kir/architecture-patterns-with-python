export class OrderLine {
  constructor(
    public readonly orderId: string,
    public readonly sku: string,
    public readonly quantity: number,
  ) {}
}
