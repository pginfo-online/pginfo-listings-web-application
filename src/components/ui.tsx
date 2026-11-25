import Link from "next/link";
import {
  AlertCircle,
  BedDouble,
  Building2,
  House,
  MapPin,
  Search,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  ApiError,
  describe,
  originMismatchMessage,
  suspendedAccountMessage,
} from "@/src/api/errors";
import type { Category } from "@/src/domain/search";
import { Copy } from "./preferences";

export const categoryOptions = [
  { value: "all", name: "All stays", hi: "सभी आवास", icon: House },
  {
    value: "pg",
    name: "PG & Co-living",
    hi: "पीजी और को-लिविंग",
    icon: BedDouble,
  },
  { value: "residential_rental", name: "Flats", hi: "फ़्लैट", icon: Building2 },
  { value: "commercial", name: "Commercial", hi: "व्यावसायिक", icon: Building2 },
] as const;

export function categoryName(value: Category | null | undefined) {
  return (
    categoryOptions.find((option) => option.value === value) ??
    categoryOptions[0]
  );
}

export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-panel">
      <span className="section-symbol">
        <Search size={21} />
      </span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Failure({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  if (error instanceof ApiError && error.status === 401) {
    return (
      <div className="inline-status" role="status">
        <UserAccess />
        <div>
          <strong>Sign in to continue</strong>
          <p>Your session may have ended.</p>
        </div>
        <Link className="button button-outline" href="/sign-in">
          Sign in
        </Link>
      </div>
    );
  }
  return (
    <div className="inline-status error-panel" role="alert">
      <AlertCircle size={19} />
      <div>
        <strong>
          {error instanceof ApiError && error.status === 403 ? (
            <Copy
              hi={
                error.message === originMismatchMessage
                  ? "ऐप को उसके सही पते से खोलें और फिर कोशिश करें।"
                  : error.message === suspendedAccountMessage
                    ? "आपका खाता निलंबित है। कृपया सहायता टीम से संपर्क करें।"
                    : "आपको यह कार्रवाई करने की अनुमति नहीं है।"
              }
            >
              {describe(error)}
            </Copy>
          ) : (
            describe(error)
          )}
        </strong>
        {error instanceof ApiError && error.requestId && (
          <p>Reference {error.requestId}</p>
        )}
      </div>
      {retry && (
        <button className="button button-outline" type="button" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}

function UserAccess() {
  return <AlertCircle size={19} />;
}

export function Skeletons({ count = 4 }: { count?: number }) {
  return (
    <div
      className="card-grid"
      aria-busy="true"
      aria-label="Loading properties"
      role="status"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton skeleton-card" />
      ))}
    </div>
  );
}

export function Location({
  area,
  city,
}: {
  area?: string | null;
  city?: string | null;
}) {
  const location = [area, city].filter(Boolean).join(", ");
  return location ? (
    <span className="location">
      <MapPin size={15} />
      {location}
    </span>
  ) : null;
}
