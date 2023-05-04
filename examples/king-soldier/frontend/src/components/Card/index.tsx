import React from 'react';
import ReactCardFlip, { ReactFlipCardProps } from 'react-card-flip';

export interface CardProps extends Omit<ReactFlipCardProps, 'children'> {
  cardValue?: string;
  isLoading?: boolean;
  isDisabled: boolean;
  onClickFrond?: () => void;
  onClickBack?: () => void;
}
function Index({
  cardValue,
  isFlipped,
  isDisabled,
  isLoading,
  flipDirection = 'horizontal',
  onClickFrond,
  onClickBack,
  ...cardProps
}: CardProps) {
  return (
    <ReactCardFlip
      isFlipped={isFlipped}
      flipDirection={flipDirection}
      {...cardProps}
    >
      <div
        onClick={() => {
          !isDisabled && onClickFrond?.();
        }}
        className={`flex items-center justify-center w-[12rem] h-[15rem] bg-gradient-to-br from-slate-700 via-slate-800 to-slate-700 rounded-md hover:cursor-pointer  shadow-lg hover:shadow-slate-700/70   ${
          isDisabled ? 'hover:opacity-25' : 'hover:opacity-75'
        }  `}
      >
        {isLoading && (
          <svg
            className={`animate-spin -ml-1 mr-3  w-12 h-12 text-white`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
      </div>

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
