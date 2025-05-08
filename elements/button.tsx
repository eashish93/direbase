'use client';
import React, { ElementType, forwardRef } from 'react';
import { Button, Link, composeRenderProps } from 'react-aria-components';
import { cva, cx, type VariantProps } from 'cva';
import type { ButtonProps as _ButtonProps, LinkProps as _LinkProps } from 'react-aria-components';

export const buttonStyles = cva({
  // gap-2 used for icon (or loading-icon) and text spacing.
  base: 'inline-flex gap-2 relative items-center justify-center font-medium transition-colors disabled:opacity-45 disabled:shadow-inner disabled:pointer-events-none outline-none rounded-full border',
  variants: {
    variant: {
      filled:
        'bg-black text-white hover:contrast-[1.4]  border-black shadow-[0px_1px_1px_rgba(0,0,0,.1),_inset_0_1.5px_1px_rgba(255,255,255,0.12)] pressed:saturate-[.75] pressed:shadow-inner',
      outline:
        'bg-transparent text-on-surface border-outline hover:bg-outline/10 pressed:shadow-inner pressed:bg-outline/15',
      error:
        'bg-error text-on-error hover:contrast-125 shadow-[0px_1px_1px_rgba(0,0,0,.1),_inset_0_1.5px_1px_rgba(255,255,255,0.12)] pressed:saturate-[.75] pressed:shadow-inner border-error/90',
      text: 'text-on-surface hover:bg-outline/10 pressed:bg-outline/15 border-transparent pressed:saturate-[.75] pressed:shadow-inner',
      link: 'text-primary hover:bg-primary/10 border-transparent pressed:saturate-[.75] pressed:shadow-inner',
      unstyle: 'border-none',
    },
    // single standard size for now. If more size needed, we can override with className instead of defining here.
    // Material recommended 24px left/right padding, but we are doing 20px as it looks much better.
    size: {
      sm: 'px-4 py-1 text-sm h-8',
      md: 'px-5 py-2 text-base h-10',
      lg: 'px-6 py-3 text-lg h-12',
    },
  },

  defaultVariants: {
    variant: 'filled',
    size: 'md',
  },
});

const LoadingSvgIcon = ({ size, className }: { size: number; className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      strokeWidth="2"
      viewBox="0 0 24 24">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
};

export interface ButtonProps
  extends _ButtonProps,
    VariantProps<typeof buttonStyles>,
    Omit<_LinkProps, 'className' | 'style' | 'children'> {
  as?: 'button' | 'a';
  isLoading?: boolean;
  isIconOnly?: boolean;
  disableRipple?: boolean;
  children?: React.ReactNode;
}

function AriaButton<T extends ElementType>(
  {
    variant,
    size,
    isLoading,
    isIconOnly,
    className,
    disableRipple = false,
    children,
    as,
    ...props
  }: ButtonProps,
  ref: React.ComponentPropsWithRef<T>
) {
  const Element = as === 'a' ? Link : Button;

  return (
    <Element
      ref={ref}
      // composeRenderProps helper is useful when we want to pass some props to className in button component.
      // className={composeRenderProps(className, (className, renderProps) => button({
      //   variant,
      //   size,
      //   className: cx(`
      //     className,
      //     isLoading && 'text-transparent opacity-60  pointer-events-none',
      //     isIconOnly && 'size-9 p-1'
      //   ),
      //   ...renderProps
      // }))}
      className={buttonStyles({
        variant,
        size,
        className: cx(
          isLoading && 'o:text-transparent o:opacity-60  o:pointer-events-none',
          isIconOnly && (size === 'sm' ? 'o:size-8 o:p-0.5' : 'o:size-10 o:p-1'),
          className
        ),
      })}
      {...props}>
      <>
        {isLoading ? (
          <>
            <LoadingSvgIcon
              size={20}
              className={cx(
                'animate-spin absolute',
                !variant || ['filled', 'error', 'tonal'].includes(variant!)
                  ? 'text-on-primary'
                  : 'text-primary'
              )}
            />
            {children}
          </>
        ) : (
          children
        )}
      </>
    </Element>
  );
}

const _Button = /*#__PURE__*/ forwardRef(AriaButton);

export { _Button as Button };
