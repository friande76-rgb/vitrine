import { describe, expect, it } from "vitest";
import { minutesUntil, windowStart } from "../src/lib/rate-limit";

describe("windowStart", () => {
  it("agrupa instantes da mesma hora na mesma janela", () => {
    const a = windowStart(new Date("2026-09-26T14:03:00Z"), 60);
    const b = windowStart(new Date("2026-09-26T14:59:59Z"), 60);
    expect(a.toISOString()).toBe(b.toISOString());
    expect(a.toISOString()).toBe("2026-09-26T14:00:00.000Z");
  });

  it("separa horas diferentes", () => {
    const a = windowStart(new Date("2026-09-26T14:59:59Z"), 60);
    const b = windowStart(new Date("2026-09-26T15:00:00Z"), 60);
    expect(a.toISOString()).not.toBe(b.toISOString());
  });

  it("funciona com janelas de 15 minutos", () => {
    expect(windowStart(new Date("2026-09-26T14:44:00Z"), 15).toISOString()).toBe("2026-09-26T14:30:00.000Z");
  });
});

describe("minutesUntil", () => {
  it("nunca devolve menos de 1 minuto", () => {
    expect(minutesUntil(new Date(Date.now() - 10_000))).toBe(1);
  });

  it("arredonda para cima", () => {
    expect(minutesUntil(new Date(Date.now() + 61_000))).toBe(2);
  });
});
