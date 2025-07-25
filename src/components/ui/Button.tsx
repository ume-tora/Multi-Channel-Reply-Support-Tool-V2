import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../shared/utils/cn';

// デザインシステムに基づいたButton variant定義
const buttonVariants = cva(
  // ベースクラス
  'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] relative overflow-hidden',
  {
    variants: {
      variant: {
        primary: [
          'bg-gradient-to-r from-primary-500 to-primary-600',
          'text-white shadow-soft hover:shadow-medium',
          'hover:from-primary-600 hover:to-primary-700',
          'focus:ring-primary-500/50',
          'active:from-primary-700 active:to-primary-800'
        ],
        secondary: [
          'bg-secondary-100 text-secondary-700 border border-secondary-200',
          'hover:bg-secondary-200 hover:text-secondary-800 hover:border-secondary-300',
          'hover:shadow-soft focus:ring-secondary-500/50',
          'active:bg-secondary-300'
        ],
        success: [
          'bg-gradient-to-r from-success-500 to-success-600',
          'text-white shadow-soft hover:shadow-medium',
          'hover:from-success-600 hover:to-success-700',
          'focus:ring-success-500/50',
          'active:from-success-700 active:to-success-800'
        ],
        danger: [
          'bg-gradient-to-r from-error-500 to-error-600',
          'text-white shadow-soft hover:shadow-medium',
          'hover:from-error-600 hover:to-error-700',  
          'focus:ring-error-500/50',
          'active:from-error-700 active:to-error-800'
        ],
        warning: [
          'bg-gradient-to-r from-warning-500 to-warning-600',
          'text-white shadow-soft hover:shadow-medium',
          'hover:from-warning-600 hover:to-warning-700',
          'focus:ring-warning-500/50',
          'active:from-warning-700 active:to-warning-800'
        ],
        outline: [
          'border border-primary-300 text-primary-600 bg-transparent',
          'hover:bg-primary-50 hover:border-primary-400 hover:text-primary-700',
          'focus:ring-primary-500/50 hover:shadow-soft',
          'active:bg-primary-100'
        ],
        ghost: [
          'text-secondary-600 bg-transparent',
          'hover:bg-secondary-100 hover:text-secondary-700',
          'focus:ring-secondary-500/50',
          'active:bg-secondary-200'
        ],
        gradient: [
          'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500',
          'text-white shadow-medium hover:shadow-hard',
          'hover:scale-[1.02] focus:ring-purple-500/50',
          'bg-size-200 hover:bg-pos-100',
          'before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-600 before:via-purple-600 before:to-pink-600 before:opacity-0 before:transition-opacity hover:before:opacity-100'
        ]
      },
      size: {
        xs: 'h-7 px-2 text-xs rounded-md',
        sm: 'h-8 px-3 text-sm rounded-md',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-lg rounded-xl',
        icon: 'h-10 w-10 p-0'
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false
    }
  }
);

export interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    fullWidth,
    loading = false,
    leftIcon,
    rightIcon,
    disabled,
    children, 
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {/* ローディングスピナー */}
        {loading && (
          <div className="mr-2">
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          </div>
        )}
        
        {/* 左アイコン */}
        {leftIcon && !loading && (
          <div className="mr-2 flex-shrink-0">
            {leftIcon}
          </div>
        )}
        
        {/* メインコンテンツ */}
        <span className="flex-1 truncate">
          {children}
        </span>
        
        {/* 右アイコン */}
        {rightIcon && (
          <div className="ml-2 flex-shrink-0">
            {rightIcon}
          </div>
        )}
        
        {/* グラデーションボタン用のアニメーション効果 */}
        {variant === 'gradient' && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';