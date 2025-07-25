import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../shared/utils/cn';

// デザインシステムに基づいたInput variant定義
const inputVariants = cva(
  // ベースクラス
  'flex w-full rounded-lg border bg-white px-3 py-2 text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-secondary-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: [
          'border-secondary-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20',
          'hover:border-secondary-300'
        ],
        error: [
          'border-error-300 text-error-900 focus:border-error-400 focus:ring-2 focus:ring-error-400/20',
          'placeholder:text-error-300'
        ],
        success: [
          'border-success-300 text-success-900 focus:border-success-400 focus:ring-2 focus:ring-success-400/20',
          'placeholder:text-success-300'
        ]
      },
      size: {
        sm: 'h-8 px-2 text-xs',
        md: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'md'
    }
  }
);

const labelVariants = cva('block text-sm font-medium text-secondary-700', {
  variants: {
    variant: {
      default: 'text-secondary-700',
      error: 'text-error-700',
      success: 'text-success-700'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
});

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  success?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    variant,
    size,
    label,
    error,
    success,
    helperText,
    leftIcon,
    rightIcon,
    containerClassName,
    required,
    disabled,
    ...props
  }, ref) => {
    // エラーまたは成功状態に基づいてvariantを決定
    const currentVariant = error ? 'error' : success ? 'success' : variant;

    return (
      <div className={cn('space-y-2', containerClassName)}>
        {/* ラベル */}
        {label && (
          <label className={cn(labelVariants({ variant: currentVariant }))}>
            {label}
            {required && (
              <span className="ml-1 text-error-500">*</span>
            )}
          </label>
        )}

        {/* 入力フィールドコンテナ */}
        <div className="relative">
          {/* 左アイコン */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none">
              {leftIcon}
            </div>
          )}

          {/* メイン入力フィールド */}
          <input
            className={cn(
              inputVariants({ variant: currentVariant, size }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            ref={ref}
            disabled={disabled}
            {...props}
          />

          {/* 右アイコン */}
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>

        {/* ヘルパーテキスト・エラー・成功メッセージ */}
        {(error || success || helperText) && (
          <div className="space-y-1">
            {error && (
              <p className="flex items-center gap-2 text-sm text-error-600">
                <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}
            
            {success && !error && (
              <p className="flex items-center gap-2 text-sm text-success-600">
                <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {success}
              </p>
            )}

            {helperText && !error && !success && (
              <p className="text-sm text-secondary-500">{helperText}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';