import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PreHomeAuth } from "@/components/PreHomeAuth";

vi.mock("@/integrations/lovable", () => ({ lovable: { auth: {} } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {} } }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Basera splash flow", () => {
  it("transitions to login at exactly 2.5 seconds, not before", () => {
    vi.useFakeTimers();
    const onStageChange = vi.fn();
    render(<PreHomeAuth stage="welcome" onStageChange={onStageChange} />);
    act(() => vi.advanceTimersByTime(2499));
    expect(onStageChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onStageChange).toHaveBeenCalledExactlyOnceWith("auth");
  });

  it("does not run a splash transition on the existing login screen", () => {
    vi.useFakeTimers();
    const onStageChange = vi.fn();
    render(<PreHomeAuth stage="auth" onStageChange={onStageChange} />);
    act(() => vi.advanceTimersByTime(5000));
    expect(onStageChange).not.toHaveBeenCalled();
  });

  it("cancels the transition when the splash is unmounted", () => {
    vi.useFakeTimers();
    const onStageChange = vi.fn();
    const { unmount } = render(<PreHomeAuth stage="welcome" onStageChange={onStageChange} />);
    unmount();
    act(() => vi.advanceTimersByTime(2500));
    expect(onStageChange).not.toHaveBeenCalled();
  });
});