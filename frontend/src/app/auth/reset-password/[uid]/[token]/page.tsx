"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import InputGroup from "@/components/FormElements/InputGroup";
import { PasswordIcon } from "@/assets/icons";
import { submitPasswordReset } from "@/utils/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

const SUCCESS_MESSAGE =
  process.env.NEXT_PUBLIC_RESET_PASSWORD_SUCCESS_MSG ||
  "Your password has been updated. You can now sign in with your new password.";

export default function ResetPasswordPage() {
  const params = useParams<{ uid: string; token: string }>();
  const router = useRouter();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.password.trim()) {
      setError("Please enter a new password.");
      return;
    }

    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await submitPasswordReset({
        userId: params.uid,
        token: params.token,
        newPassword: form.password,
      });
      setMessage(SUCCESS_MESSAGE);
      setForm({ password: "", confirm: "" });
      // optionally redirect after a delay
      setTimeout(() => router.push("/auth/sign-in"), 2500);
    } catch (err: any) {
      const apiError = err?.error || err?.message || "Unable to reset password.";
      setError(typeof apiError === "string" ? apiError : "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-card dark:bg-gray-dark">
      <h1 className="text-2xl font-semibold text-dark dark:text-white">Reset Password</h1>
      <p className="mt-2 text-sm text-dark-6 dark:text-dark-6">
        Choose a new password for your account.
      </p>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <InputGroup
          type={showPassword ? "text" : "password"}
          label="New Password"
          placeholder="Enter new password"
          name="password"
          value={form.password}
          onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
          required
          icon={<PasswordIcon />}
          iconPosition="left"
          endIcon={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="flex h-5 w-5 items-center justify-center text-dark-6 transition hover:text-primary focus-visible:outline-none"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          }
        />

        <InputGroup
          type={showConfirm ? "text" : "password"}
          label="Confirm Password"
          placeholder="Re-enter new password"
          name="confirm"
          value={form.confirm}
          onChange={(e) => setForm((s) => ({ ...s, confirm: e.target.value }))}
          required
          icon={<PasswordIcon />}
          iconPosition="left"
          endIcon={
            <button
              type="button"
              onClick={() => setShowConfirm((prev) => !prev)}
              className="flex h-5 w-5 items-center justify-center text-dark-6 transition hover:text-primary focus-visible:outline-none"
            >
              {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          }
        />

        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full bg-primary text-white hover:bg-primary/90">
          {loading ? "Updating..." : "Update Password"}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-dark-6 dark:text-dark-6">
        <Link href="/auth/sign-in" className="text-primary hover:underline">
          Return to Sign In
        </Link>
      </div>
    </div>
  );
}
