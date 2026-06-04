// Normalized open (unfilled) order. Broker-specific tools map raw orders to this.
// `price` is a plain number in the symbol's quote currency — exchanges do not
// reliably report the quote coin, and inferring it from the symbol is unsafe.
export interface OpenOrder {
  readonly brokerId: string
  readonly orderId: string
  readonly symbol: string
  readonly side: "buy" | "sell"
  readonly orderType: string
  readonly price: number
  readonly quantity: number
  readonly filledQuantity: number
  readonly status: string
  readonly category: string
  readonly createdAt?: string
}
