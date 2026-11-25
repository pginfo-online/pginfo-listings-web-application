import type { Metadata } from "next";
import { SignIn } from "@/src/features/account/sign-in";
import { safeReturnPath } from "@/src/domain/navigation";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  return (
    <section className="auth-shell">
      <SignIn next={safeReturnPath((await searchParams).next)} />
    </section>
  );
}
