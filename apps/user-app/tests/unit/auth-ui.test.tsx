import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LoginClient } from "@/app/login/LoginClient";
import SignupPage from "@/app/signup/page";
import { requestPhoneOtp, verifySignupOtp } from "@/lib/actions/phoneOtp";
import { signUp } from "@/lib/actions/signUp";
import { signIn } from "next-auth/react";
const push = jest.fn(),
  refresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => new URLSearchParams("callbackUrl=%2Fmerchant"),
}));
jest.mock("next-auth/react", () => ({ signIn: jest.fn() }));
jest.mock("@/lib/actions/phoneOtp", () => ({
  requestPhoneOtp: jest.fn(),
  verifySignupOtp: jest.fn(),
}));
jest.mock("@/lib/actions/signUp", () => ({ signUp: jest.fn() }));
const challenge = {
  success: true as const,
  challengeId: "challenge12345",
  expiresAt: new Date(Date.now() + 600000).toISOString(),
  resendAfter: 60,
  delivery: "sms" as const,
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(requestPhoneOtp).mockResolvedValue(challenge);
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
  expect(screen.getByLabelText("Phone number")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Password" }));
  expect(screen.getByLabelText("Email or phone number")).toBeInTheDocument();
  expect(
    screen.getByLabelText("Password", { selector: "input" }),
  ).toHaveAttribute("type", "password");
});
test("OTP login sends a challenge, then uses the phone provider with the internal callback", async () => {
  render(<LoginClient />);
  fireEvent.change(screen.getByLabelText("Phone number"), {
    target: { value: "9876543210" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Send verification code" }),
  );
  expect(await screen.findByLabelText("Verification code")).toBeInTheDocument();
  expect(requestPhoneOtp).toHaveBeenCalledWith("9876543210", "login");
  fireEvent.change(screen.getByLabelText("Verification code"), {
    target: { value: "123456" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Verify & sign in" }));
  await waitFor(() =>
    expect(signIn).toHaveBeenCalledWith(
      "phone-otp",
      expect.objectContaining({
        challengeId: "challenge12345",
        code: "123456",
        callbackUrl: "/merchant",
      }),
    ),
  );
  await waitFor(() => expect(push).toHaveBeenCalledWith("/merchant"));
});
test("unconfigured SMS displays an error instead of pretending a code was sent", async () => {
  jest.mocked(requestPhoneOtp).mockResolvedValue({
    success: false,
    message: "SMS verification is not configured yet.",
  });
  render(<LoginClient />);
  fireEvent.change(screen.getByLabelText("Phone number"), {
    target: { value: "9876543210" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Send verification code" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("not configured");
  expect(screen.queryByLabelText("Verification code")).not.toBeInTheDocument();
});
test("signup cannot create the account before the phone proof succeeds", async () => {
  jest
    .mocked(verifySignupOtp)
    .mockResolvedValueOnce({
      success: false,
      message: "That code is incorrect.",
    })
    .mockResolvedValueOnce({ success: true, challengeId: "challenge12345" });
  jest.mocked(signUp).mockResolvedValue({ success: true });
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
    screen.getByRole("button", { name: "Continue to phone verification" }),
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
  expect(signUp).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Verify & create account" }),
  );
  await waitFor(() =>
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: "9876543210",
        phoneVerificationId: "challenge12345",
      }),
    ),
  );
});
test("signup visibly distinguishes local development codes from SMS", async () => {
  jest
    .mocked(requestPhoneOtp)
    .mockResolvedValue({ ...challenge, delivery: "development" });
  render(<LoginClient />);
  fireEvent.change(screen.getByLabelText("Phone number"), {
    target: { value: "9876543210" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Send verification code" }),
  );
  expect(await screen.findByText(/No SMS was sent/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Resend in 60s" })).toBeDisabled();
});
