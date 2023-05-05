import React from 'react';
import ReactCardFlip, { ReactFlipCardProps } from 'react-card-flip';

export interface CardProps extends Omit<ReactFlipCardProps, 'children'> {
  cardValue?: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  isChoose?: boolean;
  onClickFrond?: () => void;
  onClickBack?: () => void;
}
function Index({
  cardValue,
  isFlipped,
  isDisabled,
  isLoading,
  isChoose,
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
        className={`flex items-center justify-center w-[12rem] h-[15rem] bg-gradient-to-br from-slate-700 via-slate-800 to-slate-700 rounded-md   shadow-lg    ${
          isDisabled
            ? isChoose
              ? 'opacity-100'
              : 'opacity-50'
            : 'hover:cursor-pointer hover:shadow-slate-700/70  hover:opacity-75'
        }  `}
      >
        {isChoose && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-8 h-8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        )}
        {isLoading && !isChoose && (
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
        className="flex justify-center items-center w-[12rem] h-[15rem] bg-slate-700 rounded-md  "
      >
        <div className="text-sky-500 text-2xl hover:subpixel-antialiased">
          {cardValue}
        </div>
      </div>
    </ReactCardFlip>
  );
}

export default Index;
