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
    id: "look-hstars-grey",
    title: "HStars Grey Set",
    image: "stl-hstars-grey.png",
    products: [
      { category: "Hoodie", name: "Hoodie Grey HStars", price: 99990, image: "products/hoodie-grey-hstars-0.png", slug: "hoodie-grey-hstars" },
      { category: "Pantalón", name: "SweatPant Grey HStars", price: 94000, image: "https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/05/PANT.png", slug: "sweatpant-grey-hstars" },
    ],
  },
  {
    id: "look-pink-set",
    title: "Pink Set",
    image: "stl-pink-set.png",
    products: [
      { category: "Hoodie", name: "Zip Hoodie Pink", price: 120000, image: "https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/04/sin-titulo-2mesa-de-trabajo-1-jpg-8778ac83aab416038417766405540031-1024-1024.jpg", slug: "zip-hoodie-pink" },
      { category: "Pantalón", name: "SweatPant Pink", price: 125000, image: "https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/04/sin-titulo-2mesa-de-trabajo-3-jpg-cff6d51a6c991ca63617766409766712-1024-1024.jpg", slug: "sweatpant-pink" },
    ],
  },
  {
    id: "look-camo-set",
    title: "Camo Set",
    image: "stl-camo-set.jpeg",
    products: [
      { category: "Hoodie", name: "Zip Hoodie Camo", price: 128000, image: "stl-camo-set.jpeg", slug: "zip-hoodie-camo" },
      { category: "Accesorio", name: "Camo Cap", price: 40000, image: "product-camo-cap-orange.webp", slug: "camo-cap" },
    ],
  },
  {
    id: "look-realtree-pink",
    title: "Realtree Pink",
    image: "stl-realtree-pink.png",
    products: [
      { category: "Remera", name: "Mesh Realtree Pink Tee", price: 78000, image: "products/mesh-realtree-pink-tee-0.png", slug: "mesh-realtree-pink-tee" },
      { category: "Jort", name: "Jort Cargo Realtree Pink", price: 69000, image: "products/jort-cargo-realtree-pink-0.png", slug: "jort-cargo-realtree-pink" },
    ],
  },
  {
    id: "look-halfzip-polo-navy",
    title: "Half Zip Polo Navy",
    image: "stl-halfzip-navy.jpg",
    products: [
      { category: "Polo", name: "Half Zip Polo — Navy", price: 87000, image: "https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/05/MOCKUPS-HALF-ZIP-6-1.png", slug: "half-zip-polo-navy" },
    ],
  },
  {
    id: "look-halfzip-polo-melange",
    title: "Half Zip Polo Melange",
    image: "stl-halfzip-melange.jpg",
    products: [
      { category: "Polo", name: "Half Zip Polo — Melange", price: 87000, image: "https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/05/MOCKUPS-HALF-ZIP-2-1.png", slug: "half-zip-polo-melange" },
    ],
  },
  {
    id: "look-halfzip-polo-black",
    title: "Half Zip Polo Black",
    image: "stl-halfzip-black.jpg",
    products: [
      { category: "Polo", name: "Half Zip Polo — Black", price: 87000, image: "https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/05/MOCKUPS-HALF-ZIP-1.png", slug: "half-zip-polo-black" },
    ],
  },
  {
    id: "look-graphite-set",
    title: "Graphite Set",
    image: "stl-look-unknown.png",
    products: [
      { category: "Hoodie", name: "No Service For The Faithless - Hoodie", price: 52800, image: "https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/04/buzo-graphite_-nsftf-8db78fd41cab49461117737767457023-1024-1024.png", slug: "no-service-for-the-faithless-hoodie" },
      { category: "Short", name: "Lettering Graphite - Jort", price: 55200, image: "https://lightpink-rook-704850.hostingersite.com/wp-content/uploads/2026/04/mockup-jort-rustico-topo-frente-d1125bede86cfd3f8817612674654803-1024-1024.png", slug: "lettering-graphite-jort" },
    ],
  },
];
