"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-client";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="py-10 text-center text-sm text-slate-500">
          Priprema forme za prijavu...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const { login, status } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams?.get("next") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(next || "/");
    }
  }, [next, router, status]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(username, password);
      router.replace(next || "/");
    } catch {
      // error je vec prikazan kroz toast
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Prijavljivanje</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Unesi kredencijale</CardTitle>
          <CardDescription>Svaki nalog ima svoj panel sa proizvodima i narudzbinama.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username">Korisnicko ime</Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="npr. kodmajstora"
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Sifra</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Prijavljivanje..." : "Udji u panel"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
