"use client";
import { useState } from "react";
import { useChiroAuth } from "@/components/ChiroAuthProvider";
import Link from "next/link";
import GoogleSigninButton from "../GoogleSigninButton";
import SigninWithPassword from "../SigninWithPassword";

export default function Signin() {
  const auth = useChiroAuth();
  const [failure, setFailure] = useState<string | null>(null);
  if (auth.mode === "keycloak") return <div className="space-y-4">
    <p>Use your Chiro Auth account to access CAS.</p>
    {(failure || auth.error) && <p role="alert" className="text-red-600">{failure || auth.error}</p>}
    <button className="w-full rounded-lg bg-primary p-4 text-white" onClick={() => void auth.signIn().catch(e => setFailure(e.message))}>Sign in with Chiro Auth</button>
    <button className="w-full rounded-lg border p-4" onClick={() => void auth.signOut().catch(e => setFailure(e.message))}>Sign out / switch account</button>
    <p className="text-sm">Your administrator must grant access to CAS.</p>
  </div>;

  return (
    <>
      <GoogleSigninButton text="Sign in" />

      <div className="my-6 flex items-center justify-center">
        <span className="block h-px w-full bg-stroke dark:bg-dark-3"></span>
        <div className="block w-full min-w-fit bg-white px-3 text-center font-medium dark:bg-gray-dark">
          Or sign in with email
        </div>
        <span className="block h-px w-full bg-stroke dark:bg-dark-3"></span>
      </div>

      <div>
        <SigninWithPassword />
      </div>

      <div className="mt-6 text-center">
        <p>
          Don’t have any account?{" "}
          <Link href="/auth/sign-up" className="text-primary">
            Sign Up
          </Link>
        </p>
      </div>
    </>
  );
}
