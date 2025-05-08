import {
  Button,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  FieldError,
  Text,
  Input,
  ComboBox,
  ComboBoxStateContext,
} from 'react-aria-components';
import type {
  ListBoxItemProps,
  ValidationResult,
  Key,
  Selection,
  ComboBoxProps as AriaComboBoxProps,
  PopoverProps,
} from 'react-aria-components';
import { cx } from 'cva';
import React, {
  forwardRef,
  type ForwardedRef,
  useState,
  useRef,
  useEffect,
  useMemo,
  useContext,
} from 'react';
import { useFilter } from 'react-aria';
import { ComboBoxState } from 'react-stately';

// Simple down arrow icon
const IconChevronDown = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4 6L8 10L12 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Simple X icon for removing tags
const IconX = ({ size = 12 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg">
    <path
      d="M9 3L3 9M3 3L9 9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export interface MultiSelectProps<T extends object>
  extends Omit<
      AriaComboBoxProps<T>,
      'children' | 'onSelectionChange' | 'items' | 'selectedKey' | 'defaultSelectedKey'
    >,
    Partial<{
      label: string;
      helpText: string | React.ReactNode;
      errorMessage: string | ((v: ValidationResult) => string);
      placeholder: string;
      // normal means label above inpu and outlined means floating material input.
      // Default is outlined.
      variant: 'outlined' | 'normal';
      inputClassName: string;
      itemsClassName?: string;
      selectedKeys: Selection;
      defaultSelectedKeys: Selection;
      stateRef: ForwardedRef<ComboBoxState<any>>;
      onSelectionChange?: (keys: Selection) => void;
    }>,
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
  items: Iterable<T>;
  children: React.ReactNode | ((item: T) => React.ReactNode);
  // This is required for some advanced usage as unlike TextField, ComboBox doesn't expose onInput and other important iput events.
  onInput?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// Access the ComboBoxStateContext in a child component
const ComboBoxStateCapture = ({ stateRef }: { stateRef: ForwardedRef<ComboBoxState<any>> }) => {
  const state = useContext(ComboBoxStateContext);
  useEffect(() => {
    if (stateRef && typeof stateRef === 'object') {
      stateRef.current = state;
    }
  }, [state, stateRef]);
  return null;
};

function AriaMultiSelect<T extends object>(
  {
    label,
    children,
    items,
    helpText,
    errorMessage,
    className,
    onInput,
    placeholder = 'Select options',
    variant = 'outlined',
    inputClassName,
    itemsClassName,
    selectedKeys: externalSelectedKeys,
    defaultSelectedKeys,
    onSelectionChange: externalOnSelectionChange,
    stateRef,
    // popover props
    placement,
    shouldUpdatePosition,
    shouldFlip,
    offset,
    crossOffset,
    containerPadding,
    triggerRef,
    maxHeight,
    ...props
  }: MultiSelectProps<T>,
  ref: ForwardedRef<HTMLInputElement>
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

  // Local selection state if not controlled externally
  const [localSelectedKeys, setLocalSelectedKeys] = useState<Selection>(
    defaultSelectedKeys || new Set([])
  );
  let { startsWith } = useFilter({ sensitivity: 'base' });

  // For input value in ComboBox
  const [inputValue, setInputValue] = useState('');

  // Use controlled or uncontrolled selection
  const selectedKeys =
    externalSelectedKeys !== undefined ? externalSelectedKeys : localSelectedKeys;

  const filteredItems = useMemo(() => {
    return Array.from(items).filter((item) => {
      // First filter by input text
      const matchesInput = startsWith(String((item as any).name || ''), inputValue);

      // Then exclude already selected items
      const itemKey = String((item as any).id);
      const isSelected =
        typeof selectedKeys !== 'string' &&
        selectedKeys &&
        Array.from(selectedKeys).some((key) => String(key) === itemKey);

      // Return only items that match input AND are not already selected
      return matchesInput && !isSelected;
    });
  }, [items, inputValue, selectedKeys]);

  // Handle selection change
  const handleSelectionChange = (key: Key | null) => {
    if (key && typeof selectedKeys !== 'string') {
      // Create a new set with the existing keys
      const newKeys = new Set(selectedKeys);

      // Add the key if it doesn't exist, otherwise remove it
      if (newKeys.has(key)) {
        newKeys.delete(key);
      } else {
        newKeys.add(key);
      }

      // Update selection
      if (externalOnSelectionChange) {
        externalOnSelectionChange(newKeys);
      } else {
        setLocalSelectedKeys(newKeys);
      }

      // Clear input value after selection
      setInputValue('');
    }
  };

  // Reference to the input wrapper for positioning the popover
  const inputWrapperRef = useRef<HTMLDivElement>(null);

  // Filter function for ComboBox that filters by input text and excludes selected items

  // Remove a selected item
  const removeItem = (key: Key) => {
    if (typeof selectedKeys !== 'string') {
      const newKeys = new Set(selectedKeys);
      newKeys.delete(key);

      if (externalOnSelectionChange) {
        externalOnSelectionChange(newKeys);
      } else {
        setLocalSelectedKeys(newKeys);
      }
    }
  };

  // Get display text for a key
  const getDisplayText = (key: Key): string => {
    // Look up in items array directly - this is now our single source of truth
    const item = Array.from(items).find((item) => String((item as any).id) === String(key));

    if (item) {
      return String((item as any).name || key);
    }

    // If not found, return the key itself
    return String(key);
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If Backspace is pressed while input is empty, remove the last selected item
    if (e.key === 'Backspace' && inputValue === '' && typeof selectedKeys !== 'string') {
      const keysArray = Array.from(selectedKeys);
      if (keysArray.length > 0) {
        const lastKey = keysArray[keysArray.length - 1];
        removeItem(lastKey);
        // Prevent default behavior
        e.preventDefault();
        e.stopPropagation();
      }
    }
  };

  // Add this at the beginning of the component function, before the return statement
  const hasSelectedItems =
    selectedKeys && typeof selectedKeys !== 'string' && Array.from(selectedKeys).length > 0;

  return (
    <ComboBox
      inputValue={inputValue}
      onInputChange={setInputValue}
      onSelectionChange={handleSelectionChange}
      menuTrigger="focus"
      items={filteredItems}
      aria-label={label}
      ref={inputWrapperRef}
      selectedKey={null} // Force no single selection
      {...props}>
      {({ isInvalid, isDisabled }) => (
        <>
          {/** expose combobox methods (open, toggle) */}
          {stateRef && <ComboBoxStateCapture stateRef={stateRef} />}
          {label && variant === 'normal' && (
            <Label
              className={cx(
                'mb-1 block font-medium',
                isInvalid &&
                  'text-error has-[~.rac-input-wrapper_.rac-input:hover:not(:focus)]:text-on-error-container'
              )}>
              {label}
              {props.isRequired && <span className="mx-0.5 text-error">*</span>}
            </Label>
          )}
          <div
            className={cx(
              // using focus-within, we are applying shadow and border on parent. Also hiding top border when placeholder is not shown and on disabled state.
              // Using translateZ or translate3d to force GPU rendering which fix wierd box shadow bug in safari (still preset in 17+)
              // NOTE: Don't set h-14 instead of min-h-14, otherwise textarea will have fixed height.
              'rac-input-wrapper relative flex min-h-14 border rounded transition [transform:translateZ(0)]',
              // color variants (either invalid aka error or default primary)
              // Doing like this just for readability.
              // Also we can't use focus-within selector, as if button icon is there inside, then clicking on it will also trigger that which we don't want.
              !isInvalid
                ? 'border-outline has-[.rac-input:focus]:border-primary has-[.rac-input:focus]:shadow-[inset_1px_0_rgb(var(--color-primary)),inset_0_-1px_rgb(var(--color-primary)),inset_-1px_0_rgb(var(--color-primary))]'
                : 'border-error has-[.rac-input:focus]:border-error has-[.rac-input:focus]:shadow-[inset_1px_0_rgb(var(--color-error)),inset_0_-1px_rgb(var(--color-error)),inset_-1px_0_rgb(var(--color-error))]',

              // at the end to override all other styles of this.
              label &&
                variant === 'outlined' &&
                'has-[.rac-input:not(:placeholder-shown,:disabled)]:border-t-transparent has-[.rac-input:focus]:border-t-transparent',

              // if label is not provided or variant is normal, then apply full box-shadow.
              !isInvalid
                ? (!label || variant === 'normal') &&
                    'o:has-[.rac-input:focus]:shadow-[inset_0_0_0_1px_rgb(var(--color-primary))]'
                : (!label || variant === 'normal') &&
                    'o:has-[.rac-input:focus]:shadow-[inset_0_0_0_1px_rgb(var(--color-error))]',

              // disabled
              isDisabled && 'o:border-outline/15',
              // When both label, value and input is disabled.
              isDisabled &&
                label &&
                'o:has-[.rac-input:not(:placeholder-shown)]:border-t-transparent',
              // isInvalid &&
              //   label &&
              //   variant === 'outlined' &&
              //   'has-[.rac-input:hover:not(:focus,:placeholder-shown)]:border-t-transparent',

              // hover part
              'has-[.rac-input:hover:not(:focus)]:border-on-primary-container',
              // hover + error (invalid) part. This will override above hover part.
              isInvalid && 'has-[.rac-input:hover:not(:focus)]:border-on-error-container',
              // hover for both (error and primary - remove top border only for outlined variant)
              label &&
                variant === 'outlined' &&
                'has-[.rac-input:hover:not(:focus,:placeholder-shown)]:border-t-transparent',

              // remove top border
              hasSelectedItems &&
                label &&
                variant === 'outlined' &&
                'border-t-transparent hover:!border-t-transparent',

              // extra className (use with care)
              // This can be used for overriding min-height. But use it only when variant is set to normal.
              inputClassName
            )}>
            <div className="flex w-full flex-wrap flex-row gap-x-1.5 gap-y-1.5 my-2.5  items-center pl-3">
              {/** For variant === outlined */}
              {label && variant === 'outlined' && (
                <Label
                  className={cx(
                    // NOTE: translate-y and top-1/2 will not work here with width/height and transition as we need to transition translate of only text without before/after. So using line-height.

                    'absolute flex w-[calc(100%+2px)] h-full truncate left-[-1px] top-[-1px] !overflow-visible transition-all font-normal pointer-events-none',
                    // focus
                    'has-[~.rac-input:focus]:text-sm has-[~.rac-input:focus]:font-medium',

                    // For floating label movement.
                    'has-[~.rac-input:not(:placeholder-shown)]:text-sm has-[~.rac-input:not(:placeholder-shown)]:font-medium leading-[3.4] has-[~.rac-input:focus]:leading-[0] has-[~.rac-input:not(:placeholder-shown)]:leading-[0]',

                    // Make label float when there are selected items
                    hasSelectedItems && 'text-sm font-medium !leading-[0]',

                    // For input state (error, primary).
                    !isInvalid
                      ? 'has-[~.rac-input:focus]:text-primary text-on-surface-variant'
                      : 'has-[~.rac-input:focus]:text-error text-error',

                    // Before and After element. We need this for top border (left and right). Without this, alternate way is to use bg-white on label to hide border shown on top of label, but flaw is to maintain bg of label with bg of body background.
                    // The idea is to create two after/before border for top bar and using flex the three items will align perfectly in straight line.
                    // before element (left width: 16px (12px + 4px margin), height : anything)
                    'before:content-[""] before:w-3 before:h-1.5 before:mr-1 before:transition-all before:rounded-tl before:border-t before:border-l  has-[~.rac-input:placeholder-shown]:before:border-transparent',

                    // For input state (error, primary). before part.
                    !isInvalid
                      ? 'before:border-outline has-[~.rac-input:focus]:before:!border-primary has-[~.rac-input:focus]:before:shadow-[inset_1px_0_rgb(var(--color-primary)),inset_0_1px_rgb(var(--color-primary))] '
                      : 'before:border-error has-[~.rac-input:focus]:before:!border-error has-[~.rac-input:focus]:before:shadow-[inset_1px_0_rgb(var(--color-error)),inset_0_1px_rgb(var(--color-error))]',

                    hasSelectedItems &&
                      (!isInvalid ? 'before:!border-outline' : 'before:!border-error'),

                    // after element
                    'after:content[""] after:flex-grow after:w-3 after:h-1.5 after:ml-1 after:transition-all  after:rounded-tr after:border-t after:border-r has-[~.rac-input:placeholder-shown]:after:border-transparent',

                    // For input state (error, primary). after part.
                    !isInvalid
                      ? 'after:border-outline has-[~.rac-input:focus]:after:!border-primary has-[~.rac-input:focus]:after:shadow-[inset_0_1px_rgb(var(--color-primary)),inset_-1px_0_rgb(var(--color-primary))] '
                      : 'after:border-error has-[~.rac-input:focus]:after:!border-error has-[~.rac-input:focus]:after:shadow-[inset_0_1px_rgb(var(--color-error)),inset_-1px_0_rgb(var(--color-error))]',

                    hasSelectedItems &&
                      (!isInvalid ? 'after:!border-outline' : 'after:!border-error'),

                    // Not need to style for after/before as label will always be at rest.
                    isDisabled && 'text-on-surface/40',
                    // slightly fade top (left, right) border when input is disabled, label is floating and is disabled.
                    isDisabled &&
                      'has-[~.rac-input:not(:placeholder-shown)]:before:border-t-outline/15 has-[~.rac-input:not(:placeholder-shown)]:after:border-t-outline/15 has-[~.rac-input:not(:placeholder-shown)]:before:border-l-outline/15 has-[~.rac-input:not(:placeholder-shown)]:after:border-r-outline/15',
                    // hover + error (invalid) part or hover (primary)
                    isInvalid
                      ? 'has-[~.rac-input:hover:not(:focus)]:text-on-error-container has-[~.rac-input:hover:not(:focus,:placeholder-shown)]:before:border-on-error-container has-[~.rac-input:hover:not(:focus,:placeholder-shown)]:after:border-on-error-container'
                      : 'has-[~.rac-input:hover:not(:focus)]:text-on-primary-container has-[~.rac-input:hover:not(:focus,:placeholder-shown)]:before:border-on-primary-container has-[~.rac-input:hover:not(:focus,:placeholder-shown)]:after:border-on-primary-container'
                  )}>
                  {label}
                  {props.isRequired && <span className="mx-0.5 text-error">*</span>}
                </Label>
              )}
              {Array.from(selectedKeys)?.map((key, i) => (
                <span
                  key={i}
                  className="bg-gray-100 rounded flex items-center gap-1 px-2 py-1 text-sm">
                  {getDisplayText(key)}
                  <button
                    aria-label={`Remove ${getDisplayText(key)}`}
                    className="hover:bg-gray-200 rounded-full p-0.5 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeItem(key);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        removeItem(key);
                      }
                    }}>
                    <IconX />
                  </button>
                </span>
              ))}

              <Input
                ref={ref}
                placeholder={
                  selectedKeys &&
                  typeof selectedKeys !== 'string' &&
                  Array.from(selectedKeys).length > 0
                    ? ' ' // Safari doesn't work with '' placeholder. So using ' '.
                    : placeholder
                }
                onKeyDown={handleKeyDown}
                className={cx(
                  'rac-input appearance-none min-w-12 flex-1 bg-transparent caret-primary text-on-surface font-normal placeholder:text-on-surface/30 disabled:text-on-surface/40 disabled:pointer-events-none resize-none autofill:bg-clip-text rounded-md',
                  'focus:outline-none',
                  // disable placeholder if label is defined.
                  label && 'placeholder:text-transparent',
                  isInvalid && 'focus:caret-error'
                )}
                onInput={onInput}
              />
            </div>
            <Button className="mr-4">
              <IconChevronDown />
            </Button>
          </div>

          <Popover
            {...popoverProps}
            containerPadding={0}
            triggerRef={inputWrapperRef}
            className={cx(
              'min-w-[--trigger-width] py-2 overflow-auto rounded-md border border-on-secondary-container/[0.08] shadow-sm bg-white',
              'entering:animate-in entering:fade-in exiting:animate-out exiting:fade-out',
              itemsClassName
            )}
            // Fix: https://github.com/adobe/react-spectrum/issues/5331 (popover width inside modal is wrong)
            style={{
              width: inputWrapperRef.current
                ? `${inputWrapperRef.current.getBoundingClientRect().width}px`
                : undefined,
            }}>
            <ListBox>{children}</ListBox>
          </Popover>
          {/** Fix for (in chrome, to wrap in div) error : Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.
           * Otherwise if using helpText, then it will crash in chrome.
           */}
          <div>
            {helpText && !isInvalid && (
              <Text
                slot="description"
                className={cx(
                  'text-xs block text-on-surface-variant pt-1',
                  variant === 'outlined' ? 'px-4' : 'px-0.5',
                  isDisabled && 'o:text-on-surface/40'
                )}>
                {helpText}
              </Text>
            )}
          </div>
          {/** errorMessage is optional. If not defined, then will use browser native text message. */}
          <FieldError
            className={cx(
              'text-xs block text-error pt-1',
              variant === 'outlined' ? 'px-4' : 'px-0.5'
            )}>
            {errorMessage}
          </FieldError>
        </>
      )}
    </ComboBox>
  );
}

const _MultiSelect = forwardRef(AriaMultiSelect) as <T extends object>(
  props: MultiSelectProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => React.ReactElement;

export { _MultiSelect as MultiSelect };
