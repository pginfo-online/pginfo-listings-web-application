"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Modal({
  title,
  description,
  trigger,
  children,
  wide = false,
  placement,
  open,
  onOpenChange,
  onCloseAutoFocus,
}: {
  title: string;
  description: string;
  trigger: ReactNode;
  children: ReactNode;
  wide?: boolean;
  placement?: "left" | "right";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          onCloseAutoFocus={onCloseAutoFocus}
          className={
            placement
              ? `dialog drawer drawer-${placement}`
              : wide
                ? "dialog dialog-wide"
                : "dialog"
          }
        >
          <div className="dialog-heading">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className="icon-btn" aria-label="Close">
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="muted">
            {description}
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const ModalClose = Dialog.Close;
