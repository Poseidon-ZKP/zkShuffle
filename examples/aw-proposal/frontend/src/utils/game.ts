import { Card } from '../hooks/useGame';
import { PlayerInfo } from '../hooks/usePlayer';

export const handleWait = (hand: Card[]) => {
  const newHand = hand.map((item) => {
    const newWait = item.wait === 0 ? 0 : item.wait - 1;
    return {
      ...item,
      wait: newWait,
      isCanAttack: newWait === 0 ? true : false,
    };
  });
  return newHand;
};

export const replaceCard = (
  targetPlayer: PlayerInfo,
  card: Card,
  targetCard: Card,
  targetIndex: number
) => {
  targetCard.hp -= card.attack;

  if (targetCard.hp <= 0) {
    targetPlayer.hand.splice(targetIndex, 1);
  } else {
    targetPlayer.hand.splice(targetIndex, 1, targetCard);
  }
  targetPlayer.deals.push(targetCard);
  return targetPlayer;
};

export const handleDealsOfWaitCards = (hand: Card[]) => {
  const deal = hand.filter((item) => item.wait > 0);
  return deal;
};
