import { useState } from "react";

export const ChatWindow = () => {
  const [message, setMessage] = useState("");

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="h-12 border-b flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center font-bold text-gray-800">
          <span className="text-gray-400 font-light mr-1">#</span> general
          <span className="ml-2 text-xs font-normal text-gray-500 border rounded px-1 hidden sm:inline-block">
            Topic: Discussing Tauri v2
          </span>
        </div>
        <div className="flex items-center space-x-3 text-gray-500">
            {/* Mock icons */}
            <div className="cursor-pointer hover:bg-gray-100 p-1 rounded">Members</div>
            <div className="cursor-pointer hover:bg-gray-100 p-1 rounded">Info</div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Mock Messages */}
        <div className="flex gap-3 hover:bg-gray-50 -mx-4 px-4 py-1">
            <div className="w-9 h-9 rounded bg-blue-500 flex-shrink-0 flex items-center justify-center text-white font-bold">A</div>
            <div>
                <div className="flex items-baseline gap-2">
                    <span className="font-bold text-gray-900">Alice</span>
                    <span className="text-xs text-gray-500">10:23 AM</span>
                </div>
                <p className="text-gray-800">Hello everyone! Has anyone tried Tauri v2 yet?</p>
            </div>
        </div>

        <div className="flex gap-3 hover:bg-gray-50 -mx-4 px-4 py-1">
            <div className="w-9 h-9 rounded bg-green-500 flex-shrink-0 flex items-center justify-center text-white font-bold">B</div>
            <div>
                <div className="flex items-baseline gap-2">
                    <span className="font-bold text-gray-900">Bob</span>
                    <span className="text-xs text-gray-500">10:25 AM</span>
                </div>
                <p className="text-gray-800">Yes! It's super fast and the Bun integration is smooth.</p>
            </div>
        </div>

        <div className="flex gap-3 hover:bg-gray-50 -mx-4 px-4 py-1">
            <div className="w-9 h-9 rounded bg-purple-500 flex-shrink-0 flex items-center justify-center text-white font-bold">C</div>
            <div>
                <div className="flex items-baseline gap-2">
                    <span className="font-bold text-gray-900">Charlie</span>
                    <span className="text-xs text-gray-500">10:26 AM</span>
                </div>
                <p className="text-gray-800">I'm setting it up right now using FSD architecture.</p>
            </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 pt-0">
        <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:border-gray-400 shadow-sm">
            {/* Formatting Toolbar Mock */}
            <div className="bg-gray-50 border-b border-gray-200 px-2 py-1 flex gap-2 text-gray-500 text-sm">
                <button className="hover:bg-gray-200 px-1 rounded font-bold">B</button>
                <button className="hover:bg-gray-200 px-1 rounded italic">I</button>
                <button className="hover:bg-gray-200 px-1 rounded underline">U</button>
                <button className="hover:bg-gray-200 px-1 rounded line-through">S</button>
            </div>
            
            <textarea 
                className="w-full max-h-60 p-3 focus:outline-none resize-none"
                rows={3}
                placeholder="Message #general"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
            ></textarea>

            <div className="flex justify-between items-center px-2 py-1 bg-white">
                <div className="text-xs text-gray-400">+ Attachments</div>
                <button className={`px-3 py-1 rounded ${message ? 'bg-[#007a5a] text-white' : 'bg-gray-100 text-gray-400'} transition-colors font-medium text-sm`}>
                    Send
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

