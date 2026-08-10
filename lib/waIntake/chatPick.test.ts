import { describe, expect, it } from "vitest";
import { pickChatIdByName } from "./chatPick";

describe("pickChatIdByName", () => {
  it("exact match (case-insensitive, trim) ima prednost nad fuzzy", () => {
    const chats = [
      { id: "fuzzy", name: "Cale Junior" },
      { id: "exact", name: "  cale " },
    ];
    expect(pickChatIdByName(chats, "Cale")).toBe("exact");
  });

  it("fuzzy hvata dijakritike i cirilicu (foldName)", () => {
    expect(pickChatIdByName([{ id: "1", name: "Čale" }], "Cale")).toBe("1");
    expect(pickChatIdByName([{ id: "2", name: "Цале" }], "Cale")).toBe("2");
  });

  it("fuzzy ignorise emoji/interpunkciju u imenu chata", () => {
    expect(pickChatIdByName([{ id: "1", name: "Omer Aks \u{1F9FE}" }], "Omer Aks")).toBe("1");
  });

  it("ispod praga vraca null", () => {
    const chats = [
      { id: "1", name: "Marko Petrovic" },
      { id: "2", name: "Grupa Posao" },
    ];
    expect(pickChatIdByName(chats, "Omer Aks")).toBeNull();
  });

  it("prazna lista, prazno ime i kandidati bez id-a vracaju null", () => {
    expect(pickChatIdByName([], "Cale")).toBeNull();
    expect(pickChatIdByName([{ id: "1", name: "Cale" }], "   ")).toBeNull();
    expect(pickChatIdByName([{ id: "", name: "Cale" }], "Cale")).toBeNull();
  });
});
