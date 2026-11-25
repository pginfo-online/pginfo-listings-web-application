import { z } from "zod";
import { envelope, paginated } from "./contracts";
import { uploadedPhoto } from "@/src/domain/listing-submission";
import { category, objectId } from "@/src/domain/search";
const text = z.string().nullish().catch(undefined);

const ownerListing = z.object({
  _id: objectId,
  title: text,
  name: text,
  city: text,
  area: text,
  status: text,
  category: category.exclude(["all"]).optional().catch(undefined),
});
export const ownerListings = paginated(ownerListing);
export const submittedListing = envelope(z.object({ property: ownerListing }));
export const uploadedListingPhotos = envelope(
  z.object({ images: z.array(uploadedPhoto).min(1) }),
);
