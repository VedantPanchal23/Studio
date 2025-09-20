import * as React from "react"
import { cn } from "../../lib/utils"
import './badge.css'

function Badge({ className, variant = "default", ...props }) {
  return (
    <div className={cn("badge", `badge--${variant}`, className)} {...props} />
  )
}

export { Badge }