import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LoginClient } from "@/app/login/LoginClient";
import SignupPage from "@/app/signup/page";
import { requestEmailOtp } from "@/lib/actions/emailOtp";
import { signUp } from "@/lib/actions/signUp";
import { signIn } from "next-auth/react";
const push = jest.fn(),
  refresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => new URLSearchParams("callbackUrl=%2Fmerchant"),
}));
jest.mock("next-auth/react", () => ({ signIn: jest.fn() }));
jest.mock("@/lib/actions/emailOtp", () => ({
  requestEmailOtp: jest.fn(),
}));
jest.mock("@/lib/actions/signUp", () => ({ signUp: jest.fn() }));
const challenge = {
  success: true as const,
  challengeId: "12345678-1234-1234-1234-123456789abc" as const,
  expiresAt: new Date(Date.now() + 600000).toISOString(),
  resendAfter: 60,
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(requestEmailOtp).mockResolvedValue(challenge);
  jest.mocked(signIn).mockResolvedValue({
    error: null,
    status: 200,
    ok: true,
    url: "/dashboard",
  });
});
test("login uses the shared landing-page style and supports password fallback", () => {
  const { container } = render(<LoginClient />);
  expect(container.querySelector(".auth-page")).toBeInTheDocument();
  expect(screen.getByLabelText("Email address")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Password" }));
  expect(screen.getByLabelText("Email or phone number")).toBeInTheDocument();
  expect(
    screen.getByLabelText("Password", { selector: "input" }),
  ).toHaveAttribute("type", "password");
});
test("OTP login sends a challenge, then uses the email provider with the internal callback", async () => {
  render(<LoginClient />);
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "alice@example.com" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Send verification code" }),
  );
  expect(await screen.findByLabelText("Verification code")).toBeInTheDocument();
  expect(requestEmailOtp).toHaveBeenCalledWith("alice@example.com");
  fireEvent.change(screen.getByLabelText("Verification code"), {
    target: { value: "123456" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Verify & sign in" }));
  await waitFor(() =>
    expect(signIn).toHaveBeenCalledWith(
      "email-otp",
      expect.objectContaining({
        email: "alice@example.com",
        code: "123456",
        callbackUrl: "/merchant",
      }),
    ),
  );
  await waitFor(() => expect(push).toHaveBeenCalledWith("/merchant"));
});
test("unconfigured email delivery displays an error instead of pretending a code was sent", async () => {
  jest.mocked(requestEmailOtp).mockResolvedValue({
    success: false,
    message: "Email verification is not configured yet.",
  });
  render(<LoginClient />);
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "alice@example.com" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Send verification code" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("not configured");
  expect(screen.queryByLabelText("Verification code")).not.toBeInTheDocument();
});
test("signup verifies the email code on the server before creating the account", async () => {
  jest
    .mocked(signUp)
    .mockResolvedValueOnce({
      success: false,
      message: "That code is incorrect.",
    })
    .mockResolvedValueOnce({ success: true });
  render(<SignupPage />);
  fireEvent.change(screen.getByLabelText("Full name"), {
    target: { value: "Alice" },
  });
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "alice@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Phone number"), {
    target: { value: "9876543210" },
  });
  fireEvent.change(screen.getByLabelText("Create a password"), {
    target: { value: "password123" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Continue to email verification" }),
  );
  await screen.findByLabelText("Verification code");
  expect(signUp).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Verification code"), {
    target: { value: "123456" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Verify & create account" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("incorrect");
  expect(push).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Verify & create account" }),
  );
  await waitFor(() =>
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: "9876543210",
        emailCode: "123456",
      }),
    ),
  );
});
test("email verification supports changing the address and throttles resend in the UI", async () => {
  render(<LoginClient />);
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "alice@example.com" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Send verification code" }),
  );
  expect(await screen.findByText("alice@example.com")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Resend in 60s" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Change email address" }));
  expect(screen.getByLabelText("Email address")).toHaveValue(
    "alice@example.com",
  );
  expect(screen.queryByLabelText("Verification code")).not.toBeInTheDocument();
});
