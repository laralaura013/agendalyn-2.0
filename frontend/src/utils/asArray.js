// Converte qualquer coisa em array seguro para .map()
// [] -> [], undefined/null -> [], objeto/valor �nico -> [objeto]
export const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
