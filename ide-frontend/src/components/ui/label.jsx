import * as React from "react"
import { cn } from "../../lib/utils"
import './label.css'

const Label = React.forwardRef(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("label", className)}
    {...props}
  />
))
Label.displayName = "Label"

export { Label }