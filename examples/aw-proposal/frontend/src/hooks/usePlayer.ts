import React, { useState } from 'react';
import { Card } from './useGame';
import { CardTypeEnum } from '../components/Card';
import { handleWait } from '../utils/game';

export enum PlayerType {
  CREATOR = 0,
  JOINER = 1,
}

export interface PlayerInfo {
  userType: PlayerType;
  hp: number;
  hand: Card[];
  deck: Card[];
  deals: Card[];
}

export const MOCK_DECK = [
  {
    id: 1,
    name: 'Wizard',
    hp: 5,
    attack: 16,
    type: CardTypeEnum.Wizard,
    wait: 1,
  },
  {
    id: 2,
    name: 'Wizard',
    hp: 5,
    attack: 16,
    type: CardTypeEnum.Wizard,
    wait: 1,
  },
  {
    id: 3,
    name: 'Warrior',
    hp: 10,
    attack: 11,
    type: CardTypeEnum.Warrior,
    wait: 0,
  },
  { id: 4, name: 'Tank', hp: 18, attack: 3, type: CardTypeEnum.Tank, wait: 1 },
  {
    id: 5,
    name: 'Wizard',
    hp: 5,
    attack: 16,
    type: CardTypeEnum.Wizard,
    wait: 1,
  },
  {
    id: 6,
    name: 'Warrior',
    hp: 10,
    attack: 11,
    type: CardTypeEnum.Warrior,
    wait: 0,
  },
  { id: 7, name: 'Tank', hp: 18, attack: 3, type: CardTypeEnum.Tank, wait: 1 },
  {
    id: 8,
    name: 'Wizard',
    hp: 5,
    attack: 16,
    type: CardTypeEnum.Wizard,
    wait: 1,
  },
  {
    id: 9,
    name: 'Warrior',
    hp: 10,
    attack: 11,
    type: CardTypeEnum.Warrior,
    wait: 0,
  },
  { id: 10, name: 'Tank', hp: 18, attack: 3, type: CardTypeEnum.Tank, wait: 1 },
];

export const MOCK_DECK_RESULT = MOCK_DECK.map((item) => {
  return {
    ...item,
    isCanAttack: item.wait === 0 ? true : false,
  };
});

export const DEFAULT_PLAYER = {
  hp: 100,
  hand: [],
  deals: [],
  deck: MOCK_DECK_RESULT,
};

export interface UsePlayerProps {
  userType: PlayerType;
}

export type UsePlayerReturn = ReturnType<typeof Index>;

function Index({ userType }: UsePlayerProps) {
  const [player, setPlayer] = useState<PlayerInfo>({
    ...DEFAULT_PLAYER,
    userType,
  });
  const [currentCard, setCurrentCard] = useState<number>();
  const handlePushHand = (deckIdx: number) => {
    const newDeck = [...player.deck];
    const newHand = [...player.hand];
    const card = newDeck.splice(deckIdx, 1)[0];
    newHand.push(card);
    setPlayer({
      ...player,
      deck: newDeck,
      hand: newHand,
    });
  };

  return {
    player,
    currentCard,
    handlePushHand,
    setPlayer,
    setCurrentCard,
  };
}

export default Index;
