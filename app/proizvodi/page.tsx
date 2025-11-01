"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/types/sale";

const productSchema = z.object({
  name: z.string().min(2, "Naziv je obavezan."),
  nabavnaCena: z.number().min(0),
  prodajnaCena: z.number().min(0),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function ProductsPage() {
  const products = useConvexQuery<Product[]>("products:list", {});
  const createProduct = useConvexMutation<ProductFormValues>("products:create");
  const removeProduct = useConvexMutation<{ id: string }>("products:remove");

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      nabavnaCena: 0,
      prodajnaCena: 0,
    },
    mode: "onBlur",
  });

  const handleCreate = async (values: ProductFormValues) => {
    try {
      await createProduct(values);
      toast.success("Proizvod je dodat.");
      form.reset({ name: "", nabavnaCena: 0, prodajnaCena: 0 });
    } catch (error) {
      console.error(error);
      toast.error("Dodavanje nije uspelo.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeProduct({ id });
      toast.success("Proizvod je obrisan.");
    } catch (error) {
      console.error(error);
      toast.error("Brisanje nije uspelo.");
    }
  };

  const items = useMemo(() => products ?? [], [products]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Proizvodi</h1>
          <p className="text-sm text-slate-500">Sacuvaj nabavnu i prodajnu cenu u evrima.</p>
        </div>
      </header>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Novi proizvod</CardTitle>
        </CardHeader>
        <CardContent>
          <Form form={form} onSubmit={handleCreate} className="space-y-4">
            <FormField
              name="name"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Naziv</FormLabel>
                  <Input placeholder="npr. USB kabl" {...field} />
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                name="nabavnaCena"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Nabavna cena (EUR)</FormLabel>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={field.value}
                      onChange={(event) => field.onChange(Number(event.target.value) || 0)}
                    />
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                name="prodajnaCena"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Prodajna cena (EUR)</FormLabel>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={field.value}
                      onChange={(event) => field.onChange(Number(event.target.value) || 0)}
                    />
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => form.reset()}>
                Ponisti
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Sacuvaj
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista proizvoda ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naziv</TableHead>
                <TableHead className="text-right">Nabavna (EUR)</TableHead>
                <TableHead className="text-right">Prodajna (EUR)</TableHead>
                <TableHead>Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                    Dodaj prvi proizvod.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((product) => (
                  <TableRow key={product._id}>
                    <TableCell className="font-medium text-slate-700">{product.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.nabavnaCena, "EUR")}</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.prodajnaCena, "EUR")}</TableCell>
                    <TableCell>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(product._id)}>
                        Obrisi
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}