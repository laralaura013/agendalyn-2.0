import React from "react";

/**
 * Neumorphic Card
 * - Variante padrão (relevo) ou "inset" (pressionado)
 * - Usado no Dashboard para métricas e containers
 */
export default function NeuCard({
  inset = false,
  className = "",
  children,
  as: Tag = "div",
  ...rest
}) {
  const base = inset ? "neu-card-inset" : "neu-card";
  return (
    <Tag className={`${base} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
