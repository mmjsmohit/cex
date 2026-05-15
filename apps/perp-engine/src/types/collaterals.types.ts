type UserId = string;

interface Collateral {
  assetId: string;
  amount: number;
  lockedAmount: number;
}

type Collaterals = Record<UserId, Collateral[]>;

export type { Collateral, Collaterals, UserId };
