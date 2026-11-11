import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost" | "gold";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      icon,
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-bold tracking-wide rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-amber-500/50 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer select-none";

    const variantStyles = {
      primary:
        "bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-900/20 border border-amber-500/40",
      secondary:
        "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 shadow-sm",
      danger:
        "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/40 border border-rose-500/40",
      outline:
        "bg-transparent hover:bg-gray-100/80 text-gray-700 hover:text-white border border-gray-300",
      ghost:
        "bg-transparent hover:bg-gray-100/60 text-gray-500 hover:text-gray-800 border border-transparent",
      gold:
        "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-950/40 border border-amber-300/60"
    };

    const sizeStyles = {
      sm: "text-[11px] px-2.5 py-1 gap-1.5",
      md: "text-xs px-3.5 py-1.5 gap-2",
      lg: "text-sm px-4 py-2 gap-2.5"
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
