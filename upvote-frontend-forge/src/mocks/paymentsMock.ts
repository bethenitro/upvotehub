
/**
 * Mock data for payment history
 */
export const payments = [
  {
    id: "pay_001",
    amount: 50.00,
    method: "credit_card",
    cardLast4: "4242",
    status: "completed",
    createdAt: "2023-05-16T09:20:00Z",
    description: "Account top-up"
  },
  {
    id: "pay_002",
    amount: 9.99,
    method: "credits",
    status: "completed",
    createdAt: "2023-05-16T09:25:00Z",
    orderId: "ord_001",
    description: "Payment for order ord_001"
  },
  {
    id: "pay_003",
    amount: 19.99,
    method: "credits",
    status: "completed",
    createdAt: "2023-05-16T14:30:00Z",
    orderId: "ord_002",
    description: "Payment for order ord_002"
  },
  {
    id: "pay_004",
    amount: 100.00,
    method: "paypal",
    status: "completed",
    createdAt: "2023-05-15T10:15:00Z",
    description: "Account top-up"
  },
  {
    id: "pay_005",
    amount: 12.99,
    method: "credits",
    status: "completed",
    createdAt: "2023-05-15T11:45:00Z",
    orderId: "ord_003",
    description: "Payment for order ord_003"
  },
  {
    id: "pay_006",
    amount: 25.00,
    method: "crypto",
    status: "pending",
    createdAt: "2023-05-14T16:30:00Z",
    description: "Account top-up"
  }
];
