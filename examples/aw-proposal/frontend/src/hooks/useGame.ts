import { useState } from 'react';
import { CardTypeEnum } from '../components/Card';

export interface UseGameProps {
  creator: string;
  joiner: string;
  address?: `0x${string}`;
}

export enum PlayerType {
  CREATOR = 0,
  JOINER = 1,
}

export interface Card {
  name: string;
  hp: number;
  attack: number;
  type: CardTypeEnum;
  wait: number;
  isCanAttack?: boolean;
  id?: number;
}

const CARD_DECK: Card[] = [
  { name: 'Wizard', hp: 5, attack: 16, type: CardTypeEnum.Wizard, wait: 1 },
  {
    name: 'Warrior',
    hp: 10,
    attack: 11,
    type: CardTypeEnum.Warrior,
    wait: 0,
  },
  { name: 'Tank', hp: 18, attack: 3, type: CardTypeEnum.Tank, wait: 1 },
];

function useGame() {
  const [cardDecks] = useState(CARD_DECK);
  const [turn, setTurn] = useState<number>(1);

  const handleNextTurn = () => {
    setTurn(turn + 1);
  };

  return {
    cardDecks,
    turn,
    handleNextTurn,
  };
}

export default useGame;
