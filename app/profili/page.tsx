"use client";

import { FormEvent, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth-client";
import { toast } from "sonner";

type UserRow = {
  id: string;
  username: string;
  role: string;
  createdAt: number;
  createdBy?: string;
};

export default function ProfilesPage() {
  return (
    <RequireAuth adminOnly>
      <ProfilesContent />
    </RequireAuth>
  );
}

function ProfilesContent() {
  const { token, createProfile } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const migrate = useConvexMutation<{ token: string }, { productsUpdated: number; ordersUpdated: number }>(
    "maintenance:backfillUserIds",
  );
  const users = useConvexQuery<UserRow[]>("auth:listUsers", { token: token as string });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await createProfile(username, password);
      setUsername("");
      setPassword("");
    } catch {
      // greska je vec prikazana kroz toast
    } finally {
      setSubmitting(false);
    }
  };

  const handleMigration = async () => {
    if (!token) return;
    setMigrating(true);
    try {
      const result = await migrate({ token });
      toast.success(
        `Migracija zavrsena. Proizvodi: +${result?.productsUpdated ?? 0}, narudzbine: +${result?.ordersUpdated ?? 0}.`,
      );
    } catch (error) {
      console.error(error);
      toast.error("Migracija nije uspela.");
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Profili</h1>
        <p className="text-sm text-slate-600">
          Glavni admin moze da otvara nove naloge. Svi nalozi imaju iste funkcije, osim dodavanja profila.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Novi profil</CardTitle>
            <CardDescription>Autorizuj kolegu. Koristi jedinstveno korisnicko ime i sifru.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="username">Korisnicko ime</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="off"
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
                  autoComplete="new-password"
                  required
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Kreiranje..." : "Dodaj profil"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Postojeci nalozi</CardTitle>
            <CardDescription>Aktivni profili koji mogu da koriste evidenciju.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Korisnik</TableHead>
                  <TableHead>Uloga</TableHead>
                  <TableHead>Napravljen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(users ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-slate-500">
                      Nema profila.
                    </TableCell>
                  </TableRow>
                ) : (
                  (users ?? []).map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-slate-800">{user.username}</TableCell>
                      <TableCell className="uppercase text-slate-600">{user.role}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {user.createdAt ? formatDate(user.createdAt) : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Migracija starih podataka</CardTitle>
          <CardDescription>
            Stari proizvodi i narudzbine bez userId polja bice vezani za admin nalog. Pokreni jednom posle apdejta.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={handleMigration} disabled={migrating}>
            {migrating ? "Migriram..." : "Migriraj stare zapise"}
          </Button>
          <p className="text-sm text-slate-600">
            Ova akcija ne dodaje nove podatke, samo dopunjava userId na postojecim proizvodima i narudzbinama.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
