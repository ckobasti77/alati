import { describe, expect, it } from "vitest";
import { MORE_LINKS, PRIMARY_NAV, getRouteMeta, isNavActive, visibleLinks } from "./nav";

describe("nav", () => {
  it("naslovi glavnih stranica imaju dijakritiku", () => {
    expect(getRouteMeta("/narudzbine").title).toBe("Narudžbine");
    expect(getRouteMeta("/obracun").title).toBe("Obračun");
    expect(getRouteMeta("/").title).toBe("Kontrolna tabla");
  });

  it("detalji i podstrane imaju nazad na roditelja", () => {
    expect(getRouteMeta("/narudzbine/k57abc123")).toEqual({ title: "Narudžbina", backHref: "/narudzbine", tab: "narudzbine" });
    expect(getRouteMeta("/proizvodi/k57abc123").backHref).toBe("/proizvodi");
    expect(getRouteMeta("/narudzbine/uvoz")).toMatchObject({ title: "Uvoz priznanica", backHref: "/narudzbine", tab: "vise" });
    expect(getRouteMeta("/narudzbine/pare").title).toBe("Legle pare");
    expect(getRouteMeta("/narudzbine/").backHref).toBeNull();
  });

  it("Obračun i Objave aktiviraju tab Više", () => {
    expect(getRouteMeta("/obracun").tab).toBe("vise");
    expect(getRouteMeta("/objave").tab).toBe("vise");
  });

  it("aktivna pill stavka", () => {
    expect(isNavActive("/", "/")).toBe(true);
    expect(isNavActive("/", "/narudzbine")).toBe(false);
    expect(isNavActive("/narudzbine", "/narudzbine/abc")).toBe(true);
    expect(isNavActive("/narudzbine", "/narudzbinex")).toBe(false);
  });

  it("Objave vidi samo admin", () => {
    expect(visibleLinks(PRIMARY_NAV, false).map((link) => link.href)).not.toContain("/objave");
    expect(visibleLinks(MORE_LINKS, true).map((link) => link.href)).toContain("/objave");
  });
});
