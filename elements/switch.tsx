import { Switch } from 'react-aria-components';
import type { SwitchProps as _SwitchProps } from 'react-aria-components';
import { cx } from 'cva';
import React, { forwardRef, type ForwardedRef } from 'react';

interface SwitchProps extends Omit<_SwitchProps, 'children'> {
  // optional children.
  children?: React.ReactNode;
  // if fullWidth is given, then we will use justify-between between the label and the switch.
  fullWidth?: boolean;
  // To put the switch on the left of the label or on the right of the label.
  align?: 'left' | 'right';
  size?: 'xs' | 'sm' | 'md';
}

const IconCheck = ({ className, size }: { className?: string; size?: number }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size ?? 24}
      height={size ?? 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M5 12l5 5l10 -10" />
    </svg>
  );
};

function AriaSwitch(
  { className, fullWidth, size = 'md', align = 'left', children, ...props }: SwitchProps,
  ref: ForwardedRef<HTMLLabelElement>
) {
  return (
    <Switch
      {...props}
      ref={ref}
      className={cx(
        'group flex items-center',
        fullWidth ? 'justify-between w-full gap-16' : 'justify-start gap-2',
        className
      )}>
      {({ isSelected }) => (
        <>
          <div
            className={cx(
              align === 'right' ? 'order-last' : 'order-first',
              size === 'sm' ? 'h-7 w-[44px]' : size === 'xs' ? 'h-6 w-[36px]' : 'h-8 w-[52px]',
              size === 'md' ? 'border-[1.5px]' : 'border',
              'flex items-center transition duration-300 ease-in-out rounded-full cursor-default border-outline outline-none',
              // normal (unselected)
              'bg-surface',
              // pressed
              'group-pressed:bg-surface-variant',
              // selected
              'group-selected:bg-primary group-selected:border-primary',
              // disabled
              'group-disabled:opacity-40 group-disabled:group-selected:bg-on-surface group-disabled:group-selected:border-on-surface ',
              // focus
              'group-focus-visible:border-on-surface-variant group-focus-visible:group-selected:border-primary-container'
            )}>
            {/** handle */}
            <span
              className={cx(
                'inline-flex items-center justify-center transform shadow transition duration-300 ease-in-out  rounded-full translate-x-1 group-selected:translate-x-[calc(100%-1.5px)]',
                size === 'sm' ? 'size-3.5' : size === 'xs' ? 'size-2.5' : 'size-4',
                // normal (unselected)
                'bg-outline',
                // pressed
                'group-pressed:scale-[1.4]',
                // selected
                'group-selected:bg-on-primary',
                size === 'sm'
                  ? 'group-selected:size-[20px]'
                  : size === 'xs'
                    ? 'group-selected:size-[16px]'
                    : 'group-selected:size-6',
                // selected (pressed)
                'group-selected:group-pressed:scale-110',
                // hovered (and hovered+selected)
                'group-hover:bg-on-surface-variant group-hover:group-selected:bg-primary-container',
                // focused
                'group-focus-visible:bg-on-surface-variant group-focus-visible:group-selected:bg-primary-container'
              )}>
              {isSelected && (
                <IconCheck
                  size={size === 'sm' ? 12 : size === 'xs' ? 10 : 14}
                  className="text-primary group-hovered:text-on-primary-container"
                />
              )}
            </span>
          </div>
          <div className="max-w-[58%] md:max-w-[76%]">{children}</div>
        </>
      )}
    </Switch>
  );
}

const _Switch = /*#__PURE__*/ forwardRef(AriaSwitch);

export { _Switch as Switch };
