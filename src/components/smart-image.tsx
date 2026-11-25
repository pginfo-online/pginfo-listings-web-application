"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

export function SmartImage({
  src,
  alt,
  sizes,
  priority = false,
  fallback,
}: {
  src?: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState<string>();
  if (!src || src === failed)
    return (
      <span
        className="image-fallback"
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
      >
        {fallback}
      </span>
    );
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      preload={priority}
      onError={() => setFailed(src)}
    />
  );
}
