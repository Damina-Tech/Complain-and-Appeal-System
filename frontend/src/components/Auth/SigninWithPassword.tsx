"use client";
import { EmailIcon, PasswordIcon } from "@/assets/icons";
import Link from "next/link";
import React, { useState } from "react";
import InputGroup from "../FormElements/InputGroup/index";
import { Checkbox } from "../FormElements/checkbox";
import { useRouter } from "next/navigation";
import { loginUser } from "@/utils/api";
import { defaultRouteForRole } from "@/lib/role";
import { Eye, EyeOff } from "lucide-react";

export default function SigninWithPassword() {
  const [data, setData] = useState({
    email: process.env.NEXT_PUBLIC_DEMO_USER_MAIL || "",
    password: process.env.NEXT_PUBLIC_DEMO_USER_PASS || "",
    remember: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({
      ...data,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await loginUser(data.email, data.password); // call Django API
      localStorage.setItem("token", response.access); // save JWT
      if (response.role) {
        localStorage.setItem("role", response.role);
      }
      if (response.user_id) {
        localStorage.setItem("user_id", String(response.user_id));
      }
      // Fetch user groups from /auth/me endpoint after login
      if (response.access) {
        try {
          const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me/`, {
            headers: { Authorization: `Bearer ${response.access}` },
            cache: "no-store",
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData.user_groups && Array.isArray(meData.user_groups)) {
              const groups = meData.user_groups.map((g: string) => g).filter(Boolean);
              localStorage.setItem("user_groups", JSON.stringify(groups));
              console.log("User groups stored after login:", groups);
            }
          } else {
            console.error("Failed to fetch user info:", meRes.status, meRes.statusText);
          }
        } catch (e) {
          console.error("Failed to fetch user groups:", e);
        }
      }
      setLoading(false);
      const role = (response.role || "").toString();
      router.push(defaultRouteForRole(role));
    } catch (err: any) {
      setLoading(false);
      setError("Invalid email or password");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <InputGroup
        type="email"
        label="Email"
        className="mb-4 [&_input]:py-[15px]"
        placeholder="Enter your email"
        name="email"
        handleChange={handleChange}
        value={data.email}
        
      />

      <InputGroup
        type={showPassword ? "text" : "password"}
        label="Password"
        className="mb-5 [&_input]:py-[15px]"
        placeholder="Enter your password"
        name="password"
        handleChange={handleChange}
        value={data.password}
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

       {error && <p className="mb-4 text-red-500">{error}</p>}

      <div className="mb-6 flex items-center justify-between gap-2 py-2 font-medium">
        <Checkbox
          label="Remember me"
          name="remember"
          withIcon="check"
          minimal
          radius="md"
          onChange={(e) =>
            setData({
              ...data,
              remember: e.target.checked,
            })
          }
        />

        <Link
          href="/auth/forgot-password"
          className="hover:text-primary dark:text-white dark:hover:text-primary"
        >
          Forgot Password?
        </Link>
      </div>

      <div className="mb-4.5">
        <button
          type="submit"
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary p-4 font-medium text-white transition hover:bg-opacity-90"
        >
          Sign In
          {loading && (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent dark:border-primary dark:border-t-transparent" />
          )}
        </button>
      </div>
    </form>
  );
}
