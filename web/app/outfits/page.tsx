import { redirect } from "next/navigation";

export default function OutfitsRedirect() {
  redirect("/wardrobe?tab=outfits");
}
