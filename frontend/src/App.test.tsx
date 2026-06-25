import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the real authentication flow first", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /finance couple/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cadastro/i })).toBeInTheDocument();
  });
});
