"use client";

import { useContext } from "react";
import { GlobalContext } from "@/app/contextProvider";

export default function SignOut() {
  const context = useContext(GlobalContext)
  function signOut() {
    localStorage.clear();
    context.setAuthenticated(false)
  }
  return (
    <button
      onClick={signOut}
      disabled={!context.authenticated}
      className={`fixed top-3 right-3 border-[1px] border-gray-500 px-4 py-2 rounded-md bg-black hover:bg-gray-900 duration-300 ${context.authenticated ? "block" : "hidden"}`}
    >
      Sign out
    </button>
  );
}
