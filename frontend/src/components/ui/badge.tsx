import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        green: "border-transparent bg-green-100 text-green-800 hover:bg-green-100/80",
        yellow: "bg-yellow-100 text-yellow-800 border-transparent hover:bg-yellow-100/80",
        blue: "bg-blue-100 text-blue-800 border-transparent hover:bg-blue-100/80",
        teal: "bg-teal-100 text-teal-800 border-transparent hover:bg-teal-100/80",
        purple: "bg-purple-100 text-purple-800 border-transparent hover:bg-purple-100/80",
        indigo: "bg-indigo-100 text-indigo-800 border-transparent hover:bg-indigo-100/80",
        orange: "bg-orange-100 text-orange-800 border-transparent hover:bg-orange-100/80",
        red: "bg-red-100 text-red-800 border-transparent hover:bg-red-100/80",
        gray: "bg-gray-400 text-white border-transparent hover:bg-gray-400/80",
        darkGreen : "border-transparent bg-green-500 text-white hover:bg-green-500/80"
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
