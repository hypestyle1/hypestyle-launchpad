export interface LookProduct {
  category: string;
  name: string;
  price: number;
  image: string;
  slug: string;
}

export interface Look {
  id: string;
  title: string;
  image: string;
  products: LookProduct[];
}

export const LOOKS: Look[] = [
  {
    id: "look-halfzip-polo-navy",
    title: "Half Zip Polo Navy",
    image: "stl-look-halfzip-polo-navy.png",
    products: [
      { category: "Polo", name: "Half Zip Polo Navy", price: 0, image: "stl-look-halfzip-polo-navy.png", slug: "half-zip-polo-navy" },
    ],
  },
  {
    id: "look-halfzip-polo",
    title: "Half Zip Polo Grey",
    image: "stl-look-halfzip-polo-grey.png",
    products: [
      { category: "Polo", name: "Half Zip Polo Grey", price: 0, image: "stl-look-halfzip-polo-grey.png", slug: "half-zip-polo-grey" },
    ],
  },
  {
    id: "look-melange",
    title: "Melange Tracksuit",
    image: "stl-look-melange-tracksuit.png",
    products: [
      { category: "Hoodie", name: "Melange Hoodie", price: 0, image: "stl-look-melange-tracksuit.png", slug: "hoodie-melange" },
      { category: "Pantalón", name: "Melange SweatPant", price: 0, image: "stl-look-melange-tracksuit.png", slug: "sweatpant-melange" },
    ],
  },
  {
    id: "look-pink",
    title: "Pink Set",
    image: "stl-look-pink-set.png",
    products: [
      { category: "Hoodie", name: "Zip Hoodie Pink", price: 135000, image: "stl-look-pink-set.png", slug: "zip-hoodie-pink" },
      { category: "Pantalón", name: "SweatPant Pink", price: 125000, image: "stl-look-pink-set.png", slug: "sweatpant-pink" },
    ],
  },
  {
    id: "look-01",
    title: "Camo Set",
    image: "stl-look-camo-front.png",
    products: [
      { category: "Hoodie", name: "Zip Hoodie Camo", price: 128000, image: "stl-look-camo-front.png", slug: "zip-hoodie-camo" },
      { category: "Accesorio", name: "Camo Cap", price: 40000, image: "product-camo-cap-orange.webp", slug: "camo-cap" },
    ],
  },
];
