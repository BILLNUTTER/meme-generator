import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "glass" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:-translate-y-0.5": variant === "default",
            "border border-white/10 bg-transparent hover:bg-white/5 text-foreground": variant === "outline",
            "hover:bg-white/5 hover:text-foreground text-muted-foreground": variant === "ghost",
            "glass-card hover:bg-white/10 text-foreground": variant === "glass",
            "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20": variant === "destructive",
            "h-10 px-6 py-2": size === "default",
            "h-9 rounded-lg px-4": size === "sm",
            "h-12 rounded-xl px-8 text-base": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
