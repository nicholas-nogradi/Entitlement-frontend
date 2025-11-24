const mockEntitlements = [
  {
    entitlementID: "12345",
    sku: "SKU-001",
    product_type: "Software",
    start_date: "2023-01-01T00:00:00Z",
    end_date: "2024-01-01T00:00:00Z",
    quantity: 10,
    status: 'fulfilled'
  },
  {
    entitlementID: "67890",
    sku: "SKU-002",
    product_type: "Service",
    start_date: "2023-06-15T00:00:00Z",
    end_date: "2024-06-15T00:00:00Z",
    quantity: 5,
    status: 'pending'
  },
  {
    entitlementID: "11223",
    sku: "SKU-003",
    product_type: "Subscription",
    start_date: "2023-03-10T00:00:00Z",
    end_date: "2024-03-10T00:00:00Z",
    quantity: 20,
    status: 'canceled'
  },
  {
    entitlementID: "44556",
    sku: "SKU-004",
    product_type: "License",
    start_date: "2023-07-01T00:00:00Z",
    end_date: "2024-07-01T00:00:00Z",
    quantity: 15,
    status: 'fulfilled'
  },
  {
    entitlementID: "77889",
    sku: "SKU-005",
    product_type: "Service",
    start_date: "2023-05-20T00:00:00Z",
    end_date: "2024-05-20T00:00:00Z",
    quantity: 8,
    status: 'pending'
  }
]

  export default mockEntitlements;