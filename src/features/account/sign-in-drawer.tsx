"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import { Modal } from "@/src/components/dialog";
import { useCopy } from "@/src/components/preferences";

const SignIn = dynamic(() => import("./sign-in").then(({ SignIn }) => SignIn), {
  loading: () => (
    <div
      className="skeleton skeleton-heading"
      role="status"
      aria-label="Loading sign in"
    />
  ),
});

export function SignInDrawer({
  trigger,
  onComplete,
}: {
  trigger: ReactNode;
  onComplete?: () => void;
}) {
  const t = useCopy();
  const [open, setOpen] = useState(false);
  return (
    <Modal
      placement="right"
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={t("Sign in to PGinfo", "PGinfo में साइन इन करें")}
      description={t(
        "Manage your visits, rental requests and listings from one account.",
        "अपने विज़िट, किराये के अनुरोध और लिस्टिंग एक खाते से देखें।",
      )}
    >
      <SignIn
        onComplete={() => {
          setOpen(false);
          onComplete?.();
        }}
      />
    </Modal>
  );
}
