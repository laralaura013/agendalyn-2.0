import React from "react";

/**
 * Neumorphic Button
 * - variants: "default" | "primary" | "danger"
 */
export default function NeuButton({
  variant = "default",
  className = "",
  children,
  ...rest
}) {
  const variantClass =
    variant === "primary"
      ? "neu-btn-primary"
      : variant === "danger"
      ? "neu-btn-danger"
      : "";
  return (
    <button className={`neu-btn ${variantClass} ${className}`} {...rest}>
      {children}
    </button>
  );
}
