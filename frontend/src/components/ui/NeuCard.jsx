import React from "react";

/**
 * Neumorphic Card
 * - Variante padrão (relevo) ou "inset" (pressionado)
 * - Usado no Dashboard para métricas e containers
 */
const NeuCard = React.forwardRef(function NeuCard(
  { inset = false, className = "", children, as: Tag = "div", ...rest },
  ref
) {
  // Se alguém passar um 'as' inválido, caímos para 'div' para evitar o erro #310
  const isValidTag = typeof Tag === "string" || typeof Tag === "function";
  const SafeTag = isValidTag ? Tag : "div";

  const base = inset ? "neu-card-inset" : "neu-card";
  return (
    <SafeTag ref={ref} className={`${base} ${className}`} {...rest}>
      {children}
    </SafeTag>
  );
});

NeuCard.displayName = "NeuCard";
export default NeuCard;
