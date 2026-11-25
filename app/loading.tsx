import { Skeletons } from "@/src/components/ui";

export default function Loading() {
  return (
    <div className="shell page-section">
      <div className="skeleton skeleton-heading" />
      <Skeletons />
    </div>
  );
}
