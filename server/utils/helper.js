// Sequence Checker
export const sequenceChecker = ([a, b, c]) => {
  return (a === 1 && b === 12 && c === 13) || (b === a + 1 && c === b + 1);
};

// Same Rank or Suit Checker
export const sameRankOrSuitChecker = (set) => set.size === 1;
// Doube Checker Function

export const doubleChecker = (set) => set.size === 2;

// getHighestCard
export const getHighestCard = (sortedArr) => sortedArr[2];
