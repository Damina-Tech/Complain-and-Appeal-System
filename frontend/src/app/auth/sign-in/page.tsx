import Signin from "@/components/Auth/Signin";
import { AuthPageShell } from "@/components/Auth/AuthPageShell";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Sign in" };
export default function SignIn() {
  return <AuthPageShell title="Welcome back" subtitle="Sign in to submit or manage complaints and appeals."><Signin /></AuthPageShell>;
}
