import type { Product } from "@/racenroam/context/CartContext";
import pitLaneSnapbackImg from "@/racenroam/assets/pit-lane-snapback.jpg";
import teeLightGrey from "@/racenroam/assets/tee-light-grey.png";
import teeGrey from "@/racenroam/assets/tee-grey.png";
import teeOlive from "@/racenroam/assets/tee-olive.png";
import teeWhite from "@/racenroam/assets/tee-white.png";
import teeMint from "@/racenroam/assets/tee-mint.png";

const TEE_SIZES = ["S", "M", "L", "XL", "XXL"];

export const PRODUCTS: Product[] = [
  {
    id: "logo-tee-light-grey",
    name: "RaceNRoam Tee — Light Grey",
    price: 28,
    category: "Apparel",
    badge: "NEW",
    icon: "shirt",
    sizes: TEE_SIZES,
    image: teeLightGrey,
  },
  {
    id: "logo-tee-grey",
    name: "RaceNRoam Tee — Grey",
    price: 28,
    category: "Apparel",
    icon: "shirt",
    sizes: TEE_SIZES,
    image: teeGrey,
  },
  {
    id: "logo-tee-olive",
    name: "RaceNRoam Tee — Olive",
    price: 28,
    category: "Apparel",
    icon: "shirt",
    sizes: TEE_SIZES,
    image: teeOlive,
  },
  {
    id: "logo-tee-white",
    name: "RaceNRoam Tee — White",
    price: 28,
    category: "Apparel",
    icon: "shirt",
    sizes: TEE_SIZES,
    image: teeWhite,
  },
  {
    id: "logo-tee-mint",
    name: "RaceNRoam Tee — Mint",
    price: 28,
    category: "Apparel",
    icon: "shirt",
    sizes: TEE_SIZES,
    image: teeMint,
  },
  {
    id: "pit-lane-snapback",
    name: "Pit Lane Snapback",
    price: 25,
    category: "Headwear",
    badge: "BACK IN STOCK",
    icon: "hat",
    image: pitLaneSnapbackImg,
  },
];
