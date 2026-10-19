import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PreHomeAuth } from "@/components/PreHomeAuth";

const actions = vi.hoisted(() => ({ google: vi.fn(), email: vi.fn(), reset: vi.fn() }));
vi.mock("@/lib/firebase-auth", async () => {
  const { z } = await import("zod");
  return {
    authenticationError: () => "Request failed",
    emailSchema: z.string().trim().email(),
    loginWithGoogle: actions.google,
    submitEmailAccount: actions.email,
    resetEmailPassword: actions.reset,
  };
});
vi.mock("@/integrations/lovable", () => ({ lovable: { auth: {} } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {} } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function openEmail() {
  render(<PreHomeAuth stage="auth" onStageChange={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Login with Email" }));
}
describe("Initial authentication rules", () => {
  it("closing sign-in skips login and moves forward to the location screen", () => {
    const onStageChange = vi.fn();
    render(<PreHomeAuth stage="auth" onStageChange={onStageChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Close sign-in" }));
    expect(onStageChange).toHaveBeenCalledExactlyOnceWith("location");
    expect(onStageChange).not.toHaveBeenCalledWith("welcome");
  });
  it("phone selection stays on method selection without invoking authentication", () => {
    render(<PreHomeAuth stage="auth" onStageChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Phone" }));
    expect(actions.google).not.toHaveBeenCalled();
    expect(actions.email).not.toHaveBeenCalled();
    expect(actions.reset).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Continue with Phone" })).toBeEnabled();
  });
  it("empty-email reset makes no Firebase request", () => {
    openEmail();
    fireEvent.click(screen.getByRole("button", { name: "Forgot Password?" }));
    expect(actions.reset).not.toHaveBeenCalled();
  });
  it("reset passes the entered address to Firebase", async () => {
    actions.reset.mockResolvedValueOnce(undefined);
    openEmail();
    fireEvent.change(screen.getByRole("textbox", { name: "Email Address" }), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Forgot Password?" }));
    await waitFor(() => expect(actions.reset).toHaveBeenCalledExactlyOnceWith("person@example.com"));
  });
  it("selecting sign-up submits signup=true and the optional name", async () => {
    actions.email.mockResolvedValueOnce({});
    openEmail();
    fireEvent.click(screen.getByRole("button", { name: "Don't have an account? Sign Up" }));
    fireEvent.change(screen.getByRole("textbox", { name: /Your name/ }), { target: { value: "Saurabh" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Email Address" }), { target: { value: "person@example.com" } });
    fireEvent.change(screen.getByLabelText("Password", { selector: "input" }), { target: { value: "valid-password" } });
    fireEvent.submit(screen.getByRole("button", { name: "Create Account / Sign Up" }).closest("form") as HTMLFormElement);
    await waitFor(() => expect(actions.email).toHaveBeenCalledExactlyOnceWith({ email: "person@example.com", password: "valid-password", name: "Saurabh" }, true));
  });
});