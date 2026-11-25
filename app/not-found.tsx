import Link from "next/link";
import { Empty } from "@/src/components/ui";

export default function NotFound() {
  return (
    <div className="shell page-section">
      <Empty
        title="Page unavailable"
        action={
          <Link className="button button-primary" href="/explore">
            Explore rentals
          </Link>
        }
      >
        The link may have changed or the listing may have been removed.
      </Empty>
    </div>
  );
}
