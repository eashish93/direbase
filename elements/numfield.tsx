import { NumberField, Group, Button, Label, Input, FieldError, Text } from 'react-aria-components';
import type {
  NumberFieldProps as _NumberFieldProps,
  ValidationResult,
} from 'react-aria-components';
import { cx } from 'cva';
import { forwardRef, type ForwardedRef } from 'react';

/**
 * Number Field (similar styling as TextField, but with some changes)
 *  - outlined
 *  - filled
 *  - adjacent (or normal) label (label above input)
 * Guidelines
 *  - https://material.io/components/text-fields
 */

export type NumberFieldProps = _NumberFieldProps &
  Partial<{
    label: string;
    // NOTE: If errorMessage is defined, then helpText will be ignored and replaced by errorMessage.
    helpText: string | React.ReactNode; // can be error or description text.
    errorMessage: string | ((v: ValidationResult) => string); // error message or validation function.
    // it's deprecated by react-aria team.
    // see: https://github.com/adobe/react-spectrum/pull/2966
    placeholder: string;
    // normal means label above inpu and outlined means floating material input.
    inputClassName: string;
    showIndicators?: boolean;
  }>;

function IconPlus() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 5l0 14" />
      <path d="M5 12l14 0" />
    </svg>
  );
}

function IconMinus() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M5 12l14 0" />
    </svg>
  );
}

function AriaNumberField(
  {
    label,
    helpText,
    errorMessage,
    placeholder,
    inputClassName,
    showIndicators = true,
    ...props
  }: NumberFieldProps,
  ref: ForwardedRef<HTMLInputElement>
) {
  // We are not using RTL, so we don't need to check for suffix text.
  return (
    <NumberField {...props}>
      {({ isInvalid, isDisabled }) => (
        <>
          {label && (
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
          <Group className="flex items-center border border-gray-400 shadow-xs h-12 rounded-md text-sm">
            <Input
              ref={ref}
              placeholder={placeholder ?? ' '} // Safari doesn't work with '' placeholder. So using ' '.
              className={cx(
                'peer appearance-none w-full bg-transparent caret-primary text-on-surface font-normal placeholder:text-on-surface/40 px-3.5 disabled:text-on-surface/40 disabled:pointer-events-none resize-none autofill:bg-clip-text relative rounded-md h-full',
                'focus:outline-none ',
                // disable placeholder if label is defined.
                label && 'placeholder:text-transparent',
                isInvalid && 'focus:caret-error',
                '[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none'
              )}
            />
            {showIndicators && (
              <Group className={cx('flex flex-col m-1 w-7 disabled:opacity-40 group')}>
                <Button
                  slot="increment"
                  className="inline-block rounded hover:bg-outline/10 pressed:bg-primary/20 h-1/2 mb-[1px] bg-outline/5 pl-1.5 w-full group-invalid:bg-error/5 ">
                  <IconPlus />
                </Button>
                <Button
                  slot="decrement"
                  className="inline-block rounded hover:bg-outline/10 pressed:bg-primary/20 mt-[1px] w-full bg-outline/5 pl-1.5 text-center h-1/2 group-invalid:bg-error/5">
                  <IconMinus />
                </Button>
              </Group>
            )}
          </Group>
          {helpText && !isInvalid && (
            <Text
              slot="description"
              className={cx(
                'text-xs block text-on-surface-variant pt-1 px-0.5',
                isDisabled && 'o:text-on-surface/40'
              )}>
              {helpText}
            </Text>
          )}
          {/** errorMessage is optional. If not defined, then will use browser native text message. */}
          <FieldError className={cx('text-xs block text-error pt-1 px-0.5')}>
            {errorMessage}
          </FieldError>
        </>
      )}
    </NumberField>
  );
}

const _NumberField = /*#__PURE__*/ forwardRef(AriaNumberField);

export { _NumberField as NumberField };
