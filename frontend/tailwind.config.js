/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Agendalyn (HEX fornecidos)
        mercury:     "#e1e1e1", // texto claro / highlights
        shark:       "#1c1d1d", // fundo principal
        "dove-gray": "#737373", // texto secundário
        tundora:     "#494949", // bordas neutras / btn cinza
        venus:       "#948c90", // botão primário / ênfase
        mantle:      "#8c9491", // hover do primário
        manatee:     "#8c8c94", // complementar
        nandor:      "#545c57", // botão confirmar (sucesso)
        "scarpa-flow":"#54545c", // hover confirmar
        "cape-cod":  "#343c39",  // cards/modais

        // aliases semânticos (facilita leitura das classes)
        brand: {
          DEFAULT: "#948c90", // venus
          hover:   "#8c9491", // mantle
        },
        accent: {
          DEFAULT: "#545c57", // nandor
          hover:   "#54545c", // scarpa-flow
        },
        surface: {
          DEFAULT: "#1c1d1d", // shark
        },
        card: {
          DEFAULT: "#343c39", // cape-cod
        },
      },
      boxShadow: {
        card: "0 20px 40px rgba(0,0,0,0.35)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
}
