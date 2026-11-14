"use client";

import { type FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 pt-4 md:pt-12" aria-hidden>
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}

/** Posle prijave samo putanje unutar aplikacije (ne spoljni linkovi iz `?next=`). */
function safeNext(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}

/** Sirova poruka sa servera → jasna rečenica za korisnika. */
function loginErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : "";
  if (/pogresno|pogrešno|korisnicko|korisničko|sifra|šifra/i.test(raw)) return "Pogrešno korisničko ime ili šifra.";
  if (/network|fetch|failed to|connection/i.test(raw)) return "Nema veze sa serverom. Proveri internet i pokušaj ponovo.";
  return "Prijava trenutno nije uspela. Pokušaj ponovo.";
}

function LoginContent() {
  const { login, status } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams?.get("next"));

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "authenticated") router.replace(next);
  }, [next, router, status]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!username.trim() || !password) {
      setError(!username.trim() ? "Unesi korisničko ime." : "Unesi šifru.");
      (!username.trim() ? usernameRef.current : passwordRef.current)?.focus();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password);
      router.replace(next);
    } catch (caught) {
      setError(loginErrorMessage(caught));
      // Šifra se briše i fokus ide na nju: najčešća greška je pogrešna šifra.
      setPassword("");
      requestAnimationFrame(() => (username.trim() ? passwordRef.current : usernameRef.current)?.focus());
    } finally {
      setSubmitting(false);
    }
  };

  const errorId = "login-greska";

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 pt-4 md:pt-12">
      <header className="flex flex-col gap-1">
        {/* Na telefonu je naslov „Prijava“ već u headeru aplikacije. */}
        <h1 className="sr-only md:not-sr-only md:text-2xl md:font-semibold md:tracking-tight md:text-text">Prijava</h1>
        <p className="text-sm text-text-muted">Pristup je samo za nalog Kod Majstora.</p>
      </header>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="username" className="text-[13px] font-medium text-text">
            Korisničko ime
          </label>
          <Input
            ref={usernameRef}
            id="username"
            name="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !password) {
                event.preventDefault();
                passwordRef.current?.focus();
              }
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-[13px] font-medium text-text">
            Šifra
          </label>
          <div className="relative">
            <Input
              ref={passwordRef}
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              required
              className="pr-12"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
            <IconButton
              aria-label={showPassword ? "Sakrij šifru" : "Prikaži šifru"}
              aria-pressed={showPassword}
              aria-controls="password"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute top-1/2 right-0.5 -translate-y-1/2 text-text-muted"
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </IconButton>
          </div>
        </div>

        <p
          id={errorId}
          role="alert"
          className={cn("flex items-start gap-2 text-[13px] leading-5 text-danger", !error && "sr-only")}
        >
          {error ? (
            <>
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </>
          ) : null}
        </p>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {submitting ? "Prijavljivanje…" : "Prijavi se"}
        </Button>
      </form>
    </div>
  );
}
