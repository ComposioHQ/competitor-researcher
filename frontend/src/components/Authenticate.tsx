"use client";

import { useEffect, useState, useContext } from "react";
import { v4 as uuidv4 } from "uuid";
import Toast from "./Toast";
import Link from "next/link";
import { GlobalContext } from "@/app/contextProvider";

export default function Authenticate() {
  const [authURL, setAuthURL] = useState("");
  const [loading, setLoading] = useState(false)
  const context = useContext(GlobalContext);

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL

  useEffect(() => {
    if (!localStorage.getItem("entity_id")) {
      let entity_id = uuidv4();
      localStorage.setItem("entity_id", entity_id.toString());
    }
  }, []);

  useEffect(() => {
    let entity_id = localStorage.getItem("entity_id");
    if (!authURL) {
      const interval = setInterval(() => {
        fetch(`${BASE_URL}/confirm_auth?entity_id=${entity_id?.toString()}`)
          .then((data) => data.json())
          .then((resp: any) => {
            context.setAuthenticated(resp.auth_confirmation);
            clearInterval(interval);
          })
          .catch((err) => {
            console.log(err);
            clearInterval(interval);
          });
      }, 1000);
    }
  }, [authURL]);

  useEffect(() => {
    const openLinkInNewTab = () => {
      const url = authURL;
      const newTab = window.open(url, "_blank");
      newTab?.focus();
    };
    if (authURL !== "") {
      openLinkInNewTab();
    }
  }, [authURL]);

  function notionAuth() {
    setLoading(true)
    let entity_id = localStorage.getItem("entity_id");
    fetch(`${BASE_URL}/authenticate?entity_id=${entity_id?.toString()}`)
      .then((data) => data.json())
      .then((resp) => {
        if (resp.message === "error") {
          context.setAuthenticated(true);
          setLoading(false)
        } else {
          setAuthURL(resp.URL);
          setLoading(false)
        }
      })
      .catch((err) => {
        console.log(err);
        setLoading(false)
      });
  }
  return (
    <main className="w-screen min-h-screen flex flex-col gap-5 items-center justify-center">
      <button
        disabled={authURL !== "" || loading ? true : false}
        className={`bg-white text-black font-semibold font-raleway py-2 px-4 rounded-md ${
          authURL !== "" || loading ? "opacity-50" : "opacity-100"
        }`}
        onClick={notionAuth}
      >
        {loading ? "Loading..." : "Authentiate with Notion"}
      </button>
      <Link
        href={"/"}
        className={`border-[1px] border-gray-500 px-4 py-2 rounded-md bg-transparent hover:bg-gray-900 duration-300`}
      >
        Proceed to Homepage
      </Link>
      {authURL && (
        <div className="max-w-prose text-center">
          <p>
            If you're not redirected to the notion login page click{" "}
            <a className="underline text-blue-600" href={authURL} target="_blank">
              here
            </a> to get to the login page.
          </p>
        </div>
      )}
      {context.authenticated && (
        <Toast type="success">Already Authenticated</Toast>
      )}
    </main>
  );
}
