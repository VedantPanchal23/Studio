import * as React from "react"
import { cn } from "../../lib/utils"
import './separator.css'

const Separator = React.forwardRef(
  ({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
    <div
      ref={ref}
      role={decorative ? "none" : "separator"}
      aria-orientation={orientation}
      className={cn(
        "separator",
        `separator--${orientation}`,
        className
      )}
      {...props}
    />
  )
)
Separator.displayName = "Separator"

export { Separator }