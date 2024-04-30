"use client"

import Link from "next/link";
import { useContext } from "react";
import { GlobalContext } from "@/app/contextProvider";

export default function SignIn() {
    const context = useContext(GlobalContext)
  return (
    <Link className={`fixed top-3 right-3 px-4 py-2 rounded-md bg-white text-black duration-300 font-semibold font-raleway ${context.authenticated ? "hidden" : "block"}`} href={"/authenticate"}>Sign in</Link>
  )
}
