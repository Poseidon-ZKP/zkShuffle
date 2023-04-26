import React from 'react';
import ReactCardFlip, { ReactFlipCardProps } from 'react-card-flip';

export interface CardProps extends Omit<ReactFlipCardProps, 'children'> {
  cardValue?: string;
  onClickFrond?: () => void;
  onClickBack?: () => void;
}
function Index({
  cardValue,
  onClickFrond,
  onClickBack,
  isFlipped,
  flipDirection = 'horizontal',
  ...cardProps
}: CardProps) {
  return (
    <ReactCardFlip
      isFlipped={isFlipped}
      flipDirection={flipDirection}
      {...cardProps}
    >
      <div
        onClick={onClickFrond}
        className="w-[12rem] h-[15rem] bg-gradient-to-br from-slate-700 via-slate-800 to-slate-700 rounded-md hover:cursor-pointer  shadow-lg hover:shadow-slate-700/70  hover:opacity-75  "
      ></div>

      <div
        onClick={onClickBack}
        className="flex justify-center items-center w-[12rem] h-[15rem] bg-slate-700 rounded-md hover:cursor-pointer hover:opacity-75 "
      >
        <div className="text-sky-500 text-2xl hover:subpixel-antialiased">
          {cardValue}
        </div>
      </div>
    </ReactCardFlip>
  );
}

export default Index;
