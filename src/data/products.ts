
export interface Product {
  slug: string;
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  description: string;
  careItems: { icon: string; text: string }[];
  fit: string;
  sizes: string[];
  stock: Record<string, "ok" | "low" | "out">;
  colors: { label: string; value: string; image: string }[];
  images: string[];
}

const CARE_APPAREL = [
  { icon: "wash",     text: "Lavar a mano o a máquina en agua fría (máx. 30°C)" },
  { icon: "no-dryer", text: "No usar secadora" },
  { icon: "iron-low", text: "Planchar a temperatura baja, sin vapor" },
  { icon: "no-dry",   text: "No lavar en seco" },
];

const CARE_ACCESSORY = [
  { icon: "no-dryer", text: "Limpiar con paño húmedo, no sumergir en agua" },
  { icon: "no-dry",   text: "Guardar en lugar fresco y seco" },
];

export const PRODUCTS: Product[] = [
  {
    slug: "ladytribal-black-longsleeve",
    id: "ladytribal-black-longsleeve",
    name: "LADYTRIBAL BLACK - LONGSLEEVE",
    category: "Longsleeve",
    price: 64000,
    originalPrice: 80000,
    description: `Remera manga larga Boxy Fit

• 100% algodón (200 gsm)
• calce cuadrado (Boxy Fit)
• estampa frontal con serigrafía de alta densidad
• cuello alto, cerrado
• Meli mide 1.70 y esta usando talle M`,
    careItems: CARE_APPAREL,
    fit: "Boxy Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "out",
    "M": "low",
    "L": "out",
    "XL": "out"
    },
    colors: [
      { label: "Black", value: "#1a1a1a", image: "products/ladytribal-black-longsleeve-0.png" },
    ],
    images: [
    "products/ladytribal-black-longsleeve-0.png",
    "products/ladytribal-black-longsleeve-1.jpg",
    "products/ladytribal-black-longsleeve-2.jpg",
    "products/ladytribal-black-longsleeve-3.jpg",
    "products/ladytribal-black-longsleeve-4.jpg",
    "products/ladytribal-black-longsleeve-5.png",
    "products/ladytribal-black-longsleeve-6.jpg"
    ],
  },
  {
    slug: "tanktops",
    id: "tanktops",
    name: "TANKTOPS",
    category: "Top",
    price: 14000,
    originalPrice: 40000,
    description: `MUSCULOSAS DE MORLEY VALEN MIDE 1.80 Y ESTA USANDO TALLE M

• 75% COTTON, 25% POLYESTER
• MORLEY
• LOGOS BORDADOS EN FRENTE Y ESPALDA`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["VERDE", "CAYENA", "NEGRO", "CRUDO", "GRIS"],
    stock: {
    "VERDE": "ok",
    "CAYENA": "out",
    "NEGRO": "low",
    "CRUDO": "ok",
    "GRIS": "ok"
    },
    colors: [
      { label: "Default", value: "#111111", image: "products/tanktops-0.png" },
    ],
    images: [
    "products/tanktops-0.png",
    "products/tanktops-1.jpg",
    "products/tanktops-2.png",
    "products/tanktops-3.jpg",
    "products/tanktops-4.jpeg",
    "products/tanktops-5.png",
    "products/tanktops-6.png",
    "products/tanktops-7.png",
    "products/tanktops-8.png",
    "products/tanktops-9.png",
    "products/tanktops-10.png",
    "products/tanktops-11.png",
    "products/tanktops-12.png"
    ],
  },
  {
    slug: "crop-tops",
    id: "crop-tops",
    name: "CROP TOPs",
    category: "Top",
    price: 12000,
    originalPrice: 36000,
    description: `TOP DE MORLEY

• 5 COLORWAYS (PINE GREEN, CAYENA, CRUDO, NEGRO Y GRIS)
• 75% COTTON, 25% POLYESTER
• MORLEY
• LOGOS BORDADOS EN FRENTE.`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["CAYENA", "CRUDO", "NEGRO", "GRIS", "VERDE"],
    stock: {
    "CAYENA": "out",
    "CRUDO": "out",
    "NEGRO": "out",
    "GRIS": "out",
    "VERDE": "low"
    },
    colors: [
      { label: "Default", value: "#111111", image: "products/crop-tops-0.png" },
    ],
    images: [
    "products/crop-tops-0.png",
    "products/crop-tops-1.jpg",
    "products/crop-tops-2.png",
    "products/crop-tops-3.jpg",
    "products/crop-tops-4.jpg",
    "products/crop-tops-5.png",
    "products/crop-tops-6.jpg",
    "products/crop-tops-7.png",
    "products/crop-tops-8.jpg",
    "products/crop-tops-9.png",
    "products/crop-tops-10.jpg",
    "products/crop-tops-11.jpg",
    "products/crop-tops-12.jpg",
    "products/crop-tops-13.jpg",
    "products/crop-tops-14.jpg",
    "products/crop-tops-15.png",
    "products/crop-tops-16.png",
    "products/crop-tops-17.png",
    "products/crop-tops-18.jpg",
    "products/crop-tops-19.png",
    "products/crop-tops-20.jpg",
    "products/crop-tops-21.jpg",
    "products/crop-tops-22.jpg",
    "products/crop-tops-23.jpg",
    "products/crop-tops-24.jpg"
    ],
  },
  {
    slug: "knitted-tshirt-sand",
    id: "knitted-tshirt-sand",
    name: "KNITTED TSHIRT SAND",
    category: "Tee",
    price: 48000,
    description: `REMERA TEJIDO CROCHET COLOR CREMA Valen mide 1.80 y esta usando talle L

• 100% algodón (200 gsm)
• calce cuadrado (Boxy Fit)
• bolsillo tipo parche cuadrado
• cuello alto, cerrado`,
    careItems: CARE_APPAREL,
    fit: "Boxy Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "low",
    "M": "out",
    "L": "out",
    "XL": "ok"
    },
    colors: [
      { label: "Sand", value: "#c8a96e", image: "products/knitted-tshirt-sand-0.png" },
    ],
    images: [
    "products/knitted-tshirt-sand-0.png",
    "products/knitted-tshirt-sand-1.jpg",
    "products/knitted-tshirt-sand-2.jpg",
    "products/knitted-tshirt-sand-3.jpg",
    "products/knitted-tshirt-sand-4.jpg",
    "products/knitted-tshirt-sand-5.jpg",
    "products/knitted-tshirt-sand-6.jpg",
    "products/knitted-tshirt-sand-7.jpg",
    "products/knitted-tshirt-sand-8.jpg",
    "products/knitted-tshirt-sand-9.jpg",
    "products/knitted-tshirt-sand-10.jpeg"
    ],
  },
  {
    slug: "jumbo-jorts-34-wheat",
    id: "jumbo-jorts-34-wheat",
    name: "JUMBO JORTS 3/4 WHEAT",
    category: "Jort",
    price: 35000,
    originalPrice: 50000,
    description: `Bermuda de rustico corte 3/4 - 100% Algodon - Rustico crudo liviano - Cordones de algodon - Bordado Frente y dorso - Roturas en la botamanga y en cordones. Valen mide 1.80 y esta usando talle L`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "out",
    "L": "out",
    "XL": "ok"
    },
    colors: [
      { label: "Wheat", value: "#c8a96e", image: "products/jumbo-jorts-34-wheat-0.png" },
    ],
    images: [
    "products/jumbo-jorts-34-wheat-0.png",
    "products/jumbo-jorts-34-wheat-1.jpg",
    "products/jumbo-jorts-34-wheat-2.jpg",
    "products/jumbo-jorts-34-wheat-3.jpg",
    "products/jumbo-jorts-34-wheat-4.jpg",
    "products/jumbo-jorts-34-wheat-5.jpg",
    "products/jumbo-jorts-34-wheat-6.jpg"
    ],
  },
  {
    slug: "forpain-sleveless-pink",
    id: "forpain-sleveless-pink",
    name: "FORPAIN SLEVELESS PINK",
    category: "Sleeveless",
    price: 19500,
    originalPrice: 34000,
    description: `Prenda confeccionada en la más alta calidad de jersey de algodón 100%, que le brindan al usuario un comfort y comodidad únicos. Con terminaciones de costura premium, y un estampado logrado en serigrafía, esta sudadera de corte BOXY FIT logra alcanzar un nivel de calidad excelente.

• 100% ALGOD&Oacute;N
• CALCE BOXY FIT.
• ESTAMPA DELANTERA EN SERIGRAF&Iacute;A.
• COLOR ROSA SALMON
• CUELLO ALTO.
• LAVADO ENZIM&Aacute;TICO ANTI-ACHIQUE.
• Denis uso talle M midiendo 1.75 .`,
    careItems: CARE_APPAREL,
    fit: "Boxy Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "out",
    "L": "out",
    "XL": "out"
    },
    colors: [
      { label: "Pink", value: "#e88ea0", image: "products/forpain-sleveless-pink-0.jpeg" },
    ],
    images: [
    "products/forpain-sleveless-pink-0.jpeg",
    "products/forpain-sleveless-pink-1.jpg",
    "products/forpain-sleveless-pink-2.jpg",
    "products/forpain-sleveless-pink-3.jpg",
    "products/forpain-sleveless-pink-4.jpeg",
    "products/forpain-sleveless-pink-5.jpg",
    "products/forpain-sleveless-pink-6.jpg",
    "products/forpain-sleveless-pink-7.jpg"
    ],
  },
  {
    slug: "deer-sleveless-brown",
    id: "deer-sleveless-brown",
    name: "DEER SLEVELESS BROWN",
    category: "Sleeveless",
    price: 19500,
    originalPrice: 34000,
    description: `Prenda confeccionada en la más alta calidad de jersey de algodón 100%, que le brindan al usuario un comfort y comodidad únicos. Con terminaciones de costura premium, y un estampado logrado en serigrafía, esta sudadera de corte BOXY FIT logra alcanzar un nivel de calidad excelente.

• 100% ALGOD&Oacute;N
• CALCE BOXY FIT.
• ESTAMPA DELANTERA EN SERIGRAF&Iacute;A.
• COLOR MARRON CHOCOLATE
• CUELLO ALTO.
• LAVADO ENZIM&Aacute;TICO ANTI-ACHIQUE.
• Denis uso talle M midiendo 1.75 .`,
    careItems: CARE_APPAREL,
    fit: "Boxy Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "out",
    "L": "low",
    "XL": "low"
    },
    colors: [
      { label: "Brown", value: "#7b5a3c", image: "products/deer-sleveless-brown-0.jpeg" },
    ],
    images: [
    "products/deer-sleveless-brown-0.jpeg",
    "products/deer-sleveless-brown-1.jpg",
    "products/deer-sleveless-brown-2.jpg",
    "products/deer-sleveless-brown-3.jpg",
    "products/deer-sleveless-brown-4.jpeg",
    "products/deer-sleveless-brown-5.jpg",
    "products/deer-sleveless-brown-6.jpg",
    "products/deer-sleveless-brown-7.jpg"
    ],
  },
  {
    slug: "mustang-sleveless-black",
    id: "mustang-sleveless-black",
    name: "MUSTANG SLEVELESS BLACK",
    category: "Sleeveless",
    price: 19500,
    originalPrice: 34000,
    description: `Prenda confeccionada en la más alta calidad de jersey de algodón 100%, que le brindan al usuario un comfort y comodidad únicos. Con terminaciones de costura premium, y un estampado logrado en serigrafía, esta sudadera de corte BOXY FIT logra alcanzar un nivel de calidad excelente.

• 100% ALGOD&Oacute;N
• CALCE BOXY FIT.
• ESTAMPA DELANTERA EN SERIGRAF&Iacute;A.
• COLOR NEGRO.
• CUELLO ALTO.
• LAVADO ENZIM&Aacute;TICO ANTI-ACHIQUE.
• Denis uso talle M midiendo 1.75 .`,
    careItems: CARE_APPAREL,
    fit: "Boxy Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "out",
    "L": "out",
    "XL": "out"
    },
    colors: [
      { label: "Black", value: "#1a1a1a", image: "products/mustang-sleveless-black-0.jpeg" },
    ],
    images: [
    "products/mustang-sleveless-black-0.jpeg",
    "products/mustang-sleveless-black-1.jpg",
    "products/mustang-sleveless-black-2.jpg",
    "products/mustang-sleveless-black-3.jpeg",
    "products/mustang-sleveless-black-4.jpg",
    "products/mustang-sleveless-black-5.jpg",
    "products/mustang-sleveless-black-6.jpg",
    "products/mustang-sleveless-black-7.jpg"
    ],
  },
  {
    slug: "eye-sleveless-wheat",
    id: "eye-sleveless-wheat",
    name: "EYE SLEVELESS WHEAT",
    category: "Sleeveless",
    price: 19500,
    originalPrice: 34000,
    description: `Prenda confeccionada en la más alta calidad de jersey de algodón 100%, que le brindan al usuario un comfort y comodidad únicos. Con terminaciones de costura premium, y un estampado logrado en serigrafía, esta sudadera de corte BOXY FIT logra alcanzar un nivel de calidad excelente.

• 100% ALGOD&Oacute;N
• CALCE BOXY FIT.
• ESTAMPA DELANTERA EN SERIGRAF&Iacute;A.
• COLOR CRUDO.
• CUELLO ALTO.
• LAVADO ENZIM&Aacute;TICO ANTI-ACHIQUE.
• Denis uso talle M midiendo 1.75 .`,
    careItems: CARE_APPAREL,
    fit: "Boxy Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "out",
    "XL": "out"
    },
    colors: [
      { label: "Wheat", value: "#c8a96e", image: "products/eye-sleveless-wheat-0.jpeg" },
    ],
    images: [
    "products/eye-sleveless-wheat-0.jpeg",
    "products/eye-sleveless-wheat-1.jpg",
    "products/eye-sleveless-wheat-2.jpg",
    "products/eye-sleveless-wheat-3.jpg",
    "products/eye-sleveless-wheat-4.jpeg",
    "products/eye-sleveless-wheat-5.jpg",
    "products/eye-sleveless-wheat-6.jpg",
    "products/eye-sleveless-wheat-7.jpg"
    ],
  },
  {
    slug: "hs-ring-silver-925",
    id: "hs-ring-silver-925",
    name: "\"HS\" RING SILVER 925",
    category: "Accesorio",
    price: 160000,
    description: `Anillo fundido en Plata 925 diseñado exclusivamente por Hypestyle. La pieza presenta un diseño audaz y moderno, con líneas limpias y un acabado pulido que refleja la luz. Todos los derechos reservados. 2025 Detalles - Material: Plata 925 (92,5% plata) - Diseño: Anillo con diseño geométrico y moderno. - Acabado: Pulido. Características - La plata 925 es un material duradero y resistente a la corrosión. - El diseño moderno y audaz del anillo lo hace perfecto para aquellos que buscan hacer una declaración de estilo. - El acabado pulido da un toque de elegancia y sofisticación. Garantía - El anillo viene con una garantía de pulido de un año. - Estamos comprometidos con la satisfacción del cliente y ofrecemos un servicio de atención al cliente excepcional. El producto se vende bajo Pre-Venta. Se envia entre 12 y 15 dias realizada la compra.`,
    careItems: CARE_ACCESSORY,
    fit: "Talle único",
    sizes: ["N-04", "N-05", "N-06", "N-07", "N-08", "N-09", "N-10", "N-11", "N-12", "N-13", "N-14", "N-15", "N-16", "N-17", "N-18", "N-19", "N-20", "N-21", "N-22", "N-23", "N-24", "N-25", "N-26", "N-27", "N-28", "N-29", "N-30"],
    stock: {
    "N-04": "ok",
    "N-05": "ok",
    "N-06": "ok",
    "N-07": "ok",
    "N-08": "ok",
    "N-09": "ok",
    "N-10": "ok",
    "N-11": "ok",
    "N-12": "ok",
    "N-13": "ok",
    "N-14": "ok",
    "N-15": "ok",
    "N-16": "ok",
    "N-17": "ok",
    "N-18": "ok",
    "N-19": "ok",
    "N-20": "ok",
    "N-21": "ok",
    "N-22": "ok",
    "N-23": "ok",
    "N-24": "ok",
    "N-25": "ok",
    "N-26": "ok",
    "N-27": "ok",
    "N-28": "ok",
    "N-29": "ok",
    "N-30": "ok"
    },
    colors: [
      { label: "Silver", value: "#c0c0c0", image: "products/hs-ring-silver-925-0.png" },
    ],
    images: [
    "products/hs-ring-silver-925-0.png",
    "products/hs-ring-silver-925-1.png",
    "products/hs-ring-silver-925-2.png",
    "products/hs-ring-silver-925-3.png",
    "products/hs-ring-silver-925-4.jpg"
    ],
  },
  {
    slug: "crewneck-hyped-up-black",
    id: "crewneck-hyped-up-black",
    name: "CREWNECK HYPED UP! BLACK",
    category: "Crewneck",
    price: 62300,
    originalPrice: 89000,
    description: `CREWNECK HYPEDUP! BLACK.

• FRIZA 100% algodón (300 gsm)
• calce cuadrado (Boxy Fit)
• estampa frontal con serigrafía de alta densidad
• Apliques en vivo reflectivo en frente y espalda
• cuello alto, cerrado
• Denis esta usando talle M midiendo 1.75`,
    careItems: CARE_APPAREL,
    fit: "Boxy Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "out",
    "M": "out",
    "L": "out",
    "XL": "low"
    },
    colors: [
      { label: "Black", value: "#1a1a1a", image: "products/crewneck-hyped-up-black-0.png" },
    ],
    images: [
    "products/crewneck-hyped-up-black-0.png",
    "products/crewneck-hyped-up-black-1.jpg",
    "products/crewneck-hyped-up-black-2.png",
    "products/crewneck-hyped-up-black-3.jpg",
    "products/crewneck-hyped-up-black-4.jpg",
    "products/crewneck-hyped-up-black-5.jpg",
    "products/crewneck-hyped-up-black-6.jpg",
    "products/crewneck-hyped-up-black-7.jpg"
    ],
  },
  {
    slug: "worldwide-movement-taupe-tee",
    id: "worldwide-movement-taupe-tee",
    name: "\"WORLDWIDE MOVEMENT\" TAUPE TEE",
    category: "Tee",
    price: 45000,
    description: `Remera Marron Boxy Fit

• 100% algodón (200 gsm)
• calce cuadrado (Boxy Fit)
• estampa frontal con serigrafía de alta densidad
• cuello alto, cerrado
• Dennis esta usando talle M y mide 1.75`,
    careItems: CARE_APPAREL,
    fit: "Boxy Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "low",
    "M": "low",
    "L": "low",
    "XL": "out"
    },
    colors: [
      { label: "Taupe", value: "#8b7355", image: "products/worldwide-movement-taupe-tee-0.jpg" },
    ],
    images: [
    "products/worldwide-movement-taupe-tee-0.jpg",
    "products/worldwide-movement-taupe-tee-1.jpg",
    "products/worldwide-movement-taupe-tee-2.jpg",
    "products/worldwide-movement-taupe-tee-3.jpg",
    "products/worldwide-movement-taupe-tee-4.jpg",
    "products/worldwide-movement-taupe-tee-5.jpg",
    "products/worldwide-movement-taupe-tee-6.jpg",
    "products/worldwide-movement-taupe-tee-7.jpg"
    ],
  },
  {
    slug: "hoodie-shield-olive",
    id: "hoodie-shield-olive",
    name: "HOODIE SHIELD OLIVE",
    category: "Hoodie",
    price: 78000,
    description: `HOODIE SHIELD OLIVE   Boxy Fit 100% algodón  frisa pesada premium (450 gsm). Calce boxy, sin bolsillo frontal. Estampa verde musgo en serigrafía de alta densidad (frente y espalda). Terminaciones premium, tacto suave y estructura firme. Diseñada en Argentina, hecha en Argentina.

•
•
•
•
•
• Denis uso talle M y mide 1.75.`,
    careItems: CARE_APPAREL,
    fit: "Boxy Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "low",
    "M": "out",
    "L": "out",
    "XL": "out"
    },
    colors: [
      { label: "Olive", value: "#6b7440", image: "products/hoodie-shield-olive-0.png" },
    ],
    images: [
    "products/hoodie-shield-olive-0.png",
    "products/hoodie-shield-olive-1.jpg",
    "products/hoodie-shield-olive-2.png",
    "products/hoodie-shield-olive-3.jpg",
    "products/hoodie-shield-olive-4.jpg"
    ],
  },
  {
    slug: "rodeo-star-taupe-tee-v2",
    id: "rodeo-star-taupe-tee-v2",
    name: "RODEO STAR TAUPE TEE V2",
    category: "Tee",
    price: 45000,
    description: `Remera Marron Boxy Fit

• 100% algodón (200 gsm)
• calce cuadrado (Boxy Fit)
• estampa frontal con serigrafía de alta densidad
• cuello alto, cerrado
• Denis uso talle M y mide 1.75.`,
    careItems: CARE_APPAREL,
    fit: "Boxy Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "low",
    "M": "low",
    "L": "low",
    "XL": "low"
    },
    colors: [
      { label: "Taupe", value: "#8b7355", image: "products/rodeo-star-taupe-tee-v2-0.jpg" },
    ],
    images: [
    "products/rodeo-star-taupe-tee-v2-0.jpg",
    "products/rodeo-star-taupe-tee-v2-1.jpg",
    "products/rodeo-star-taupe-tee-v2-2.jpg",
    "products/rodeo-star-taupe-tee-v2-3.jpg",
    "products/rodeo-star-taupe-tee-v2-4.jpg"
    ],
  },
  {
    slug: "fleece-jacket-v1-negrogris",
    id: "fleece-jacket-v1-negrogris",
    name: "FLEECE JACKET V1 - (Negro/Gris)",
    category: "Hoodie",
    price: 62300,
    originalPrice: 89000,
    description: `DETALLES: Combinación de Bouclé polar negro y Groo esmerilado gris Recortes en frente, espalda, mangas y capucha Bordado frontal con logo Hypestyle Cierre metálico YKK frontal Bolsillos laterales abiertos Talles disponibles: S, M, L Fit boxy con caída relajada Terminaciones de calidad premium

•
•
•
• Recortes grises impermeables
•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Boxy Oversized",
    sizes: ["S", "M", "L"],
    stock: {
    "S": "ok",
    "M": "out",
    "L": "out"
    },
    colors: [
      { label: "Negro", value: "#1a1a1a", image: "products/fleece-jacket-v1-negrogris-0.png" },
    ],
    images: [
    "products/fleece-jacket-v1-negrogris-0.png",
    "products/fleece-jacket-v1-negrogris-1.png",
    "products/fleece-jacket-v1-negrogris-2.jpg",
    "products/fleece-jacket-v1-negrogris-3.jpg",
    "products/fleece-jacket-v1-negrogris-4.jpg",
    "products/fleece-jacket-v1-negrogris-5.jpg",
    "products/fleece-jacket-v1-negrogris-6.jpg",
    "products/fleece-jacket-v1-negrogris-7.jpg",
    "products/fleece-jacket-v1-negrogris-8.jpg",
    "products/fleece-jacket-v1-negrogris-9.jpg",
    "products/fleece-jacket-v1-negrogris-10.jpg",
    "products/fleece-jacket-v1-negrogris-11.jpg"
    ],
  },
  {
    slug: "crewneck-hyped-up-grey",
    id: "crewneck-hyped-up-grey",
    name: "CREWNECK HYPED UP! GREY",
    category: "Crewneck",
    price: 62300,
    originalPrice: 89000,
    description: `CREWNECK HYPEDUP! GRIS MELANGE

• FRIZA 100% algodón (300 gsm)
• calce cuadrado (Boxy Fit)
• estampa frontal con serigrafía de alta densidad
• Apliques en vivo negro en frente y espalda
• cuello alto, cerrado`,
    careItems: CARE_APPAREL,
    fit: "Boxy Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "out",
    "M": "out",
    "L": "out",
    "XL": "ok"
    },
    colors: [
      { label: "Grey", value: "#888888", image: "products/crewneck-hyped-up-grey-0.png" },
    ],
    images: [
    "products/crewneck-hyped-up-grey-0.png",
    "products/crewneck-hyped-up-grey-1.png",
    "products/crewneck-hyped-up-grey-2.jpg",
    "products/crewneck-hyped-up-grey-3.jpg",
    "products/crewneck-hyped-up-grey-4.jpg",
    "products/crewneck-hyped-up-grey-5.jpg",
    "products/crewneck-hyped-up-grey-6.jpg",
    "products/crewneck-hyped-up-grey-7.jpg",
    "products/crewneck-hyped-up-grey-8.jpg",
    "products/crewneck-hyped-up-grey-9.jpg",
    "products/crewneck-hyped-up-grey-10.jpg"
    ],
  },
  {
    slug: "sweatpants-bombe-bordo",
    id: "sweatpants-bombe-bordo",
    name: "SweatPants Bombe – Bordó",
    category: "Pantalón",
    price: 57400,
    originalPrice: 82000,
    description: `Descripción:DETALLES: Pantalón oversized tipo bombe en color bordó Cintura elastizada con cordón ajustable Bolsillos laterales y bolsillo trasero con estampado HS Logo Hypestyle estampado en frente Tela suave y resistente para uso diario Corte recto y caída amplia para mayor comodidad Parte de la FAITH COLLECTION.

•
•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Oversized",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "out",
    "M": "out",
    "L": "low",
    "XL": "ok"
    },
    colors: [
      { label: "Bordo", value: "#6b1a2a", image: "products/sweatpants-bombe-bordo-0.png" },
    ],
    images: [
    "products/sweatpants-bombe-bordo-0.png",
    "products/sweatpants-bombe-bordo-1.png",
    "products/sweatpants-bombe-bordo-2.jpg",
    "products/sweatpants-bombe-bordo-3.jpg",
    "products/sweatpants-bombe-bordo-4.jpg",
    "products/sweatpants-bombe-bordo-5.jpg",
    "products/sweatpants-bombe-bordo-6.jpg",
    "products/sweatpants-bombe-bordo-7.jpg",
    "products/sweatpants-bombe-bordo-8.jpg"
    ],
  },
  {
    slug: "raglan-tee-tribal-cross",
    id: "raglan-tee-tribal-cross",
    name: "Raglan Tee – Tribal Cross",
    category: "Tee",
    price: 48000,
    description: `DETALLES: Remera raglan de manga corta en color gris con mangas blancas Estampado frontal con cruz tribal en blanco Logo Hypestyle estampado en la espalda alta Corte relajado para mayor comodidad Algodón suave y resistente Parte de la FAITH COLLECTION.

•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "low",
    "L": "out",
    "XL": "low"
    },
    colors: [
      { label: "Default", value: "#111111", image: "products/raglan-tee-tribal-cross-0.jpg" },
    ],
    images: [
    "products/raglan-tee-tribal-cross-0.jpg",
    "products/raglan-tee-tribal-cross-1.jpg",
    "products/raglan-tee-tribal-cross-2.jpg",
    "products/raglan-tee-tribal-cross-3.jpg",
    "products/raglan-tee-tribal-cross-4.jpg",
    "products/raglan-tee-tribal-cross-5.jpg",
    "products/raglan-tee-tribal-cross-6.jpg",
    "products/raglan-tee-tribal-cross-7.jpg",
    "products/raglan-tee-tribal-cross-8.jpg",
    "products/raglan-tee-tribal-cross-9.jpg"
    ],
  },
  {
    slug: "regular-tee-black",
    id: "regular-tee-black",
    name: "Regular Tee - Black",
    category: "Tee",
    price: 34000,
    description: `REGULAR TEE  HYPESTYLECorte regular, al cuerpo. Diseñada para un fit cómodo y versátil.Confeccionada en algodón peinado 14/1, suave al tacto y de alta resistencia, con una excelente caída. Peso: 250 g Material: 100% algodón peinado 14/1 Fit: Regular, al cuerpo Detalles: cuello reforzado, costuras prolijas y terminación premium Una básica esencial, pensada para durar y acompañar cualquier outfit dentro del universo Hypestyle.

•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Black", value: "#1a1a1a", image: "products/regular-tee-black-0.png" },
    ],
    images: [
    "products/regular-tee-black-0.png",
    "products/regular-tee-black-1.png",
    "products/regular-tee-black-2.jpg",
    "products/regular-tee-black-3.jpg",
    "products/regular-tee-black-4.jpg",
    "products/regular-tee-black-5.jpg",
    "products/regular-tee-black-6.jpg",
    "products/regular-tee-black-7.jpg",
    "products/regular-tee-black-8.jpg"
    ],
  },
  {
    slug: "regular-tee-white",
    id: "regular-tee-white",
    name: "Regular Tee - White",
    category: "Tee",
    price: 34000,
    description: `REGULAR TEE  HYPESTYLECorte regular, al cuerpo. Diseñada para un fit cómodo y versátil.Confeccionada en algodón peinado 24/1, suave al tacto y de alta resistencia, con una excelente caída. Material: 100% algodón peinado 24/1 Fit: Regular, al cuerpo Detalles: cuello reforzado, costuras prolijas y terminación premium Una básica esencial, pensada para durar y acompañar cualquier outfit dentro del universo Hypestyle.

•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "White", value: "#f5f5f5", image: "products/regular-tee-white-0.png" },
    ],
    images: [
    "products/regular-tee-white-0.png",
    "products/regular-tee-white-1.png",
    "products/regular-tee-white-2.jpg",
    "products/regular-tee-white-3.jpg",
    "products/regular-tee-white-4.jpg",
    "products/regular-tee-white-5.jpg",
    "products/regular-tee-white-6.jpg",
    "products/regular-tee-white-7.jpg"
    ],
  },
  {
    slug: "lettering-melange-jort",
    id: "lettering-melange-jort",
    name: "LETTERING MELANGE - JORT",
    category: "Jort",
    price: 55000,
    originalPrice: 69000,
    description: `Jort Hypestyle  Lettering Melange Grey Jort confeccionado en rústico pesado premium, con textura firme y suave al tacto.Cuenta con cintura elástica ancha y cordones largos, que aportan un calce cómodo.Dispone de bolsillos laterales y bolsillo tipo plaque trasero.El frente presenta una estampa Lettering Hypestyle, sello distintivo de la marca. STYLE&CULTURE. Mia mide 1.75 y esta usando talle M`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "low",
    "M": "low",
    "L": "ok",
    "XL": "low"
    },
    colors: [
      { label: "Melange", value: "#b8b4ae", image: "products/lettering-melange-jort-0.png" },
    ],
    images: [
    "products/lettering-melange-jort-0.png",
    "products/lettering-melange-jort-1.png",
    "products/lettering-melange-jort-2.png",
    "products/lettering-melange-jort-3.png",
    "products/lettering-melange-jort-4.png",
    "products/lettering-melange-jort-5.png",
    "products/lettering-melange-jort-6.png"
    ],
  },
  {
    slug: "regular-tee-melange",
    id: "regular-tee-melange",
    name: "Regular Tee - Melange",
    category: "Tee",
    price: 34000,
    description: `REGULAR TEE  HYPESTYLECorte regular, al cuerpo. Diseñada para un fit cómodo y versátil.Confeccionada en algodón peinado 14/1, suave al tacto y de alta resistencia, con una excelente caída. Peso: 250 g Material: 100% algodón peinado 14/1 Fit: Regular, al cuerpo Detalles: cuello reforzado, costuras prolijas y terminación premium Una básica esencial, pensada para durar y acompañar cualquier outfit dentro del universo Hypestyle.

•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "low",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Melange", value: "#b8b4ae", image: "products/regular-tee-melange-0.png" },
    ],
    images: [
    "products/regular-tee-melange-0.png",
    "products/regular-tee-melange-1.png",
    "products/regular-tee-melange-2.jpg",
    "products/regular-tee-melange-3.webp"
    ],
  },
  {
    slug: "lettering-graphite-jort",
    id: "lettering-graphite-jort",
    name: "LETTERING GRAPHITE - JORT",
    category: "Jort",
    price: 55000,
    originalPrice: 69000,
    description: `Jort Hypestyle  Lettering Grafito Jort confeccionado en rústico pesado premium, con textura firme y suave al tacto.Cuenta con cintura elástica ancha y cordones largos, que aportan un calce cómodo.Dispone de bolsillos laterales y bolsillo tipo plaque trasero.El frente presenta una estampa Lettering Hypestyle, sello distintivo de la marca. STYLE&CULTURE.`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "low",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Graphite", value: "#4a4a4a", image: "products/lettering-graphite-jort-0.png" },
    ],
    images: [
    "products/lettering-graphite-jort-0.png",
    "products/lettering-graphite-jort-1.png",
    "products/lettering-graphite-jort-2.png",
    "products/lettering-graphite-jort-3.jpg",
    "products/lettering-graphite-jort-4.png",
    "products/lettering-graphite-jort-5.png",
    "products/lettering-graphite-jort-6.jpg"
    ],
  },
  {
    slug: "floral-silver-cross-longsleeve-black",
    id: "floral-silver-cross-longsleeve-black",
    name: "FLORAL SILVER CROSS - LONGSLEEVE BLACK",
    category: "Longsleeve",
    price: 64000,
    originalPrice: 80000,
    description: `DETALLES: Remera raglan de manga larga en color rosa pastel Estampado frontal minimalista con logo Hypestyle y lema No Faith. No Glory. en blanco Estampado trasero con diseño Floral Silver Cross en gran tamaño (DTG) Corte relajado para mayor comodidad Algodón 24/1 suave y resistente Parte de la FAITH COLLECTION

•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "out",
    "M": "out",
    "L": "low",
    "XL": "low"
    },
    colors: [
      { label: "Black", value: "#1a1a1a", image: "products/floral-silver-cross-longsleeve-black-0.png" },
    ],
    images: [
    "products/floral-silver-cross-longsleeve-black-0.png",
    "products/floral-silver-cross-longsleeve-black-1.png",
    "products/floral-silver-cross-longsleeve-black-2.jpg",
    "products/floral-silver-cross-longsleeve-black-3.jpg",
    "products/floral-silver-cross-longsleeve-black-4.png",
    "products/floral-silver-cross-longsleeve-black-5.png",
    "products/floral-silver-cross-longsleeve-black-6.png",
    "products/floral-silver-cross-longsleeve-black-7.png",
    "products/floral-silver-cross-longsleeve-black-8.webp"
    ],
  },
  {
    slug: "mesh-realtree-tee",
    id: "mesh-realtree-tee",
    name: "Mesh RealTree™ – Tee",
    category: "Tee",
    price: 45000,
    description: `Mesh RealTree  Tee (Edición Limitada) Pieza única de Hypestyle, confeccionada en mesh técnico sublimado con patrón RealTree original.Cada prenda presenta una textura ligera, respirable y con un contraste perfecto entre el camo y los detalles blancos, diseñada para destacar en cualquier contexto urbano. Esta edición es limitada y no se vuelve a producir.El proceso llevó múltiples muestras, pruebas de color y desarrollo hasta lograr este resultado final: rareza absoluta, calidad técnica y estética de culto. Detalles: Mesh sublimado RealTree Terminaciones premium en cuello y mangas Corte cómodo y estructurado Estampa frontal en alto contraste Caída liviana, ideal para uso diario o layering Fit: RegularComposición: 100% Poliéster técnicoEdición limitada  cuando se agota, no vuelve. STYLE&CULTURE.

•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "low",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Realtree", value: "#5a6b42", image: "products/mesh-realtree-tee-0.png" },
    ],
    images: [
    "products/mesh-realtree-tee-0.png",
    "products/mesh-realtree-tee-1.png",
    "products/mesh-realtree-tee-2.png",
    "products/mesh-realtree-tee-3.jpg",
    "products/mesh-realtree-tee-4.jpg",
    "products/mesh-realtree-tee-5.png",
    "products/mesh-realtree-tee-6.jpg"
    ],
  },
  {
    slug: "mesh-realtree-pink-tee",
    id: "mesh-realtree-pink-tee",
    name: "Mesh RealTree™ Pink – Tee",
    category: "Tee",
    price: 45000,
    description: `Mesh RealTree  Tee (Edición Limitada) Pieza única de Hypestyle, confeccionada en mesh técnico sublimado con patrón RealTree original.Cada prenda presenta una textura ligera, respirable y con un contraste perfecto entre el camo y los detalles blancos, diseñada para destacar en cualquier contexto urbano. Esta edición es limitada y no se vuelve a producir.El proceso llevó múltiples muestras, pruebas de color y desarrollo hasta lograr este resultado final: rareza absoluta, calidad técnica y estética de culto. Detalles: Mesh sublimado RealTree Terminaciones premium en cuello y mangas Corte cómodo y estructurado Estampa frontal en alto contraste Caída liviana, ideal para uso diario o layering Fit: RegularComposición: 100% Poliéster técnicoEdición limitada  cuando se agota, no vuelve. STYLE&CULTURE.

•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "out",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Pink", value: "#e88ea0", image: "products/mesh-realtree-pink-tee-0.png" },
    ],
    images: [
    "products/mesh-realtree-pink-tee-0.png",
    "products/mesh-realtree-pink-tee-1.png",
    "products/mesh-realtree-pink-tee-2.png",
    "products/mesh-realtree-pink-tee-3.png",
    "products/mesh-realtree-pink-tee-4.png",
    "products/mesh-realtree-pink-tee-5.png",
    "products/mesh-realtree-pink-tee-6.png",
    "products/mesh-realtree-pink-tee-7.png",
    "products/mesh-realtree-pink-tee-8.png",
    "products/mesh-realtree-pink-tee-9.png",
    "products/mesh-realtree-pink-tee-10.jpg"
    ],
  },
  {
    slug: "mesh-camo-blue-tee",
    id: "mesh-camo-blue-tee",
    name: "Mesh Camo Blue – Tee",
    category: "Tee",
    price: 45000,
    description: `Mesh Camo Blue  Tee Pieza única de Hypestyle, confeccionada en mesh técnico sublimado con patrón Camo.Cada prenda presenta una textura ligera, respirable y con un contraste perfecto entre el camo y los detalles blancos, diseñada para destacar en cualquier contexto urbano. Esta edición es limitada y no se vuelve a producir.El proceso llevó múltiples muestras, pruebas de color y desarrollo hasta lograr este resultado final: rareza absoluta, calidad técnica y estética de culto. Detalles: Mesh sublimado RealTree Terminaciones premium en cuello y mangas Corte cómodo y estructurado Estampa frontal en alto contraste Caída liviana, ideal para uso diario o layering Fit: RegularComposición: 100% Poliéster técnicoEdición limitada  cuando se agota, no vuelve. STYLE&CULTURE.

•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Camo", value: "#6b7c5c", image: "products/mesh-camo-blue-tee-0.png" },
    ],
    images: [
    "products/mesh-camo-blue-tee-0.png",
    "products/mesh-camo-blue-tee-1.png",
    "products/mesh-camo-blue-tee-2.jpg",
    "products/mesh-camo-blue-tee-3.jpg",
    "products/mesh-camo-blue-tee-4.jpg",
    "products/mesh-camo-blue-tee-5.jpg"
    ],
  },
  {
    slug: "mesh-camo-grey-tee",
    id: "mesh-camo-grey-tee",
    name: "Mesh Camo Grey – Tee",
    category: "Tee",
    price: 45000,
    description: `Mesh Camo Grey  Tee Pieza única de Hypestyle, confeccionada en mesh técnico sublimado con patrón Camo.Cada prenda presenta una textura ligera, respirable y con un contraste perfecto entre el camo y los detalles blancos, diseñada para destacar en cualquier contexto urbano. Esta edición es limitada y no se vuelve a producir.El proceso llevó múltiples muestras, pruebas de color y desarrollo hasta lograr este resultado final: rareza absoluta, calidad técnica y estética de culto. Detalles: Mesh sublimado RealTree Terminaciones premium en cuello y mangas Corte cómodo y estructurado Estampa frontal en alto contraste Caída liviana, ideal para uso diario o layering Fit: RegularComposición: 100% Poliéster técnicoEdición limitada  cuando se agota, no vuelve. STYLE&CULTURE.

•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Grey", value: "#888888", image: "products/mesh-camo-grey-tee-0.png" },
    ],
    images: [
    "products/mesh-camo-grey-tee-0.png",
    "products/mesh-camo-grey-tee-1.png",
    "products/mesh-camo-grey-tee-2.jpg",
    "products/mesh-camo-grey-tee-3.jpg",
    "products/mesh-camo-grey-tee-4.jpg",
    "products/mesh-camo-grey-tee-5.jpg"
    ],
  },
  {
    slug: "regular-tees-3-pack-black-white-melange",
    id: "regular-tees-3-pack-black-white-melange",
    name: "Regular Tees - 3 PACK (black, white, melange)",
    category: "Pack",
    price: 68300,
    originalPrice: 102000,
    description: `REGULAR TEEs (3PACK)  HYPESTYLE Pack de 3 remeras básicas regular fit, confeccionadas en algodón peinado 20/1 para mayor suavidad y resistencia. Vienen en negro, blanco y gris melange: los esenciales de todos los días, listos para usar solos o en capas. Corte regular, al cuerpo. Fit cómodo y versátil. Confeccionadas en 100% algodón peinado 20/1, suave al tacto y de alta durabilidad. Peso: 200 g aprox. Detalles: cuello reforzado, costuras prolijas y terminación premium.

•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Black", value: "#1a1a1a", image: "products/regular-tees-3-pack-black-white-melange-0.png" },
    ],
    images: [
    "products/regular-tees-3-pack-black-white-melange-0.png",
    "products/regular-tees-3-pack-black-white-melange-1.jpg",
    "products/regular-tees-3-pack-black-white-melange-2.jpg",
    "products/regular-tees-3-pack-black-white-melange-3.jpg",
    "products/regular-tees-3-pack-black-white-melange-4.jpg",
    "products/regular-tees-3-pack-black-white-melange-5.jpg",
    "products/regular-tees-3-pack-black-white-melange-6.png",
    "products/regular-tees-3-pack-black-white-melange-7.png",
    "products/regular-tees-3-pack-black-white-melange-8.png",
    "products/regular-tees-3-pack-black-white-melange-9.webp"
    ],
  },
  {
    slug: "regular-tees-3-pack-white",
    id: "regular-tees-3-pack-white",
    name: "Regular Tees - 3 PACK (White)",
    category: "Pack",
    price: 68300,
    originalPrice: 102000,
    description: `REGULAR TEEs (3PACK)  HYPESTYLE Pack de 3 remeras básicas regular fit, confeccionadas en algodón peinado 20/1 para mayor suavidad y resistencia. Vienen en negro, blanco y gris melange: los esenciales de todos los días, listos para usar solos o en capas. Corte regular, al cuerpo. Fit cómodo y versátil. Confeccionadas en 100% algodón peinado 20/1, suave al tacto y de alta durabilidad. Peso: 200 g aprox. Detalles: cuello reforzado, costuras prolijas y terminación premium.

•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "White", value: "#f5f5f5", image: "products/regular-tees-3-pack-white-0.png" },
    ],
    images: [
    "products/regular-tees-3-pack-white-0.png",
    "products/regular-tees-3-pack-white-1.jpg",
    "products/regular-tees-3-pack-white-2.jpg",
    "products/regular-tees-3-pack-white-3.webp",
    "products/regular-tees-3-pack-white-4.jpg"
    ],
  },
  {
    slug: "regular-tees-3-pack-black",
    id: "regular-tees-3-pack-black",
    name: "Regular Tees - 3 PACK (Black)",
    category: "Pack",
    price: 68300,
    originalPrice: 102000,
    description: `REGULAR TEEs (3PACK)  HYPESTYLE Pack de 3 remeras básicas regular fit, confeccionadas en algodón peinado 20/1 para mayor suavidad y resistencia. Vienen en negro, blanco y gris melange: los esenciales de todos los días, listos para usar solos o en capas. Corte regular, al cuerpo. Fit cómodo y versátil. Confeccionadas en 100% algodón peinado 20/1, suave al tacto y de alta durabilidad. Peso: 200 g aprox. Detalles: cuello reforzado, costuras prolijas y terminación premium.

•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Black", value: "#1a1a1a", image: "products/regular-tees-3-pack-black-0.png" },
    ],
    images: [
    "products/regular-tees-3-pack-black-0.png",
    "products/regular-tees-3-pack-black-1.jpg",
    "products/regular-tees-3-pack-black-2.jpg",
    "products/regular-tees-3-pack-black-3.jpg",
    "products/regular-tees-3-pack-black-4.webp",
    "products/regular-tees-3-pack-black-5.jpg"
    ],
  },
  {
    slug: "regular-tees-3-pack-grey",
    id: "regular-tees-3-pack-grey",
    name: "Regular Tees - 3 PACK (Grey)",
    category: "Pack",
    price: 68300,
    originalPrice: 102000,
    description: `REGULAR TEEs (3PACK)  HYPESTYLE Pack de 3 remeras básicas regular fit, confeccionadas en algodón peinado 20/1 para mayor suavidad y resistencia. Vienen en negro, blanco y gris melange: los esenciales de todos los días, listos para usar solos o en capas. Corte regular, al cuerpo. Fit cómodo y versátil. Confeccionadas en 100% algodón peinado 20/1, suave al tacto y de alta durabilidad. Peso: 200 g aprox. Detalles: cuello reforzado, costuras prolijas y terminación premium.

•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Grey", value: "#888888", image: "products/regular-tees-3-pack-grey-0.png" },
    ],
    images: [
    "products/regular-tees-3-pack-grey-0.png",
    "products/regular-tees-3-pack-grey-1.jpg",
    "products/regular-tees-3-pack-grey-2.webp"
    ],
  },
  {
    slug: "waffle-crest-sleeveless-pearl-grey",
    id: "waffle-crest-sleeveless-pearl-grey",
    name: "WAFFLE CREST SLEEVELESS – Pearl Grey",
    category: "Sleeveless",
    price: 38250,
    originalPrice: 45000,
    description: `Waffle Crest SleevelessMusculosa de waffle liviano con manga raglán y gráfica heráldica exclusiva.Textura premium, respirable y con fit relajado. Detalles: Tejido waffle liviano Sisa amplia y cómoda Estampa frontal + espalda Grifa lateral STYLE&CULTURE Disponible en Pearl Grey y Earth Brown`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Grey", value: "#888888", image: "products/waffle-crest-sleeveless-pearl-grey-0.png" },
    ],
    images: [
    "products/waffle-crest-sleeveless-pearl-grey-0.png",
    "products/waffle-crest-sleeveless-pearl-grey-1.png",
    "products/waffle-crest-sleeveless-pearl-grey-2.png",
    "products/waffle-crest-sleeveless-pearl-grey-3.png",
    "products/waffle-crest-sleeveless-pearl-grey-4.jpg"
    ],
  },
  {
    slug: "waffle-crest-sleeveless-earth-brown",
    id: "waffle-crest-sleeveless-earth-brown",
    name: "WAFFLE CREST SLEEVELESS – Earth Brown",
    category: "Sleeveless",
    price: 38250,
    originalPrice: 45000,
    description: `Waffle Crest SleevelessMusculosa de waffle liviano con manga raglán y gráfica heráldica exclusiva.Textura premium, respirable y con fit relajado. Detalles: Tejido waffle liviano Sisa amplia y cómoda Estampa frontal + espalda Grifa lateral STYLE&CULTURE Disponible en Pearl Grey y Earth Brown Bauti mide 1.77 y esta usando talle S`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "XL"],
    stock: {
    "S": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Earth", value: "#7b5a3c", image: "products/waffle-crest-sleeveless-earth-brown-0.png" },
    ],
    images: [
    "products/waffle-crest-sleeveless-earth-brown-0.png",
    "products/waffle-crest-sleeveless-earth-brown-1.png",
    "products/waffle-crest-sleeveless-earth-brown-2.png",
    "products/waffle-crest-sleeveless-earth-brown-3.png",
    "products/waffle-crest-sleeveless-earth-brown-4.png",
    "products/waffle-crest-sleeveless-earth-brown-5.png",
    "products/waffle-crest-sleeveless-earth-brown-6.png",
    "products/waffle-crest-sleeveless-earth-brown-7.jpg"
    ],
  },
  {
    slug: "trucker-cap-no-faith-no-glory",
    id: "trucker-cap-no-faith-no-glory",
    name: "TRUCKER CAP - NO FAITH, NO GLORY",
    category: "Accesorio",
    price: 32000,
    description: `TRUCKER CAP  HYPESTYLE Gorra trucker de frente estructurado y paneles traseros de mesh, pensada para uso diario con calce cómodo y regulable. Lleva bordado frontal de corona de espinas y el mensaje NO FAITH, NO GLORY, sumando el detalle JUAN 3:16 en el lateral. Una pieza clave de la FAITH Collection. Material: Frente en textil estructurado + paneles traseros de mesh Fit: Trucker, calce cómodo y regulable Detalles: Bordados premium en frente, lateral y espalda, visera curva, cierre snapback Color: Gris`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["Única"],
    stock: {
    "Única": "low"
    },
    colors: [
      { label: "Default", value: "#111111", image: "products/trucker-cap-no-faith-no-glory-0.png" },
    ],
    images: [
    "products/trucker-cap-no-faith-no-glory-0.png",
    "products/trucker-cap-no-faith-no-glory-1.png",
    "products/trucker-cap-no-faith-no-glory-2.png",
    "products/trucker-cap-no-faith-no-glory-3.jpg",
    "products/trucker-cap-no-faith-no-glory-4.png"
    ],
  },
  {
    slug: "jort-cargo-realtree-pink",
    id: "jort-cargo-realtree-pink",
    name: "JORT CARGO - REALTREE® PINK",
    category: "Jort",
    price: 69000,
    originalPrice: 92000,
    description: `JORT REALTREE PINK Jort cargo en gabardina premium de 10 oz con estampa RealTree Pink, tiro medio y calce relaxed hasta la rodilla. Pensado para el día a día, la calle y el verano. Tela de gabardina premium 10 oz, firme pero cómoda Estampa completa RealTree Pink Cintura con cordón ajustable Bolsillos cargo laterales + bolsillos traseros tipo plaqué Largo por encima de la rodilla, fit relaxed streetwear

•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "low",
    "M": "ok",
    "L": "out",
    "XL": "low"
    },
    colors: [
      { label: "Pink", value: "#e88ea0", image: "products/jort-cargo-realtree-pink-0.png" },
    ],
    images: [
    "products/jort-cargo-realtree-pink-0.png",
    "products/jort-cargo-realtree-pink-1.png",
    "products/jort-cargo-realtree-pink-2.png",
    "products/jort-cargo-realtree-pink-3.jpg",
    "products/jort-cargo-realtree-pink-4.jpg",
    "products/jort-cargo-realtree-pink-5.jpg",
    "products/jort-cargo-realtree-pink-6.jpg",
    "products/jort-cargo-realtree-pink-7.png",
    "products/jort-cargo-realtree-pink-8.jpg"
    ],
  },
  {
    slug: "jort-cargo-realtree-beige",
    id: "jort-cargo-realtree-beige",
    name: "JORT CARGO - REALTREE® BEIGE",
    category: "Jort",
    price: 69000,
    originalPrice: 92000,
    description: `JORT REALTREE BEIGE Jort cargo en gabardina premium de 10 oz con estampa RealTree Beige, tiro medio y calce relaxed hasta la rodilla. Ideal para el día a día, la calle y el verano. Tela de gabardina premium 10 oz, firme pero cómoda Estampa completa RealTree Beige en tonos arena Cintura con cordón ajustable Bolsillos cargo laterales + bolsillos traseros tipo plaqué Largo por encima de la rodilla, fit relaxed streetwear

•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "low",
    "M": "out",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Beige", value: "#c4aa87", image: "products/jort-cargo-realtree-beige-0.png" },
    ],
    images: [
    "products/jort-cargo-realtree-beige-0.png",
    "products/jort-cargo-realtree-beige-1.jpg",
    "products/jort-cargo-realtree-beige-2.jpg",
    "products/jort-cargo-realtree-beige-3.jpg",
    "products/jort-cargo-realtree-beige-4.jpg",
    "products/jort-cargo-realtree-beige-5.jpg",
    "products/jort-cargo-realtree-beige-6.jpg",
    "products/jort-cargo-realtree-beige-7.png",
    "products/jort-cargo-realtree-beige-8.jpg"
    ],
  },
  {
    slug: "sleeveless-ranglan-white",
    id: "sleeveless-ranglan-white",
    name: "SLEEVELESS RANGLAN - WHITE",
    category: "Sleeveless",
    price: 38250,
    originalPrice: 45000,
    description: `SLEEVELESS RANGLAN  WHITE Remera sin mangas oversize con corte ranglan, pensada para el gym y la calle. Ligera, cómoda y con detalles técnicos que resaltan bajo la luz. Fit oversize, amplio y relajado Mangas ranglan cortas tipo cut off Vivo reflectivo en las uniones de las mangas Estampado frontal exclusivo HYPESTYLE Disponible en 4 colores, ideal para combinar en tus rutinas de entrenamiento

•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "White", value: "#f5f5f5", image: "products/sleeveless-ranglan-white-0.png" },
    ],
    images: [
    "products/sleeveless-ranglan-white-0.png",
    "products/sleeveless-ranglan-white-1.png",
    "products/sleeveless-ranglan-white-2.png",
    "products/sleeveless-ranglan-white-3.png",
    "products/sleeveless-ranglan-white-4.jpg"
    ],
  },
  {
    slug: "sleeveless-ranglan-black",
    id: "sleeveless-ranglan-black",
    name: "SLEEVELESS RANGLAN - BLACK",
    category: "Sleeveless",
    price: 38250,
    originalPrice: 45000,
    description: `SLEEVELESS RANGLAN  BLACK Remera sin mangas oversize con corte ranglan, pensada para el gym y la calle. Ligera, cómoda y con detalles técnicos que resaltan bajo la luz. Fit oversize, amplio y relajado Mangas ranglan cortas tipo cut off Vivo reflectivo en las uniones de las mangas Estampado frontal exclusivo HYPESTYLE Disponible en 4 colores, ideal para combinar en tus rutinas de entrenamiento

•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Black", value: "#1a1a1a", image: "products/sleeveless-ranglan-black-0.png" },
    ],
    images: [
    "products/sleeveless-ranglan-black-0.png",
    "products/sleeveless-ranglan-black-1.png",
    "products/sleeveless-ranglan-black-2.png"
    ],
  },
  {
    slug: "sleeveless-ranglan-grey",
    id: "sleeveless-ranglan-grey",
    name: "SLEEVELESS RANGLAN - GREY",
    category: "Sleeveless",
    price: 38250,
    originalPrice: 45000,
    description: `SLEEVELESS RANGLAN  GREY Remera sin mangas oversize con corte ranglan, pensada para el gym y la calle. Ligera, cómoda y con detalles técnicos que resaltan bajo la luz. Fit oversize, amplio y relajado Mangas ranglan cortas tipo cut off Vivo reflectivo en las uniones de las mangas Estampado frontal exclusivo HYPESTYLE Disponible en 4 colores, ideal para combinar en tus rutinas de entrenamiento

•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Grey", value: "#888888", image: "products/sleeveless-ranglan-grey-0.png" },
    ],
    images: [
    "products/sleeveless-ranglan-grey-0.png",
    "products/sleeveless-ranglan-grey-1.png",
    "products/sleeveless-ranglan-grey-2.jpg",
    "products/sleeveless-ranglan-grey-3.jpg",
    "products/sleeveless-ranglan-grey-4.png",
    "products/sleeveless-ranglan-grey-5.jpg"
    ],
  },
  {
    slug: "jersey-fileteado-x-alfredo-genovese",
    id: "jersey-fileteado-x-alfredo-genovese",
    name: "JERSEY FILETEADO – x ALFREDO GENOVESE",
    category: "Jersey",
    price: 78400,
    originalPrice: 98000,
    description: `JERSEY FILETEADO  HYPESTYLE x ALFREDO GENOVESE Remera deportiva tipo jersey hecha en tela técnica a partir de materiales reciclados, liviana y respirable. Sublimada full print con arte de fileteado porteño, pensada para la cancha y la calle. Esta pieza es una colaboración con el artista Alfredo Genovese (@fileteado), fileteador argentino de gran trayectoria, con trabajos junto a marcas como Nike, Evian y Red Bull. Tejido deportivo reciclado, de secado rápido Sublimación full print de alta definición Cuello en V con puños premium Vivo blanco en las uniones de las mangas Escudo frontal en DTF con relieve 3D Fit medio oversize, cómodo y relajado para usar dentro y fuera de la cancha

•
•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Default", value: "#111111", image: "products/jersey-fileteado-x-alfredo-genovese-0.png" },
    ],
    images: [
    "products/jersey-fileteado-x-alfredo-genovese-0.png",
    "products/jersey-fileteado-x-alfredo-genovese-1.jpg",
    "products/jersey-fileteado-x-alfredo-genovese-2.png",
    "products/jersey-fileteado-x-alfredo-genovese-3.png",
    "products/jersey-fileteado-x-alfredo-genovese-4.png",
    "products/jersey-fileteado-x-alfredo-genovese-5.png",
    "products/jersey-fileteado-x-alfredo-genovese-6.jpg"
    ],
  },
  {
    slug: "sleeveless-ranglan-militar-green",
    id: "sleeveless-ranglan-militar-green",
    name: "SLEEVELESS RANGLAN - MILITAR GREEN",
    category: "Sleeveless",
    price: 38250,
    originalPrice: 45000,
    description: `SLEEVELESS RANGLAN  MILITAR GREEN Remera sin mangas oversize con corte ranglan, pensada para el gym y la calle. Ligera, cómoda y con detalles técnicos que resaltan bajo la luz. Fit oversize, amplio y relajado Mangas ranglan cortas tipo cut off Vivo reflectivo en las uniones de las mangas Estampado frontal exclusivo HYPESTYLE Disponible en 4 colores, ideal para combinar en tus rutinas de entrenamiento

•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Militar", value: "#2F3D28", image: "products/sleeveless-ranglan-militar-green-0.png" },
    ],
    images: [
    "products/sleeveless-ranglan-militar-green-0.png",
    "products/sleeveless-ranglan-militar-green-1.png",
    "products/sleeveless-ranglan-militar-green-2.png",
    "products/sleeveless-ranglan-militar-green-3.png",
    "products/sleeveless-ranglan-militar-green-4.png",
    "products/sleeveless-ranglan-militar-green-5.jpg"
    ],
  },
  {
    slug: "skyline-tee",
    id: "skyline-tee",
    name: "SKYLINE TEE",
    category: "Tee",
    price: 38250,
    originalPrice: 45000,
    description: `SKYLINE TEE Remera negra con estampa frontal de ciudad al atardecer, pensada para la calle y las noches largas. Gráfico full color con vibe cinemática, ideal para levantar cualquier outfit. Fit relaxed, levemente oversize Estampa frontal full color de alta definición Tela suave y resistente, cómoda para uso diario Cuello redondo con rib reforzado Grifa lateral HYPESTYLE Style & Culture

•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Default", value: "#111111", image: "products/skyline-tee-0.png" },
    ],
    images: [
    "products/skyline-tee-0.png",
    "products/skyline-tee-1.jpg",
    "products/skyline-tee-2.jpg",
    "products/skyline-tee-3.jpg",
    "products/skyline-tee-4.webp",
    "products/skyline-tee-5.webp"
    ],
  },
  {
    slug: "hypestation-black-tee",
    id: "hypestation-black-tee",
    name: "HYPESTATION - BLACK TEE",
    category: "Tee",
    price: 38250,
    originalPrice: 45000,
    description: `HYPESTATION  BLACK TEE Remera negra regular fit, básica pero con actitud. Estampada en DTG de alta definición y confeccionada en algodón peinado 20/1 para uso diario. Corte regular, clásico y cómodo Tela 100% algodón peinado 20/1, suave y resistente Estampa frontal en DTG (impresión directa) Cuello redondo con rib reforzado Grifa HYPESTYLE Style & Culture en la terminación

•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Black", value: "#1a1a1a", image: "products/hypestation-black-tee-0.png" },
    ],
    images: [
    "products/hypestation-black-tee-0.png",
    "products/hypestation-black-tee-1.jpg",
    "products/hypestation-black-tee-2.jpg",
    "products/hypestation-black-tee-3.jpg",
    "products/hypestation-black-tee-4.webp",
    "products/hypestation-black-tee-5.webp"
    ],
  },
  {
    slug: "hypestation-white-tee",
    id: "hypestation-white-tee",
    name: "HYPESTATION - WHITE TEE",
    category: "Tee",
    price: 38250,
    originalPrice: 45000,
    description: `HYPESTATION  WHITE TEE Remera blanca regular fit, básica pero con actitud. Estampada en DTG de alta definición y confeccionada en algodón peinado 20/1 para uso diario. Corte regular, clásico y cómodo Tela 100% algodón peinado 20/1, suave y resistente Estampa frontal en DTG (impresión directa) Cuello redondo con rib reforzado Grifa HYPESTYLE Style & Culture en la terminación

•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "White", value: "#f5f5f5", image: "products/hypestation-white-tee-0.png" },
    ],
    images: [
    "products/hypestation-white-tee-0.png",
    "products/hypestation-white-tee-1.png",
    "products/hypestation-white-tee-2.png",
    "products/hypestation-white-tee-3.png",
    "products/hypestation-white-tee-4.png",
    "products/hypestation-white-tee-5.webp"
    ],
  },
  {
    slug: "per-aspera-ad-astra-black-tee",
    id: "per-aspera-ad-astra-black-tee",
    name: "PER ASPERA AD ASTRA - BLACK TEE",
    category: "Tee",
    price: 38250,
    originalPrice: 45000,
    description: `Remera negra con diseño inspirado en billete/heráldica, pensada como complemento del encendedor HYPESTYLE x STARVOUND. Estampa pequeña en el frente y arte full back con el lema PER ASPERA AD ASTRA y Style & Culture. Esta pieza forma parte de la colaboración HYPESTYLE x STARVOUND. 100% algodón peinado, suave y resistente Fit medio oversize, cómodo y relajado Estampa frontal y trasera de alta definición Cuello redondo con rib reforzado Grifa lateral HYPESTYLE Style & Culture

•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Black", value: "#1a1a1a", image: "products/per-aspera-ad-astra-black-tee-0.png" },
    ],
    images: [
    "products/per-aspera-ad-astra-black-tee-0.png",
    "products/per-aspera-ad-astra-black-tee-1.png",
    "products/per-aspera-ad-astra-black-tee-2.jpg",
    "products/per-aspera-ad-astra-black-tee-3.jpg",
    "products/per-aspera-ad-astra-black-tee-4.jpg",
    "products/per-aspera-ad-astra-black-tee-5.jpg",
    "products/per-aspera-ad-astra-black-tee-6.jpg",
    "products/per-aspera-ad-astra-black-tee-7.webp"
    ],
  },
  {
    slug: "per-aspera-ad-astra-white-tee",
    id: "per-aspera-ad-astra-white-tee",
    name: "PER ASPERA AD ASTRA - WHITE TEE",
    category: "Tee",
    price: 38250,
    originalPrice: 45000,
    description: `Remera blanca con diseño inspirado en billete/heráldica, pensada como complemento del encendedor HYPESTYLE x STARVOUND. Estampa pequeña en el frente y arte full back con el lema PER ASPERA AD ASTRA y Style & Culture. Esta pieza forma parte de la colaboración HYPESTYLE x STARVOUND. 100% algodón peinado, suave y resistente Fit medio oversize, cómodo y relajado Estampa frontal y trasera de alta definición Cuello redondo con rib reforzado Grifa lateral HYPESTYLE Style & Culture

•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "White", value: "#f5f5f5", image: "products/per-aspera-ad-astra-white-tee-0.png" },
    ],
    images: [
    "products/per-aspera-ad-astra-white-tee-0.png",
    "products/per-aspera-ad-astra-white-tee-1.png",
    "products/per-aspera-ad-astra-white-tee-2.jpg",
    "products/per-aspera-ad-astra-white-tee-3.jpg",
    "products/per-aspera-ad-astra-white-tee-4.jpg",
    "products/per-aspera-ad-astra-white-tee-5.jpg",
    "products/per-aspera-ad-astra-white-tee-6.jpg",
    "products/per-aspera-ad-astra-white-tee-7.webp"
    ],
  },
  {
    slug: "aeroblue-tees",
    id: "aeroblue-tees",
    name: "AEROBLUE – TEEs",
    category: "Tee",
    price: 38250,
    originalPrice: 45000,
    description: `AEROBLUE  TEEs Remera blanca, gris y negra con gráfico central Hype en celeste efecto aerógrafo, con vibra Y2K y street. Fit medio oversize, cómodo y relajado Estampa frontal estilo airbrush Tela 100% algodón, suave y resistente para uso diario Grifa lateral HYPESTYLE STYLE&CULTURE

•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Blue", value: "#3a6ea8", image: "products/aeroblue-tees-0.png" },
    ],
    images: [
    "products/aeroblue-tees-0.png",
    "products/aeroblue-tees-1.png",
    "products/aeroblue-tees-2.png",
    "products/aeroblue-tees-3.jpg",
    "products/aeroblue-tees-4.webp"
    ],
  },
  {
    slug: "aeropink-tees",
    id: "aeropink-tees",
    name: "AEROPINK - TEEs",
    category: "Tee",
    price: 38250,
    originalPrice: 45000,
    description: `AEROPINK TEES Remera regular fit con gráfico central Hype en rosa efecto aerógrafo, con vibra Y2K bien street. Disponible en blanco, gris melange y negro para elegir el contraste que más te guste. Fit medio oversize, calce unisex y relajado Estampa frontal estilo airbrush pink Tela 100% algodón peinado, suave y resistente para uso diario Grifa lateral HYPESTYLE STYLE & CULTURE

•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Pink", value: "#e88ea0", image: "products/aeropink-tees-0.png" },
    ],
    images: [
    "products/aeropink-tees-0.png",
    "products/aeropink-tees-1.png",
    "products/aeropink-tees-2.png",
    "products/aeropink-tees-3.jpg",
    "products/aeropink-tees-4.webp"
    ],
  },
  {
    slug: "per-aspera-ad-astra-zippo",
    id: "per-aspera-ad-astra-zippo",
    name: "Per Aspera Ad Astra - ZIPPO",
    category: "Accesorio",
    price: 60000,
    description: `Encendedor tipo Zippo en colaboración HYPESTYLE x STARVOUND. Cuerpo metálico con acabado cromado y grabado full frente inspirado en billete/heráldica, con el sello Per Aspera Ad Astra y logo HS. En la parte trasera lleva el emblema HYPESTYLE x STARVOUND y el claim STYLE&CULTURE. Encendedor metálico recargable (nafta tipo Zippo) Sistema clásico a piedra, resistente al viento Grabado láser frontal y trasero de alta definición Terminación premium, ideal como pieza de uso diario o coleccionable

•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["Única"],
    stock: {
    "Única": "ok"
    },
    colors: [
      { label: "Default", value: "#111111", image: "products/per-aspera-ad-astra-zippo-0.png" },
    ],
    images: [
    "products/per-aspera-ad-astra-zippo-0.png",
    "products/per-aspera-ad-astra-zippo-1.png",
    "products/per-aspera-ad-astra-zippo-2.png",
    "products/per-aspera-ad-astra-zippo-3.png",
    "products/per-aspera-ad-astra-zippo-4.png",
    "products/per-aspera-ad-astra-zippo-5.png"
    ],
  },
  {
    slug: "find-jesus-longsleeve-black",
    id: "find-jesus-longsleeve-black",
    name: "FIND JESUS - LONGSLEEVE BLACK",
    category: "Longsleeve",
    price: 64000,
    originalPrice: 80000,
    description: `DETALLES: Remera raglan de manga larga en color negro Estampado frontal cara de cristo y lema No Faith. No Glory. Estampado trasero con diseño FIND JESUS en gran tamaño (DTG) Corte relajado para mayor comodidad Algodón 24/1 suave y resistente Parte de la FAITH COLLECTION Pidan, y se les dará; busquen, y encontrarán; llamen, y se les abrirá. Porque todo el que pide, recibe; el que busca, encuentra; y al que llama, se le abre. Mateo 7:7-8

•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "out",
    "M": "out",
    "L": "out",
    "XL": "ok"
    },
    colors: [
      { label: "Black", value: "#1a1a1a", image: "products/find-jesus-longsleeve-black-0.png" },
    ],
    images: [
    "products/find-jesus-longsleeve-black-0.png",
    "products/find-jesus-longsleeve-black-1.png",
    "products/find-jesus-longsleeve-black-2.png",
    "products/find-jesus-longsleeve-black-3.png",
    "products/find-jesus-longsleeve-black-4.png",
    "products/find-jesus-longsleeve-black-5.png",
    "products/find-jesus-longsleeve-black-6.webp"
    ],
  },
  {
    slug: "aerogrey-tees",
    id: "aerogrey-tees",
    name: "AEROGREY - TEEs",
    category: "Tee",
    price: 38250,
    originalPrice: 45000,
    description: `AEROGREY TEES Remera regular fit con gráfico central Hype en rosa efecto aerógrafo, con vibra Y2K bien street. Disponible en blanco, gris melange y negro para elegir el contraste que más te guste. Fit medio oversize, calce unisex y relajado Estampa frontal estilo airbrush grey Tela 100% algodón peinado, suave y resistente para uso diario Grifa lateral HYPESTYLE STYLE & CULTURE

•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Grey", value: "#888888", image: "products/aerogrey-tees-0.png" },
    ],
    images: [
    "products/aerogrey-tees-0.png",
    "products/aerogrey-tees-1.png",
    "products/aerogrey-tees-2.png",
    "products/aerogrey-tees-3.png",
    "products/aerogrey-tees-4.png",
    "products/aerogrey-tees-5.jpg",
    "products/aerogrey-tees-6.jpg",
    "products/aerogrey-tees-7.webp"
    ],
  },
  {
    slug: "honda-black-tee",
    id: "honda-black-tee",
    name: "HONDA BLACK - TEE",
    category: "Tee",
    price: 38250,
    originalPrice: 45000,
    description: `HONDA BLACK - TEE Remera negra de corte medio oversize con gráfico frontal HYPE en tono crudo, logrando un contraste fuerte y bien street. Ideal para outfits oscuros, denim lavado o pantalones cargos. Color: negro con estampa en crudo Fit: medio oversize, calce relajado y unisex Estampa frontal de alta definición con look vintage Tela de algodón peinado premium, cómoda y respirable Cuello redondo con rib reforzado que mantiene la forma con el uso Grifa lateral HYPESTYLE STYLE & CULTURE

•
•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Black", value: "#1a1a1a", image: "products/honda-black-tee-0.png" },
    ],
    images: [
    "products/honda-black-tee-0.png",
    "products/honda-black-tee-1.jpg",
    "products/honda-black-tee-2.jpg",
    "products/honda-black-tee-3.webp"
    ],
  },
  {
    slug: "hoodie-stay-hustle",
    id: "hoodie-stay-hustle",
    name: "HOODIE - STAY HUSTLE.",
    category: "Hoodie",
    price: 68600,
    originalPrice: 98000,
    description: `HOODIE  STAY HUSTLE. Buzo de rústico gris grafito, pensado para el día a día y las noches de calle. Estampa STAY HUSTLE en el frente y gráfico complementario en la espalda. Tela rústica, cómoda y liviana Color: gris grafito Estampa frontal y trasera de alta definición Capucha y bolsillo canguro Puños y cintura elastizados para mejor calce

•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Boxy Oversized",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Default", value: "#111111", image: "products/hoodie-stay-hustle-0.png" },
    ],
    images: [
    "products/hoodie-stay-hustle-0.png",
    "products/hoodie-stay-hustle-1.png",
    "products/hoodie-stay-hustle-2.png",
    "products/hoodie-stay-hustle-3.png",
    "products/hoodie-stay-hustle-4.png",
    "products/hoodie-stay-hustle-5.png",
    "products/hoodie-stay-hustle-6.png",
    "products/hoodie-stay-hustle-7.png",
    "products/hoodie-stay-hustle-8.png",
    "products/hoodie-stay-hustle-9.png",
    "products/hoodie-stay-hustle-10.png",
    "products/hoodie-stay-hustle-11.jpg"
    ],
  },
  {
    slug: "lettering-graphite-hoodie",
    id: "lettering-graphite-hoodie",
    name: "LETTERING GRAPHITE - HOODIE",
    category: "Hoodie",
    price: 68600,
    originalPrice: 98000,
    description: `LETTERING GRAPHITE - HOODIE Buzo de rústico gris grafito, pensado para el día a día y las noches de calle. Estampa LETTERING en el frente. Tela rústica, cómoda y liviana Color: gris grafito Estampa frontal y trasera de alta definición Capucha y bolsillo canguro Puños y cintura elastizados para mejor calce

•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Boxy Oversized",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "low",
    "M": "ok",
    "L": "out",
    "XL": "low"
    },
    colors: [
      { label: "Graphite", value: "#4a4a4a", image: "products/lettering-graphite-hoodie-0.png" },
    ],
    images: [
    "products/lettering-graphite-hoodie-0.png",
    "products/lettering-graphite-hoodie-1.png",
    "products/lettering-graphite-hoodie-2.png",
    "products/lettering-graphite-hoodie-3.png",
    "products/lettering-graphite-hoodie-4.png",
    "products/lettering-graphite-hoodie-5.png",
    "products/lettering-graphite-hoodie-6.jpg"
    ],
  },
  {
    slug: "honda-white-tee",
    id: "honda-white-tee",
    name: "HONDA WHITE - TEE",
    category: "Tee",
    price: 38250,
    originalPrice: 45000,
    description: `HONDA WHITE - TEE Remera blanca de corte medio oversize con gráfico frontal HYPE inspirado en la cultura automotriz. El logo azul desgastado le da una vibra vintage/racing, perfecta para usar con jean, cargos o shorts. Color: blanco con estampa azul Fit: medio oversize, hombros levemente caídos y cuerpo amplio Estampa frontal de alta definición con textura cracked/vintage Tela de algodón peinado premium, suave al tacto y resistente al uso diario Cuello redondo con rib reforzado para mayor durabilidad Grifa lateral HYPESTYLE STYLE & CULTURE

•
•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "White", value: "#f5f5f5", image: "products/honda-white-tee-0.png" },
    ],
    images: [
    "products/honda-white-tee-0.png",
    "products/honda-white-tee-1.jpg",
    "products/honda-white-tee-2.jpg"
    ],
  },
  {
    slug: "lettering-pink-jort",
    id: "lettering-pink-jort",
    name: "LETTERING PINK - JORT",
    category: "Jort",
    price: 55200,
    originalPrice: 69000,
    description: `Jort Hypestyle  Lettering Pink Jort confeccionado en rústico pesado premium, con textura firme y suave al tacto.Cuenta con cintura elástica ancha y cordones largos, que aportan un calce cómodo.Dispone de bolsillos laterales y bolsillo tipo plaque trasero.El frente presenta una estampa Lettering Hypestyle, sello distintivo de la marca. STYLE&CULTURE.`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "low",
    "M": "out",
    "L": "low",
    "XL": "ok"
    },
    colors: [
      { label: "Pink", value: "#e88ea0", image: "products/lettering-pink-jort-0.png" },
    ],
    images: [
    "products/lettering-pink-jort-0.png",
    "products/lettering-pink-jort-1.png",
    "products/lettering-pink-jort-2.png",
    "products/lettering-pink-jort-3.jpg"
    ],
  },
  {
    slug: "no-love-only-style-tops",
    id: "no-love-only-style-tops",
    name: "No Love, Only Style - TOPs",
    category: "Top",
    price: 28000,
    originalPrice: 33000,
    description: `Top de morley de la Colección San Valentín, cropped y al cuerpo, con breteles anchos y bordado frontal de corazón intervenido. Pensado para usar solo o en capas, tanto para el día como para la noche. Disponible en 4 colorways: blanco hueso, azul royal, negro y gris jaspeado. Tela: morley elastizado, suave y cómodo Fit: tiro corto, al cuerpo, con buena sujeción Detalle: bordado frontal temático San Valentín Terminación con grifa HYPESTYLE en lateral

•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["Beige", "Azul", "Negro", "Gris"],
    stock: {
    "Beige": "ok",
    "Azul": "ok",
    "Negro": "ok",
    "Gris": "ok"
    },
    colors: [
      { label: "Default", value: "#111111", image: "products/no-love-only-style-tops-0.png" },
    ],
    images: [
    "products/no-love-only-style-tops-0.png",
    "products/no-love-only-style-tops-1.png",
    "products/no-love-only-style-tops-2.png",
    "products/no-love-only-style-tops-3.png",
    "products/no-love-only-style-tops-4.jpg",
    "products/no-love-only-style-tops-5.png",
    "products/no-love-only-style-tops-6.png",
    "products/no-love-only-style-tops-7.jpg",
    "products/no-love-only-style-tops-8.jpg",
    "products/no-love-only-style-tops-9.jpg"
    ],
  },
  {
    slug: "trucker-cap-baby-come-back",
    id: "trucker-cap-baby-come-back",
    name: "TRUCKER CAP - BABY COME BACK",
    category: "Accesorio",
    price: 30400,
    originalPrice: 38000,
    description: `RUCKER CAP  NO LOVE, ONLY STYLE Gorra trucker de frente blanco y paneles traseros de mesh rosa pastel, pensada para el día a día con calce cómodo y regulable. Lleva bordado frontal del corazón roto con el mensaje No Love, Only Style, estrellas en el lateral y la firma Hype. en la espalda. Parte de la Colección San Valentín. Material: Frente en textil estructurado + paneles traseros de meshFit: Trucker, calce cómodo y regulableDetalles: Bordado frontal No Love, Only Style con corazón, bordado lateral de estrellas, bordado trasero Hype., visera curva, cierre snapbackColor: Rosa pastel / blanco`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["Única"],
    stock: {
    "Única": "ok"
    },
    colors: [
      { label: "Default", value: "#111111", image: "products/trucker-cap-baby-come-back-0.png" },
    ],
    images: [
    "products/trucker-cap-baby-come-back-0.png",
    "products/trucker-cap-baby-come-back-1.png",
    "products/trucker-cap-baby-come-back-2.png",
    "products/trucker-cap-baby-come-back-3.jpg"
    ],
  },
  {
    slug: "baby-come-back-tees",
    id: "baby-come-back-tees",
    name: "BABY COME BACK - TEEs",
    category: "Tee",
    price: 54400,
    originalPrice: 68000,
    description: `BABY COME BACK  TEEs Remera oversize con mangas ranglan y gráfico frontal BABY COME BACK con corazones rotos y vibes bien San Valentín / Y2K. Pensada para la calle, el club o para llorar con estilo por ese amor que se fue. Disponible en blanco y negro con estampa en tonos rosas y rojos. Material: Jersey 100% algodón peinado, suave y resistente Fit: Medio oversize, hombros caídos y cuerpo amplio Detalles: Estampa frontal full color de alta definición con efecto glow, texto + corazones rotos, grifa lateral HYPESTYLE Cuello: Redondo con rib reforzado para mayor durabilidad

•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "out",
    "M": "out",
    "L": "out",
    "XL": "low"
    },
    colors: [
      { label: "Default", value: "#111111", image: "products/baby-come-back-tees-0.png" },
    ],
    images: [
    "products/baby-come-back-tees-0.png",
    "products/baby-come-back-tees-1.png",
    "products/baby-come-back-tees-2.jpg",
    "products/baby-come-back-tees-3.jpg",
    "products/baby-come-back-tees-4.png",
    "products/baby-come-back-tees-5.png",
    "products/baby-come-back-tees-6.jpg"
    ],
  },
  {
    slug: "trucker-cap-11-x-art-by-randal",
    id: "trucker-cap-11-x-art-by-randal",
    name: "Trucker Cap 1/1 – x Art By Randal",
    category: "Accesorio",
    price: 30000,
    description: `Trucker 1/1  Art Edition Esta gorra fue intervenida a mano por Art By Randal.No hay dos iguales. No existe reposición. No existe remake. Salpicaduras reales.Capas de pintura reales.Textura real. Esto no es una estampa.Es una pieza única. Cada intervención tiene composición, movimiento y carácter propio.Cuando esta pieza se vende, desaparece para siempre. Base trucker negro/blanco Intervención manual 1/1 Pintura aplicada a mano Pieza irrepetible Edición limitada No hay restock. No se repite el diseño.`,
    careItems: CARE_ACCESSORY,
    fit: "Talle único",
    sizes: ["Única"],
    stock: {
    "Única": "low"
    },
    colors: [
      { label: "Default", value: "#111111", image: "products/trucker-cap-11-x-art-by-randal-0.png" },
    ],
    images: [
    "products/trucker-cap-11-x-art-by-randal-0.png",
    "products/trucker-cap-11-x-art-by-randal-1.png",
    "products/trucker-cap-11-x-art-by-randal-2.png"
    ],
  },
  {
    slug: "regular-tee-11-x-art-by-randal",
    id: "regular-tee-11-x-art-by-randal",
    name: "Regular Tee 1/1 – x Art By Randal",
    category: "Tee",
    price: 24000,
    originalPrice: 30000,
    description: `Cada pieza fue intervenida a mano por Art By Randal.No existen dos iguales. No hay reposición. La base es limpia.La intervención es real.El resultado es irrepetible. Salpicaduras aplicadas manualmente.Movimiento orgánico.Composición única. Cuando esta prenda se vende, desaparece para siempre. Fit regular Base blanca premium Intervención manual 1/1 Pintura aplicada a mano Pieza única ⚠️ No se repite el diseño.`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "low",
    "XL": "ok"
    },
    colors: [
      { label: "Default", value: "#111111", image: "products/regular-tee-11-x-art-by-randal-0.png" },
    ],
    images: [
    "products/regular-tee-11-x-art-by-randal-0.png",
    "products/regular-tee-11-x-art-by-randal-1.png",
    "products/regular-tee-11-x-art-by-randal-2.jpg",
    "products/regular-tee-11-x-art-by-randal-3.webp"
    ],
  },
  {
    slug: "no-service-for-the-faithless-hoodie",
    id: "no-service-for-the-faithless-hoodie",
    name: "NO SERVICE FOR THE FAITHLESS - HOODIE",
    category: "Hoodie",
    price: 44000,
    description: `LETTERING GRAPHITE - HOODIE Buzo de rústico gris grafito, pensado para el día a día y las noches de calle. Estampa NSFTF en el frente. Tela rústica, cómoda y liviana Color: gris grafito Estampa frontal y trasera de alta definición Capucha y bolsillo canguro Puños y cintura elastizados para mejor calce

•
•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Boxy Oversized",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "low",
    "M": "ok",
    "L": "low",
    "XL": "low"
    },
    colors: [
      { label: "Default", value: "#111111", image: "products/no-service-for-the-faithless-hoodie-0.png" },
    ],
    images: [
    "products/no-service-for-the-faithless-hoodie-0.png",
    "products/no-service-for-the-faithless-hoodie-1.png",
    "products/no-service-for-the-faithless-hoodie-2.png",
    "products/no-service-for-the-faithless-hoodie-3.jpg"
    ],
  },
  {
    slug: "no-service-for-the-faithless-tees",
    id: "no-service-for-the-faithless-tees",
    name: "NO SERVICE FOR THE FAITHLESS - TEEs",
    category: "Tee",
    price: 54400,
    originalPrice: 68000,
    description: `NO SERVICE FOR THE FAITHLESS  TEEs Remera oversize con mangas ranglan en color verde militar, negro, gris y blanco. Gráfico frontal estilo escudo con tipografía gótica, leones heráldicos y detalles clásicos. Inspirada en la estética medieval reinterpretada desde el streetwear moderno. Pensada para la calle, el día a día o para destacar con una pieza sólida, sobria y con carácter. Disponible en verde con estampa monocromática en negro de alto contraste. Material: Jersey 100% algodón peinado, suave, resistente y cómodo para uso diario Fit: Medio oversize, hombros caídos y cuerpo amplio Detalles: Estampa frontal en alta definición con escudo central HS, tipografía ornamental y composición simétrica, grifa lateral HYPESTYLE Cuello: Redondo con rib reforzado para mayor durabilidad

•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "out",
    "M": "low",
    "L": "low",
    "XL": "low"
    },
    colors: [
      { label: "Default", value: "#111111", image: "products/no-service-for-the-faithless-tees-0.webp" },
    ],
    images: [
    "products/no-service-for-the-faithless-tees-0.webp",
    "products/no-service-for-the-faithless-tees-1.webp",
    "products/no-service-for-the-faithless-tees-2.webp",
    "products/no-service-for-the-faithless-tees-3.png",
    "products/no-service-for-the-faithless-tees-4.webp",
    "products/no-service-for-the-faithless-tees-5.jpg",
    "products/no-service-for-the-faithless-tees-6.webp",
    "products/no-service-for-the-faithless-tees-7.webp",
    "products/no-service-for-the-faithless-tees-8.webp",
    "products/no-service-for-the-faithless-tees-9.webp",
    "products/no-service-for-the-faithless-tees-10.webp",
    "products/no-service-for-the-faithless-tees-11.png",
    "products/no-service-for-the-faithless-tees-12.webp"
    ],
  },
  {
    slug: "race-tee",
    id: "race-tee",
    name: "RACE TEE",
    category: "Tee",
    price: 54400,
    originalPrice: 68000,
    description: `RACE  GREEN & GREY TEE Remera oversize con mangas ranglan en color verde militar y gráfico frontal estilo racing con múltiples insignias, escudos y tipografías inspiradas en el mundo automotor. Estética vintage motorsport con un enfoque streetwear moderno. Pensada para la calle, el día a día o para destacar con una pieza gráfica fuerte y diferente. Disponible en verde con estampa multicolor de alto contraste. Material: Jersey 100% algodón peinado, suave, resistente y cómodo para uso diario Fit: Medio oversize, hombros caídos y cuerpo amplio Detalles: Estampa frontal full color de alta definición con múltiples parches estilo racing, logos y composición gráfica central, grifa lateral HYPESTYLE Cuello: Redondo con rib reforzado para mayor durabilidad

•
•
•
•`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "low",
    "M": "low",
    "L": "low",
    "XL": "low"
    },
    colors: [
      { label: "Default", value: "#111111", image: "products/race-tee-0.png" },
    ],
    images: [
    "products/race-tee-0.png",
    "products/race-tee-1.webp",
    "products/race-tee-2.png",
    "products/race-tee-3.png",
    "products/race-tee-4.webp",
    "products/race-tee-5.webp"
    ],
  },
  {
    slug: "pack-de-stickers-race",
    id: "pack-de-stickers-race",
    name: "PACK DE STICKERS - RACE",
    category: "Pack",
    price: 0,
    description: `PACK DE STICKERS - RACE Descubrí el pack de stickers exclusivo del drop RACE, un complemento ideal para personalizar y destacar tus objetos favoritos. Este pack se incluye de regalo con todas las compras del drop RACE, ofreciendo un valor añadido único para los fanáticos del estilo y la cultura urbana. Perfecto para usar en notebooks, celulares, skateboards y más. Dale vida a tu estilo con estos stickers originales y de alta calidad!`,
    careItems: CARE_APPAREL,
    fit: "Regular Fit",
    sizes: ["Única"],
    stock: {
    "Única": "ok"
    },
    colors: [
      { label: "Default", value: "#111111", image: "products/pack-de-stickers-race-0.png" },
    ],
    images: [
    "products/pack-de-stickers-race-0.png"
    ],
  },
  {
    slug: "sweatpant-camo",
    id: "sweatpant-camo",
    name: "SweatPant Camo",
    category: "Pantalón",
    price: 118000,
    description: `SWEATPANT CAMO Pantalón jogger de fit relajado confeccionado en rústico premium 100% algodón, con estampa camo full print y detalles que levantan toda la prenda. Cómodo, pesado y con buena estructura, pensado para usar solo o en conjunto con la campera a juego. Ideal para un look completo junto al Zip Hoodie Camo. Preventa: Se comienza a despachar a partir del 20 de abril. Reserva el tuyo antes de que se agote el stock.

• Fit relaxed, recto con caída amplia
• Rústico premium 100% algodón
• Estampa camo full print
• Estampa tipo puff print en alto relieve
• Cintura elastizada con cordón ajustable
• Bolsillos laterales funcionales
• Terminaciones premium y construcción resistente`,
    careItems: CARE_APPAREL,
    fit: "Jogger Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Camo", value: "#6b7c5c", image: "products/sweatpant-camo-0.png" },
    ],
    images: [
    "products/sweatpant-camo-0.png",
    "products/sweatpant-camo-1.png",
    "products/sweatpant-camo-2.png",
    "products/sweatpant-camo-3.png",
    "products/sweatpant-camo-4.png",
    "products/sweatpant-camo-5.png",
    "products/sweatpant-camo-6.png",
    "products/sweatpant-camo-7.jpg"
    ],
  },
  {
    slug: "zip-hoodie-camo",
    id: "zip-hoodie-camo",
    name: "Zip Hoodie Camo",
    category: "Hoodie",
    price: 128000,
    description: `ZIP HOODIE CAMO Campera zip-up de silueta boxy confeccionada en rústico premium 100% algodón, con estampa camo full print y una construcción pensada al detalle. Una pieza con peso, volumen y presencia, diseñada para ser protagonista dentro del outfit. Ideal para usar abierta o cerrada, sola o en conjunto con el pantalón a juego. Preventa: Se comienza a despachar a partir del 20 de abril. Reserva el tuyo antes de que se agote el stock.

• Fit boxy, ancho y de largo corto
• Rústico premium 100% algodón
• Estampa camo full print
• Estampa tipo puff print en alto relieve
• Cierres YKK reforzados
• Tiracierre personalizado
• Terminaciones premium y construcción resistente`,
    careItems: CARE_APPAREL,
    fit: "Boxy Oversized",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Camo", value: "#6b7c5c", image: "products/zip-hoodie-camo-0.png" },
    ],
    images: [
    "products/zip-hoodie-camo-0.png",
    "products/zip-hoodie-camo-1.png",
    "products/zip-hoodie-camo-2.png",
    "products/zip-hoodie-camo-3.png",
    "products/zip-hoodie-camo-4.png",
    "products/zip-hoodie-camo-5.png",
    "products/zip-hoodie-camo-6.png",
    "products/zip-hoodie-camo-7.png",
    "products/zip-hoodie-camo-8.png",
    "products/zip-hoodie-camo-9.jpg"
    ],
  },
  {
    slug: "camo-cap",
    id: "camo-cap",
    name: "Camo Cap",
    category: "Accesorio",
    price: 40000,
    description: `CAMO CAP Gorra de gabardina con estampa camo y bordado frontal en relieve, pensada para completar el set y levantar cualquier look. Una pieza sólida, cómoda y versátil, con presencia propia dentro del drop. Ideal para usar sola o junto al Zip Hoodie Camo y el Sweatpant Camo. Preventa: Se comienza a despachar a partir del 20 de abril. Reserva el tuyo antes de que se agote el stock.

• Confeccionada en gabardina resistente
• Estampa camo full print
• Bordado frontal en relieve
• Visera curva
• Calce cómodo y regulable
• Terminaciones premium`,
    careItems: CARE_ACCESSORY,
    fit: "Talle único",
    sizes: ["Única"],
    stock: {
    "Única": "ok"
    },
    colors: [
      { label: "Camo", value: "#6b7c5c", image: "products/camo-cap-0.png" },
    ],
    images: [
    "products/camo-cap-0.png",
    "products/camo-cap-1.png",
    "products/camo-cap-2.png"
    ],
  },
  {
    slug: "beanie-camo",
    id: "beanie-camo",
    name: "Beanie Camo",
    category: "Accesorio",
    price: 33000,
    description: `BEANIE CAMO Gorro tejido con estampa camo, pensado para sumar textura y completar el look del drop. Cómodo, abrigado y con una estética marcada, ideal para usar en invierno o como accesorio clave del outfit.

• Gorro tejido de calce cómodo
• Estampa camo
• Construcción suave y abrigada
• Terminaciones premium
• Ideal para completar el set Camo`,
    careItems: CARE_ACCESSORY,
    fit: "Talle único",
    sizes: ["Única"],
    stock: {
    "Única": "ok"
    },
    colors: [
      { label: "Camo", value: "#6b7c5c", image: "products/beanie-camo-0.png" },
    ],
    images: [
    "products/beanie-camo-0.png"
    ],
  },
  {
    slug: "camo-full-set-combo",
    id: "camo-full-set-combo",
    name: "CAMO FULL SET - COMBO",
    category: "Set",
    price: 246000,
    description: `CAMO FULL SET Combo completo del drop camo: incluye Zip Hoodie Camo + Sweatpant Camo + Camo Cap en un solo look. Una propuesta pensada para llevarte el conjunto completo, con la misma identidad, materiales premium y todos los detalles del drop. La campera y el pantalón están confeccionados en rústico premium 100% algodón con estampa camo full print, detalles en puff print y terminaciones de alta calidad. La campera suma cierres YKK reforzados y tiracierre personalizado. La gorra completa el set con confección en gabardina camo y bordado frontal en relieve. En este combo te llevás el outfit completo al valor del hoodie + sweatpant, con la gorra incluida de regalo. Pagás el set. Te llevás el look completo. Preventa: Se comienza a despachar a partir del 20 de abril. Reserva el tuyo antes de que se agote el stock.

• Incluye campera + pantalón + gorra
• Zip Hoodie de fit boxy en rústico premium 100% algodón
• Sweatpant relaxed fit en rústico premium 100% algodón
• Camo Cap de gabardina con bordado en relieve
• Estampa camo full print
• Detalles en puff print
• Cierres YKK reforzados
• Tiracierre personalizado
• Combo ideal para llevar el set completo del drop`,
    careItems: CARE_APPAREL,
    fit: "Boxy Oversized",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Camo", value: "#6b7c5c", image: "products/camo-full-set-combo-0.png" },
    ],
    images: [
    "products/camo-full-set-combo-0.png",
    "products/camo-full-set-combo-1.png",
    "products/camo-full-set-combo-2.png",
    "products/camo-full-set-combo-3.png",
    "products/camo-full-set-combo-4.png",
    "products/camo-full-set-combo-5.png",
    "products/camo-full-set-combo-6.png",
    "products/camo-full-set-combo-7.png",
    "products/camo-full-set-combo-8.png",
    "products/camo-full-set-combo-9.jpg",
    "products/camo-full-set-combo-10.jpg"
    ],
  },
  {
    slug: "zip-hoodie-pink",
    id: "zip-hoodie-pink",
    name: "Zip Hoodie Pink",
    category: "Hoodie",
    price: 135000,
    description: `ZIP HOODIE PINK Campera zip-up de silueta boxy confeccionada en rústico premium 100% algodón, intervenida con tachas metálicas y estampas gráficas que le dan una identidad fuerte y distintiva. Una pieza con peso, presencia y actitud, pensada para destacar dentro del outfit. Detalles Ideal para usar abierta o cerrada, sola o en conjunto con la parte inferior a juego. Preventa: se comienza a despachar a partir del 1 de mayo.Reservá la tuya antes de que se agote el stock. Meli mide 1.70 y esta usando talle M

• Fit boxy, ancho y de largo corto
• Rústico premium 100% algodón
• Color pink
• Tachas metálicas bombe aplicadas en capucha, mangas y bolsillo frontal
• Estampa frontal y gráfica oversize en manga
• Cierre reforzado
• Terminaciones premium y construcción resistente`,
    careItems: CARE_APPAREL,
    fit: "Boxy Oversized",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Pink", value: "#e88ea0", image: "products/zip-hoodie-pink-0.jpg" },
    ],
    images: [
    "products/zip-hoodie-pink-0.jpg",
    "products/zip-hoodie-pink-1.jpg",
    "products/zip-hoodie-pink-2.jpg",
    "products/zip-hoodie-pink-3.jpg",
    "products/zip-hoodie-pink-4.jpg",
    "products/zip-hoodie-pink-5.jpg",
    "products/zip-hoodie-pink-6.jpg",
    "products/zip-hoodie-pink-7.jpg",
    "products/zip-hoodie-pink-8.jpg",
    "products/zip-hoodie-pink-9.jpg",
    "products/zip-hoodie-pink-10.png",
    "products/zip-hoodie-pink-11.jpg"
    ],
  },
  {
    slug: "sweatpant-pink",
    id: "sweatpant-pink",
    name: "SweatPant Pink",
    category: "Pantalón",
    price: 125000,
    description: `SWEATPANT PINK Pantalón relaxed de silueta amplia confeccionado en rústico premium 100% algodón. Una pieza cómoda, pesada y con presencia, intervenida con estampas que le dan identidad y hacen que el conjunto no pase desapercibido. Detalles Ideal para usar solo o en conjunto con el Zip Hoodie Pink. Preventa: se comienza a despachar a partir del 1 de mayo.Reservá el tuyo antes de que se agote el stock. Meli mide 1,70 y usa talle S

• Fit relaxed, recto y amplio
• Rústico premium 100% algodón
• Color pink
• Cintura elastizada
• Bolsillos laterales funcionales
• Estampa frontal y gráfica oversize
• Terminaciones premium
• Construcción resistente`,
    careItems: CARE_APPAREL,
    fit: "Jogger Fit",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Pink", value: "#e88ea0", image: "products/sweatpant-pink-0.jpg" },
    ],
    images: [
    "products/sweatpant-pink-0.jpg",
    "products/sweatpant-pink-1.jpg",
    "products/sweatpant-pink-2.jpg",
    "products/sweatpant-pink-3.jpg",
    "products/sweatpant-pink-4.jpg",
    "products/sweatpant-pink-5.jpg",
    "products/sweatpant-pink-6.png",
    "products/sweatpant-pink-7.png",
    "products/sweatpant-pink-8.jpg"
    ],
  },
  {
    slug: "hoodie-pink",
    id: "hoodie-pink",
    name: "Hoodie Pink",
    category: "Hoodie",
    price: 125000,
    description: `HOODIE PINK Hoodie de silueta boxy confeccionado en rústico premium 100% algodón, con una estructura firme, volumen y presencia. Una pieza cómoda pero con carácter, pensada para destacar sola o completar el conjunto con el sweatpant a juego. Detalles Ideal para usar solo o en conjunto con el Sweatpant Pink. Preventa: se comienza a despachar a partir del 1 de mayo.Reservá el tuyo antes de que se agote el stock.

• Fit boxy, ancho y de largo corto
• Rústico premium 100% algodón
• Color pink
• Capucha amplia
• Bolsillo canguro frontal
• Estampa frontal de alto impacto
• Terminaciones premium y construcción resistente`,
    careItems: CARE_APPAREL,
    fit: "Boxy Oversized",
    sizes: ["S", "M", "L", "XL"],
    stock: {
    "S": "ok",
    "M": "ok",
    "L": "ok",
    "XL": "ok"
    },
    colors: [
      { label: "Pink", value: "#e88ea0", image: "products/hoodie-pink-0.png" },
    ],
    images: [
    "products/hoodie-pink-0.png",
    "products/hoodie-pink-1.png",
    "products/hoodie-pink-2.jpg",
    "products/hoodie-pink-3.jpg"
    ],
  },
];

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find(p => p.slug === slug);
}

export function getRelated(currentSlug: string, count = 4): Product[] {
  const others = PRODUCTS.filter(p => p.slug !== currentSlug);
  return [...others].sort(() => Math.random() - 0.5).slice(0, count);
}