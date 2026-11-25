"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "@/src/api/client";
import { authStep, otpSent } from "@/src/api/contracts";
import { ApiError } from "@/src/api/errors";
import { Failure } from "@/src/components/ui";
import { useCopy } from "@/src/components/preferences";
import { notifySessionChanged, sessionKey, useSession } from "./session";

const phone = z.string().regex(/^[6-9]\d{9}$/);
const contactSchema = z.object({
  contact: z
    .string()
    .trim()
    .max(254)
    .refine(
      (value) =>
        phone.safeParse(value).success || z.email().safeParse(value).success,
      "Enter a valid Indian mobile number or email.",
    ),
});
const otpSchema = z.object({
  otp: z.string().regex(/^\d{4}$/, "Enter the four-digit code."),
});
const nameSchema = z.object({
  name: z.string().trim().min(2, "Enter at least two characters.").max(100),
});
export type SignInPhase =
  | { step: "contact" }
  | { step: "otp"; contact: string; channels: string[] }
  | { step: "name" };

export function SignIn({
  next,
  onComplete,
}: {
  next?: string;
  onComplete?: () => void;
}) {
  const t = useCopy();
  const [phase, setPhase] = useState<SignInPhase>({ step: "contact" });
  const client = useQueryClient();
  const router = useRouter();
  const session = useSession();
  const form = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase.step !== "contact") form.current?.querySelector("input")?.focus();
  }, [phase.step]);
  function finish() {
    if (onComplete) onComplete();
    else router.replace(next ?? "/more");
  }
  async function signedIn() {
    client.removeQueries({ queryKey: ["private"] });
    await client.invalidateQueries({ queryKey: sessionKey });
    notifySessionChanged();
    finish();
  }
  return (
    <div className={onComplete ? "auth-card auth-in-drawer" : "auth-card"}>
      <span className="section-symbol">
        {phase.step === "otp" ? (
          <KeyRound size={22} />
        ) : (
          <Smartphone size={22} />
        )}
      </span>
      <AuthHeading step={phase.step} standalone={!onComplete} />
      <div ref={form} className="auth-step" key={phase.step}>
        {session.data && phase.step === "contact" ? (
          <button
            type="button"
            className="button button-primary"
            onClick={finish}
          >
            {t("Continue", "जारी रखें")}
          </button>
        ) : phase.step === "contact" ? (
          <ContactForm
            advance={(contact, channels) =>
              setPhase({ step: "otp", contact, channels })
            }
          />
        ) : phase.step === "otp" ? (
          <CodeForm
            contact={phase.contact}
            channels={phase.channels}
            back={() => setPhase({ step: "contact" })}
            next={async (needsName) =>
              needsName ? setPhase({ step: "name" }) : signedIn()
            }
          />
        ) : (
          <NameForm
            next={signedIn}
            back={() => setPhase({ step: "contact" })}
          />
        )}
      </div>
    </div>
  );
}

function AuthHeading({
  step,
  standalone,
}: {
  step: SignInPhase["step"];
  standalone: boolean;
}) {
  const t = useCopy();
  const title =
    step === "name"
      ? t("Create your account", "अपना खाता बनाएँ")
      : step === "otp"
        ? t("Verify your code", "कोड सत्यापित करें")
        : t("Sign in to PGinfo", "PGinfo में साइन इन करें");
  if (standalone) return <h1>{title}</h1>;
  return step === "contact" ? null : <h3>{title}</h3>;
}

function ContactForm({
  advance,
}: {
  advance: (contact: string, channels: string[]) => void;
}) {
  const t = useCopy();
  const [error, setError] = useState<unknown>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
  });
  return (
    <form
      className="action-form"
      onSubmit={handleSubmit(async ({ contact }) => {
        setError(undefined);
        const type = phone.safeParse(contact).success ? "phone" : "email";
        try {
          const response = await api("auth/otp/send-unified", otpSent, {
            method: "POST",
            body: { contact, type, sendWhatsApp: false },
          });
          advance(contact, response.data.channels);
        } catch (error) {
          setError(error);
        }
      })}
    >
      <p className="muted">
        {t(
          "Use your mobile number or email to receive a one-time code.",
          "एक बार इस्तेमाल होने वाला कोड मोबाइल या ईमेल पर पाएँ।",
        )}
      </p>
      <label className="field">
        {t("Mobile number or email", "मोबाइल नंबर या ईमेल")}
        <input
          {...register("contact")}
          autoComplete="username"
          placeholder={t("10-digit number or email", "10 अंकों का नंबर या ईमेल")}
          maxLength={254}
          required
          aria-invalid={Boolean(errors.contact)}
          aria-describedby={errors.contact ? "contact-error" : undefined}
        />
      </label>
      {errors.contact && (
        <p id="contact-error" className="field-error">
          {errors.contact.message}
        </p>
      )}
      {error instanceof ApiError && <Failure error={error} />}
      <button
        type="submit"
        className="button button-primary"
        disabled={isSubmitting}
      >
        {isSubmitting
          ? t("Sending…", "भेजा जा रहा है…")
          : t("Send code", "कोड भेजें")}
      </button>
    </form>
  );
}

function CodeForm({
  contact,
  channels,
  back,
  next,
}: {
  contact: string;
  channels: string[];
  back: () => void;
  next: (needsName: boolean) => Promise<void>;
}) {
  const t = useCopy();
  const [error, setError] = useState<unknown>();
  const [resent, setResent] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [resendCooling, setResendCooling] = useState(false);
  const cooldown = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (cooldown.current) clearTimeout(cooldown.current);
    },
    [],
  );

  async function resend() {
    setError(undefined);
    setResendPending(true);
    try {
      const type = phone.safeParse(contact).success ? "phone" : "email";
      await api("auth/otp/send-unified", otpSent, {
        method: "POST",
        body: { contact, type, sendWhatsApp: false },
      });
      setResent(true);
      setResendCooling(true);
      cooldown.current = setTimeout(() => setResendCooling(false), 30_000);
    } catch (error) {
      setError(error);
      if (error instanceof ApiError && error.retryAfter) {
        setResendCooling(true);
        cooldown.current = setTimeout(
          () => setResendCooling(false),
          Math.min(error.retryAfter, 300) * 1000,
        );
      }
    } finally {
      setResendPending(false);
    }
  }
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof otpSchema>>({ resolver: zodResolver(otpSchema) });
  return (
    <form
      className="action-form"
      onSubmit={handleSubmit(async ({ otp }) => {
        setError(undefined);
        try {
          const response = await api("auth/otp/verify-unified", authStep, {
            method: "POST",
            body: { contact, otp },
          });
          await next(response.data.needsName);
        } catch (error) {
          setError(error);
        }
      })}
    >
      <p className="muted">
        {t("Code sent to", "कोड भेजा गया")} <strong>{contact}</strong>
        {channels.length
          ? ` (${channels.map((channel) => (channel === "sms" ? "SMS" : channel)).join(", ")})`
          : ""}
        .
      </p>
      <label className="field">
        {t("Four-digit code", "चार अंकों का कोड")}
        <input
          {...register("otp")}
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={4}
          required
          aria-invalid={Boolean(errors.otp)}
          aria-describedby={errors.otp ? "otp-error" : undefined}
        />
      </label>
      {errors.otp && (
        <p id="otp-error" className="field-error">
          {errors.otp.message}
        </p>
      )}
      {error instanceof ApiError && <Failure error={error} />}
      <button
        className="button button-primary"
        disabled={isSubmitting || resendPending}
      >
        {isSubmitting
          ? t("Verifying…", "सत्यापन हो रहा है…")
          : t("Verify code", "कोड सत्यापित करें")}
      </button>
      <div className="auth-otp-actions">
        <button
          type="button"
          className="text-button"
          disabled={isSubmitting || resendPending}
          onClick={back}
        >
          {t("Change contact", "संपर्क बदलें")}
        </button>
        <button
          type="button"
          className="text-button"
          disabled={isSubmitting || resendPending || resendCooling}
          onClick={() => void resend()}
        >
          {resendPending
            ? t("Sending…", "भेजा जा रहा है…")
            : t("Resend code", "कोड फिर भेजें")}
        </button>
      </div>
      {resent && (
        <p className="muted" role="status">
          {t("A new code has been sent.", "नया कोड भेज दिया गया है।")}
        </p>
      )}
    </form>
  );
}

function NameForm({
  next,
  back,
}: {
  next: () => Promise<void>;
  back: () => void;
}) {
  const t = useCopy();
  const [error, setError] = useState<unknown>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof nameSchema>>({
    resolver: zodResolver(nameSchema),
  });
  return (
    <form
      className="action-form"
      onSubmit={handleSubmit(async ({ name }) => {
        setError(undefined);
        try {
          await api("auth/register-complete", authStep, {
            method: "POST",
            body: { name },
          });
          await next();
        } catch (error) {
          setError(error);
        }
      })}
    >
      <label className="field">
        {t("Your name", "आपका नाम")}
        <input
          {...register("name")}
          autoComplete="name"
          maxLength={100}
          required
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
      </label>
      {errors.name && (
        <p id="name-error" className="field-error">
          {errors.name.message}
        </p>
      )}
      {error instanceof ApiError && <Failure error={error} />}
      <button className="button button-primary" disabled={isSubmitting}>
        {isSubmitting
          ? t("Creating account…", "खाता बन रहा है…")
          : t("Create account", "खाता बनाएँ")}
      </button>
      <button
        type="button"
        className="text-button"
        disabled={isSubmitting}
        onClick={back}
      >
        {t("Start again", "फिर से शुरू करें")}
      </button>
    </form>
  );
}
