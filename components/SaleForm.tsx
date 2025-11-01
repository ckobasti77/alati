"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import type { Product } from "@/types/sale";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const saleSchema = z.object({
  productId: z.string().optional(),
  title: z.string().min(1, "Naslov je obavezan."),
  kolicina: z.number().min(1, "Bar jedna stavka."),
  nabavnaCena: z.number().min(0, "Nabavna cena mora biti >= 0."),
  prodajnaCena: z.number().min(0, "Prodajna cena mora biti >= 0."),
  napomena: z.string().optional(),
});

type SaleFormValues = z.infer<typeof saleSchema>;

interface SaleFormProps {
  onCreated?: () => void;
}

const baseDefaults: SaleFormValues = {
  productId: undefined,
  title: "",
  kolicina: 1,
  nabavnaCena: 0,
  prodajnaCena: 0,
  napomena: "",
};

export function SaleForm({ onCreated }: SaleFormProps) {
  const products = useConvexQuery<Product[]>("products:list", {});
  const createSale = useConvexMutation("sales:create");
  const [search, setSearch] = useState("");

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: baseDefaults,
    mode: "onBlur",
  });

  const selectedProductId = useWatch({ control: form.control, name: "productId" });

  useEffect(() => {
    if (!selectedProductId) return;
    const product = (products ?? []).find((item) => item._id === selectedProductId);
    if (!product) return;

    form.setValue("title", product.name, { shouldDirty: true });
    form.setValue("nabavnaCena", product.nabavnaCena, { shouldDirty: true });
    form.setValue("prodajnaCena", product.prodajnaCena, { shouldDirty: true });
  }, [selectedProductId, products, form]);

  const handleSubmit = async (values: SaleFormValues) => {
    try {
      await createSale({
        productId: values.productId || undefined,
        title: values.title.trim(),
        kolicina: values.kolicina,
        nabavnaCena: values.nabavnaCena,
        prodajnaCena: values.prodajnaCena,
        napomena: values.napomena?.trim() || undefined,
      });
      toast.success("Prodaja je dodata.");
      form.reset(baseDefaults);
      onCreated?.();
    } catch (error) {
      console.error(error);
      toast.error("Nije moguce sacuvati prodaju.");
    }
  };

  const productOptions = useMemo(() => {
    const list = products ?? [];
    if (!search.trim()) return list;
    const needle = search.toLowerCase();
    return list.filter((product) => product.name.toLowerCase().includes(needle));
  }, [products, search]);

  return (
    <Form form={form} onSubmit={handleSubmit} className="space-y-4">
      <FormField
        name="productId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Proizvod (opciono)</FormLabel>
            <Select
              value={field.value ?? "manual"}
              onValueChange={(value) => field.onChange(value === "manual" ? undefined : value)}
              onOpenChange={(open) => {
                if (!open) setSearch("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Izaberi iz liste" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    autoFocus
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Pretrazi proizvod"
                    onKeyDown={(event) => event.stopPropagation()}
                  />
                </div>
                <SelectItem value="manual">Rucno unosim</SelectItem>
                {productOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-500">Nema rezultata</div>
                ) : (
                  productOptions.map((product) => (
                    <SelectItem key={product._id} value={product._id}>
                      {product.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      <FormField
        name="title"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>Naslov</FormLabel>
            <Input placeholder="Naziv prodaje" {...field} />
            <FormMessage>{fieldState.error?.message}</FormMessage>
          </FormItem>
        )}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          name="kolicina"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Kolicina</FormLabel>
              <Input
                type="number"
                min={1}
                value={field.value}
                onChange={(event) => field.onChange(value === "manual" ? undefined : value)(Number(event.target.value) || 0)}
              />
              <FormMessage>{fieldState.error?.message}</FormMessage>
            </FormItem>
          )}
        />
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
                onChange={(event) => field.onChange(value === "manual" ? undefined : value)(Number(event.target.value) || 0)}
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
                onChange={(event) => field.onChange(value === "manual" ? undefined : value)(Number(event.target.value) || 0)}
              />
              <FormMessage>{fieldState.error?.message}</FormMessage>
            </FormItem>
          )}
        />
      </div>

      <FormField
        name="napomena"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Napomena</FormLabel>
            <Input placeholder="Dodaj napomenu (opciono)" {...field} />
          </FormItem>
        )}
      />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => form.reset(baseDefaults)}>
          Ponisti
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Sacuvaj
        </Button>
      </div>
    </Form>
  );
}