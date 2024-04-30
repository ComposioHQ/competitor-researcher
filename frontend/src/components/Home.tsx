"use client";
import { useState, useContext, useEffect, useRef } from "react";
import { GlobalContext } from "@/app/contextProvider";
import Toast from "./Toast";
import SignIn from "./SignIn";
import SignOut from "./SignOut";
import Markdown from "react-markdown";
import pako from "pako"

export default function Home() {
  const [url, setURL] = useState("");
  const [analyzingCompetitor, setAnalyzingCompetitor] = useState(false);
  const [competitorData, setCompetitorData] = useState("");
  const [analysedCompetitor, setAnalyzedCompetitor] = useState<boolean>();
  const [notionPageCreated, setNotionPageCreated] = useState<
    boolean | undefined
  >();
  const [showNoAuthToast, setShowNoAuthToast] = useState(false);
  const [addingPage, setAddingPage] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showUserPageInput, setShowUserPageInput] = useState(false);
  const [userPageInput, setUserPageInput] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [pageInfo, setPageInfo] = useState({title: "", url: ""});

  const context = useContext(GlobalContext);

  const logsRef = useRef(null)

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL

  useEffect(() => {
    function confirmAuth() {
      if (!localStorage.getItem("entity_id")) {
        context.setAuthenticated(false);
      } else {
        let entity_id = localStorage.getItem("entity_id");
        fetch(`${BASE_URL}/confirm_auth?entity_id=${entity_id}`)
          .then((data) => data.json())
          .then((resp) => {
            context.setAuthenticated(resp.auth_confirmation);
          })
          .catch((err) => {
            console.log(err);
            confirmAuth();
          });
      }
    }

    confirmAuth();
  }, []);

  function getScrapedData() {
    setAnalyzingCompetitor(true);
    setCompetitorData("");
    setShowLogs(true);
    let options = {
      method: "POST",
      body: JSON.stringify({
        url: url.includes("https://") ? url : `https://${url}`,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };

    fetch(`${BASE_URL}/scrape_website`, options)
      .then((data) => data.json())
      .then((resp) => {
        if (!resp.error) {
          setCompetitorData(resp);
          setAnalyzingCompetitor(false);
          setAnalyzedCompetitor(true);
        } else {
          setAnalyzingCompetitor(false);
          setAnalyzedCompetitor(false);
        }
      })
      .catch((err) => {
        console.log(err);
        setAnalyzingCompetitor(false);
        setAnalyzedCompetitor(false);
      });
  }

  function addToNotion() {
    setAddingPage(true);
    setShowUserPageInput(false);
    setNotionPageCreated(undefined);
    setShowLogs(true);
    setLogs([]);

    if (context.authenticated && userPageInput && competitorData) {
      const eventSource = new EventSource(
        `${BASE_URL}/create_notion_page?parent_page=${userPageInput}&entity_id=${localStorage.getItem(
          "entity_id"
        )}&competitor_data=${encodeURIComponent(
          Buffer.from(competitorData).toString("base64")
        )}`
      );
      eventSource.onmessage = function (event) {
        const logData = event.data.replace("data: ", "");

        const lines = logData.slice(2, -1).replace("\\n\\n", " ").replace(/\\n/g, '\n').split("\n");

        setLogs((prevLogs) => [...prevLogs, ...lines]);

        const parentIdRegex = /"parent_id":\s*"([^"]+)"/;
        const parentIdMatch = logData.match(parentIdRegex);
        const parentId = parentIdMatch ? parentIdMatch[1] : null;
        
        const titleRegex = /"title":\s*"([^"]+)"/;
        const titleMatch = logData.match(titleRegex);
        const title = titleMatch ? titleMatch[1] : null;

        if (parentId && title) {
          const pageUrl = `https://notion.so/${parentId.replace(/-/g, "")}`;
          setPageInfo({title, url: pageUrl})
        }
    
        if (logData.includes("AgentFinish")) {
          eventSource.close();
          setNotionPageCreated(true);
          setAddingPage(false);
        }
      };
      eventSource.onerror = (event) => {
        console.error("EventSource failed", event);
        setNotionPageCreated(false);
        setAddingPage(false);
      };
    } else {
      setShowNoAuthToast(true);
      setAddingPage(false);
    }
  }

  return (
    <main className="min-h-screen w-screen flex flex-col gap-6 items-center pt-[40vh] pb-5 md:px-10 md:pt-[30vh]">
      <SignIn />
      <SignOut />
      <h1 className="text-5xl font-bold text-center">Competitor Research</h1>
      <section className="flex flex-col items-center justify-center gap-6">
        <div className="w-full flex flex-row gap-2 items-center justify-between md:flex-col md:items-center">
          <input
            onChange={(e) => {
              setURL(e.target.value);
            }}
            className="px-3 py-2 rounded-md bg-transparent text-white border-[1px] border-gray-500 min-w-96 flex-grow"
            type="url"
            placeholder="Enter the competitor's website (https://vercel.com)"
          />
          <div className="flex flex-row gap-2">

          <button
            disabled={analyzingCompetitor || url === ""}
            onClick={getScrapedData}
            className={`bg-white text-black py-2 px-4 rounded-md ${
              analyzingCompetitor || url === "" ? "opacity-50" : "opacity-100"
            }`}
          >
            {analyzingCompetitor ? "Analyzing..." : "Analyze"}
          </button>
          <button
            onClick={() => {
              setShowUserPageInput(!showUserPageInput);
            }}
            disabled={competitorData === "" || addingPage ? true : false}
            className={`border-[1px] border-gray-500 px-4 py-2 rounded-md bg-transparent hover:bg-gray-900 duration-300 ${
              competitorData === "" || addingPage ? "opacity-50" : "opacity-100"
            }`}
            >
            {showUserPageInput && !addingPage
              ? "Cancel"
              : addingPage
              ? "Adding..."
              : "Add to Notion"}
          </button>
        </div>
        </div>

        {showUserPageInput && (
          <div className="flex flex-col gap-2 justify-center">
            <span className="max-w-prose">
              Write the name of the Parent Page under which the page will be
              created and competitor details will be added. 
              <span className="text-red-700"> Note that this
              parent page should already exist in your notion app.</span>
            </span>
            <div className="flex flex-row gap-2 items-center justify-between md:flex-col">
              <input
                onChange={(e) => {
                  setUserPageInput(e.target.value);
                }}
                className="px-4 py-2 rounded-md bg-black text-white border-[1px] border-gray-500 w-96 flex-grow"
                type="text"
                placeholder="Write the parent page name"
              />
              <button
                onClick={addToNotion}
                disabled={
                  competitorData === "" || addingPage || userPageInput === ""
                    ? true
                    : false
                }
                className={`border-[1px] border-gray-500 px-4 py-2 rounded-md bg-transparent hover:bg-gray-900 duration-300 ${
                  competitorData === "" || addingPage || userPageInput === ""
                    ? "opacity-50"
                    : "opacity-100"
                }`}
              >
                {addingPage ? "Adding..." : "Add to Notion"}
              </button>
            </div>
          </div>
        )}

        <div className="bg-gray-900 flex flex-col gap-2 w-full p-2 rounded-md">
          <div
            className="flex flex-row self-start gap-2 cursor-pointer"
            onClick={() => {
              setShowLogs(!showLogs);
            }}
          >
            {showLogs ? <p>&#x25BC;</p> : <p className="rotate-90">&#x25B2;</p>}
            {showLogs ? "Hide Logs" : "Show Logs"}
          </div>
          <div
            ref={logsRef}
            className={`${
              showLogs ? "block" : "hidden"
            } max-w-prose text-wrap max-h-48 overflow-y-auto flex flex-col`}
          >
            {analyzingCompetitor === true ? (
              <p>Analyzing Competitor... This might take a few seconds</p>
            ) : analyzingCompetitor === false && competitorData !== "" ? (
              <p>Analysis complete.</p>
            ) : null}
            {logs.length !== 0 && logs.map((log) => <p>{log.replace(/\\/g, " ")}</p>)}
          </div>
        </div>

        {competitorData && (
          <Markdown className="max-w-prose">{competitorData}</Markdown>
        )}
      </section>
      {notionPageCreated === true && (
        <Toast type="success">
          <span>
            Your notion page was created <a
              className="underline text-blue-900"
              href={pageInfo.url}
              target="_blank"
            >
              here
            </a>{" "}
            with the title "{pageInfo.title}"
          </span>
        </Toast>
      )}
      {notionPageCreated === false && (
        <Toast type="error">
          <span>
            Notion page creation failed, Please try again in sometime.
          </span>
        </Toast>
      )}
      {showNoAuthToast && (
        <Toast type="error">
          <span>Please authenticate through notion first</span>
        </Toast>
      )}
      {analysedCompetitor === false && (
        <Toast type="error">
          <span>
            There was some error in reading the page, please try again.
          </span>
        </Toast>
      )}
    </main>
  );
}
