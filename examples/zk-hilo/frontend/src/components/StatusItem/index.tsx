import useTransaction from '../../hooks/useWriteContract';
import Button, { IButtonProps } from '../Button';

export interface StatusItem {
  label: string;
  statusLabel: string;
  isShowText: boolean;
  buttonStatus: ReturnType<typeof useTransaction>;
  uiStatus: boolean;
  buttonProps: IButtonProps;
}

function Index({
  label,
  statusLabel,
  isShowText,
  buttonStatus,
  uiStatus,

  buttonProps,
}: StatusItem) {
  return (
    <div className="flex items-center p-4 sm:p-6 lg:p-4 xl:p-6 ">
      <dt className="w-36 flex-none text-slate-900 font-medium dark:text-slate-300 transition-opacity duration-[1.5s] delay-500 opacity-25">
        {label}
      </dt>
      <dd className="flex items-center gap-10 transition-opacity duration-[1.5s] delay-500 opacity-100">
        {isShowText ? (
          statusLabel
        ) : uiStatus ? (
          <Button
            isSuccess={buttonStatus.isSuccess}
            isLoading={buttonStatus.isLoading}
            isError={buttonStatus.isError}
            {...buttonProps}
          >
            {buttonProps?.children}
          </Button>
        ) : (
          'waiting'
        )}
      </dd>
    </div>
  );
}

export default Index;
