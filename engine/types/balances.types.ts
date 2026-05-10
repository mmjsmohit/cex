type UserId = string;

interface Balance {
  assetId: string;
  amount: number;
  lockedAmount: number;
}

type Balances = Record<UserId, Balance[]>;

export type { Balance, Balances };
