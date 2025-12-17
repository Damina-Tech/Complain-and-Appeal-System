"use client";

import { useState } from "react";
import InputGroup from "@/components/FormElements/InputGroup";
import { EmailIcon } from "@/assets/icons";
import { requestPasswordReset } from "@/utils/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const SUCCESS_MESSAGE =
  process.env.NEXT_PUBLIC_FORGOT_PASSWORD_SUCCESS_MSG ||
  "If an account exists for that email address, a reset link has been sent.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);
      await requestPasswordReset(email.trim());
      setMessage(SUCCESS_MESSAGE);
      setEmail("");
    } catch (err: any) {
      const apiError = err?.error || err?.message || "Unable to process request.";
      setError(typeof apiError === "string" ? apiError : "Unable to process request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-card dark:bg-gray-dark">
      <h1 className="text-2xl font-semibold text-dark dark:text-white">Forgot Password</h1>
      <p className="mt-2 text-sm text-dark-6 dark:text-dark-6">
        Enter the email associated with your account and we&apos;ll send you a password reset link.
      </p>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="email-input" className="text-body-sm font-medium text-dark dark:text-white">
            Email <span className="text-red">*</span>
          </label>
          <div className="relative">
            <input
              id="email-input"
              type="email"
              name="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-5.5 py-3 pl-12.5 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
            />
            <span className="pointer-events-none absolute left-4.5 top-1/2 -translate-y-1/2">
              <EmailIcon />
            </span>
          </div>
        </div>

        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white hover:bg-primary/90"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-dark-6 dark:text-dark-6">
        <Link href="/auth/sign-in" className="text-primary hover:underline">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
