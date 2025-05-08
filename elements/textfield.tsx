'use client';
import { TextField, Label, Input, FieldError, Text, Button, Group, TextArea } from 'react-aria-components';
import type {
  TextFieldProps as _TextFieldProps,
  ValidationResult,
} from 'react-aria-components';
import { cx } from 'cva';
import { forwardRef, type ForwardedRef } from 'react';
import { IconX } from '@tabler/icons-react';

/**
 * Types of textfield styles
 *  - outlined
 *  - filled
 *  - adjacent (or normal) label (label above input)
 * Guidelines
 *  - https://material.io/components/text-fields
 */

export type TextFieldProps = _TextFieldProps &
  Partial<{
    label: string;
    // NOTE: If errorMessage is defined, then helpText will be ignored and replaced by errorMessage.
    helpText: string | React.ReactNode; // can be error or description text.
    errorMessage: string | ((v: ValidationResult) => string); // error message or validation function.
    multiline: boolean; // is it textarea?
    showValidationIcon: boolean; // show validation icon or not (error or success aka check icon)
    // icon or prefix text.
    prefix: React.JSX.Element | string;
    suffix: React.JSX.Element | string;
    showClearButton: boolean; // show clear button or not.
    // it's deprecated by react-aria team.
    // see: https://github.com/adobe/react-spectrum/pull/2966
    placeholder: string;
    rows: number;
    charCount: boolean; // to enable character count description or not.
    // Help popup shown next to label. Only valid for label outside input. See react-spectrum.
    contextualHelp: React.ReactNode;
    inputClassName: string;
  }>;

function AriaTextField(
  {
    label,
    helpText,
    errorMessage,
    multiline,
    showValidationIcon,
    prefix,
    suffix,
    placeholder,
    rows,
    showClearButton,
    charCount,
    contextualHelp,
    inputClassName,
    ...props
  }: TextFieldProps,
  ref: ForwardedRef<HTMLInputElement | HTMLTextAreaElement>
) {
  const InputEl = multiline ? TextArea : Input;

  
  return (
    <TextField {...props}>
      {({ isInvalid, isDisabled }) => (
        <>
          <Label
            className={cx(
              'mb-1 block font-medium',
              isInvalid &&
                'text-error has-[~.rac-input-wrapper_.rac-input:hover:not(:focus)]:text-on-error-container'
            )}>
            {label}
            {props.isRequired && <span className="mx-0.5 text-error">*</span>}
          </Label>
          <Group className="flex items-center border border-gray-400 shadow-xs min-h-12 rounded-md text-sm">
            {prefix && <span className="pl-3">{prefix}</span>}
            <InputEl
              ref={ref as any}
              placeholder={placeholder ?? ' '}
              className={cx(
                'peer appearance-none w-full bg-transparent caret-primary text-on-surface font-normal placeholder:text-on-surface/40 px-3.5 disabled:text-on-surface/40 disabled:pointer-events-none resize-none autofill:bg-clip-text relative rounded-md h-full',
                'focus:outline-none ',
                // disable placeholder if label is defined.
                label && 'placeholder:text-transparent',
                multiline && 'pt-3',
                isInvalid && 'focus:caret-error',
                '[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none'
              )}
              rows={rows}
            />
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
    </TextField>
  );
}

const _TextField = /*#__PURE__*/ forwardRef(AriaTextField);

export { _TextField as TextField };
