import { AiOutlineClose } from "react-icons/ai";
import { useState } from "react";

export default function Toast({
  children,
  type,
}: {
  children: React.ReactNode;
  type: "success" | "error" | "";
}) {
  const [showToast, setShowToast] = useState<boolean>(true);

  return (
    <div
      className={`fixed w-auto top-3 right-3 md:-translate-x-0 duration-300 z-50 ${
        showToast ? "block" : "hidden"
      }`}
    >
      <div
        className="w-fit max-w-auto flex flex-row gap-2 items-center p-4 rounded-lg"
        style={{
          backgroundColor:
            type === "success"
              ? "#20c997"
              : type === "error"
              ? "#e03131"
              : "#339af0",
        }}
      >
        <span className="text-sm font-semibold">&#9432; {children}</span>
        <button
          onClick={() => {
            if (showToast) {
              setShowToast(false);
            }
          }}
          className={``}
        >
          <AiOutlineClose />
        </button>
      </div>
    </div>
  );
}
