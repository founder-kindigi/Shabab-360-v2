"use client"

import { useTheme } from "@/components/providers/theme-provider"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  let theme: string = "system";
  try {
    const themeContext = useTheme();
    theme = themeContext?.theme || "system";
  } catch {
    theme = "system";
  }

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
