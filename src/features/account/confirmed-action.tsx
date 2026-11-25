"use client";

import { useMutation } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Modal, ModalClose } from "@/src/components/dialog";
import { useCopy } from "@/src/components/preferences";
import { ApiError } from "@/src/api/errors";
import { Failure } from "@/src/components/ui";

export function ConfirmedAction({
  title,
  description,
  trigger,
  action,
}: {
  title: string;
  description: string;
  trigger: ReactNode;
  action: () => Promise<unknown>;
}) {
  const t = useCopy();
  const mutation = useMutation({ mutationFn: action });
  const uncertain =
    mutation.error instanceof ApiError && mutation.error.uncertain;
  return (
    <Modal title={title} description={description} trigger={trigger}>
      {mutation.error && <Failure error={mutation.error} />}
      {uncertain && (
        <p className="muted">
          {t(
            "The action may have been applied. Refresh the current status before trying again.",
            "कार्रवाई हो चुकी हो सकती है। दोबारा कोशिश करने से पहले स्थिति अपडेट करें।",
          )}
        </p>
      )}
      {mutation.isSuccess && (
        <div className="inline-status success-panel" role="status">
          {t("Status updated", "स्थिति अपडेट हुई")}
        </div>
      )}
      <div className="dialog-actions">
        <ModalClose className="button button-outline">
          {mutation.isSuccess ? t("Done", "हो गया") : t("Close", "बंद करें")}
        </ModalClose>
        {!mutation.isSuccess && (
          <button
            className="button button-primary"
            type="button"
            disabled={mutation.isPending || uncertain}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? t("Updating…", "अपडेट हो रहा है…") : title}
          </button>
        )}
      </div>
    </Modal>
  );
}
