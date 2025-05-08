import {
  Popover,
  Button,
  Label,
  ListBox,
  ListBoxItem,
  Select,
  SelectValue,
  FieldError,
  Text,
} from 'react-aria-components';
import type {
  SelectProps as _SelectProps,
  ListBoxItemProps,
  MenuItemProps as _MenuItemProps,
  MenuProps as _MenuProps,
  MenuTriggerProps as _MenuTriggerProps,
  PopoverProps,
  ValidationResult,
} from 'react-aria-components';
import { cx } from 'cva';
import React, { forwardRef, type ForwardedRef } from 'react';
// Specs: https://react-spectrum.adobe.com/react-aria/Select.html
/**
<Select>
  <Label>Favorite Animal</Label>
  <Button>
    <SelectValue />
    <span aria-hidden="true">▼</span>
  </Button>
  <Popover>
    <ListBox>
      <ListBoxItem>Aardvark</ListBoxItem>
      <ListBoxItem>Cat</ListBoxItem>
      <ListBoxItem>Dog</ListBoxItem>
      <ListBoxItem>Kangaroo</ListBoxItem>
      <ListBoxItem>Panda</ListBoxItem>
      <ListBoxItem>Snake</ListBoxItem>
    </ListBox>
  </Popover>
</Select>
 */

export interface SelectProps<T extends object>
  extends Omit<_SelectProps<T>, 'children'>,
    Pick<
      PopoverProps,
      | 'placement'
      | 'shouldUpdatePosition'
      | 'shouldFlip'
      | 'offset'
      | 'crossOffset'
      | 'containerPadding'
      | 'triggerRef'
      | 'maxHeight'
    > {
  label?: string;
  labelClassName?: string;
  selectClassName?: string;
  selectValueClassName?: string;
  // triggerEl: React.ReactNode;
  children: React.ReactNode | ((item: T) => React.ReactNode);
  // NOTE: If errorMessage is defined, then helpText will be ignored and replaced by errorMessage.
  helpText?: string | React.ReactNode; // can be error or description text.
  errorMessage?: string | ((v: ValidationResult) => string); // error message or validation function.
  items?: Iterable<T>;
  itemsClassName?: string;
  clearButton?: React.ReactNode;
  buttonRef?: React.Ref<HTMLButtonElement>;
}

const IconChevronDown = ({ size, className }: { size?: string | number; className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size ?? 24}
      height={size ?? 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx('icon icon-tabler', className)}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M6 9l6 6l6 -6" />
    </svg>
  );
};

function AriaSelect<T extends object>(
  {
    // triggerEl,
    // popover props
    placement,
    shouldUpdatePosition,
    shouldFlip,
    offset,
    crossOffset,
    clearButton,
    containerPadding,
    triggerRef,
    className,
    itemsClassName,
    selectClassName,
    selectValueClassName,
    maxHeight,
    // select props
    children,
    items,
    helpText,
    errorMessage,
    buttonRef,
    label,
    labelClassName,
    ...props
  }: SelectProps<T>,
  ref: ForwardedRef<HTMLDivElement>
) {
  const popoverProps = {
    placement,
    shouldUpdatePosition,
    shouldFlip,
    offset,
    crossOffset,
    containerPadding,
    triggerRef,
    maxHeight,
  };

  return (
    <Select {...props} ref={ref} className={selectClassName}>
      {({ isInvalid, isDisabled, isRequired }) => (
        <>
          {label && (
            <Label
              className={cx('mb-1 block font-medium', isInvalid && 'text-error', labelClassName)}>
              {label}
              {isRequired && <span className="mx-0.5 text-error">*</span>}
            </Label>
          )}
          <Button
            className={cx(
              'flex justify-between items-center gap-2 appearance-none w-full bg-transparent text-on-surface font-normal px-4 py-2 h-12 disabled:text-on-surface/40 relative border o:border-gray-400 rounded outline-none focus-visible:outline-none',
              isInvalid
                ? 'border-error text-on-error focus-visible:shadow-[inset_0_0_0_1px_rgb(var(--color-error))] focus-visible:border-error hover:border-on-error-container'
                : 'border-outline text-on-error focus-visible:shadow-[inset_0_0_0_1px_rgb(var(--color-primary))] focus-visible:border-primary hover:border-on-primary-container',
              isDisabled && 'disabled:border-outline/15 disabled:pointer-events-none',
              className
            )}
            ref={buttonRef}>
            <SelectValue
              className={cx(
                'flex items-center gap-2 data-[placeholder]:text-on-surface/60',
                isInvalid && 'data-[placeholder]:text-error text-error',
                isDisabled && 'o:text-on-surface/40',
                selectValueClassName
              )}
            />
            <IconChevronDown
              aria-hidden="true"
              size={16}
              className={`${isInvalid && 'text-error'}`}
            />
          </Button>
          {helpText && !isInvalid && (
            <Text
              slot="description"
              className={cx(
                'text-xs block text-on-surface-variant pt-1 px-4',
                isDisabled && 'o:text-on-surface/40'
              )}>
              {helpText}
            </Text>
          )}

          {/** errorMessage is optional. If not defined, then will use browser native text message. */}
          <FieldError className={cx('text-xs block text-error pt-1 px-4')}>
            {errorMessage}
          </FieldError>

          {clearButton}
          
          <Popover
            {...popoverProps}
            containerPadding={0}
            className={cx(
              'min-w-[--trigger-width] py-2 overflow-auto rounded-md border border-on-secondary-container/[0.08] shadow-[0px_3px_3px_-1.5px_rgba(42,51,70,0.04)] bg-white',
              'entering:animate-in entering:fade-in exiting:animate-out exiting:fade-out',
              itemsClassName
            )}>
            <ListBox items={items}>{children}</ListBox>
          </Popover>
        </>
      )}
    </Select>
  );
}

function AriaListBoxItem(
  { className, ...props }: ListBoxItemProps,
  ref: ForwardedRef<HTMLDivElement>
) {
  return (
    <ListBoxItem
      {...props}
      ref={ref}
      className={cx(
        'h-10 px-3 flex items-center gap-2 cursor-pointer text-on-surface text-sm',
        'selected:font-medium selected:bg-secondary-container selected:text-on-secondary-container',
        'pressed:bg-on-surface/10',
        'focus-visible:-outline-offset-2',
        'hover:bg-on-surface/[0.06] disabled:text-on-surface/40',
        className
      )}
    />
  );
}

// forwardRef doesn't support generic parameters, so cast the result to the correct type
// https://stackoverflow.com/questions/58469229/react-with-typescript-generics-while-using-react-forwardref
const _AriaListBoxItem = /*#__PURE__*/ forwardRef(AriaListBoxItem) as <T>(
  props: ListBoxItemProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => React.ReactElement;

const _CSSSelect = /*#__PURE__*/ forwardRef(AriaSelect) as <T extends object>(
  props: SelectProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => React.ReactElement;

export { _CSSSelect as Select, _AriaListBoxItem as ListBoxItem };
