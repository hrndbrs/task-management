import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { login } from "@/app/actions/auth";
import { LoginForm } from "@/app/login/login-form";

vi.mock("@/app/actions/auth", () => ({ login: vi.fn() }));

async function submit(email = "ada@example.com", password = "secret") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginForm", () => {
  it("submits the credentials and the return path", async () => {
    vi.mocked(login).mockResolvedValue(undefined);
    render(<LoginForm from="/tasks/3" />);

    await submit();

    const formData = vi.mocked(login).mock.calls[0][1];
    expect(Object.fromEntries(formData)).toEqual({
      from: "/tasks/3",
      email: "ada@example.com",
      password: "secret",
    });
  });

  it("shows field errors next to the fields and keeps the email", async () => {
    vi.mocked(login).mockResolvedValue({
      email: "ada@example.com",
      message: "The password field is required.",
      errors: { password: ["The password field is required."] },
    });
    render(<LoginForm />);

    await submit();

    const password = screen.getByLabelText("Password");
    expect(await screen.findByText("The password field is required.")).toHaveAttribute("id", "password-error");
    expect(password).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a general error as an alert", async () => {
    vi.mocked(login).mockResolvedValue({ message: "The provided credentials are incorrect." });
    render(<LoginForm />);

    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("The provided credentials are incorrect.");
  });

  it("disables the button while signing in", async () => {
    vi.mocked(login).mockReturnValue(new Promise(() => {}));
    render(<LoginForm />);

    await submit();

    expect(await screen.findByRole("button", { name: "Signing in…" })).toBeDisabled();
  });
});
