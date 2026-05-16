type UserId = string;

interface Collateral {
  marketId: string;
  amount: number;
  lockedAmount: number;
}

type Collaterals = Record<UserId, Collateral[]>;

export type { Collateral, Collaterals, UserId };
