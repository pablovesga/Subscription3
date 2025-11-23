export const RecurringPayments = [
  {
    inputs: [{ internalType: "uint256", name: "id", type: "uint256" }],
    name: "payInstallment",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "id", type: "uint256" }],
    name: "getRecord",
    outputs: [
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "address", name: "receiver", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "interval", type: "uint256" },
      { internalType: "uint256", name: "nextPayment", type: "uint256" },
      { internalType: "uint256", name: "installmentsPaid", type: "uint256" },
      { internalType: "uint256", name: "totalInstallments", type: "uint256" },
      { internalType: "bool", name: "isActive", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllRecordIds",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
] as const
