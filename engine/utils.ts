import { BALANCES } from ".";
// Utility function for locking balances before an order is placed

function lockBalances(userId: string, assetId: string, amountToLock: number) {
  const userBalance = BALANCES[userId];
  // Check if the user has enough balance to be locked

  const userAsset = userBalance?.find((asset) => {
    asset.assetId === assetId;
  });
  if (userAsset?.amount! < amountToLock) {
    return false;
  } else {
    BALANCES[userId]?.map((asset) => {
      if (asset.assetId === assetId) {
        asset.amount -= amountToLock;
        asset.lockedAmount = amountToLock;
      }
    });
    return true;
  }
}
