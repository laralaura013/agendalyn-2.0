import React from "react";

/**
 * Neumorphic Button
 * - variants: "default" | "primary" | "danger"
 */
const NeuButton = React.forwardRef(function NeuButton(
  { variant = "default", className = "", children, type = "button", ...rest },
  ref
) {
  const variantClass =
    variant === "primary"
      ? "neu-btn-primary"
      : variant === "danger"
      ? "neu-btn-danger"
      : "";

  return (
    <button ref={ref} type={type} className={`neu-btn ${variantClass} ${className}`} {...rest}>
      {children}
    </button>
  );
});

NeuButton.displayName = "NeuButton";
export default NeuButton;
