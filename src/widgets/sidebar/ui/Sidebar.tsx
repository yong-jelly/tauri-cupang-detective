interface SidebarProps {
  activePage?: string;
  onNavigate?: (page: string) => void;
}

export const Sidebar = ({ activePage = "home", onNavigate }: SidebarProps) => {
  return (
    <div className="w-64 bg-[#3F0E40] flex flex-col h-full text-white">
      {/* Workspace Header */}
      <div className="h-12 border-b border-[#5d2c5d] flex items-center px-4 font-bold hover:bg-[#350d36] cursor-pointer transition-colors">
        Tauti Workspace <span className="ml-1 text-xs">▼</span>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto py-3 custom-scrollbar">
        {/* Section: Apps */}
        <div className="mb-6">
          <div className="flex items-center justify-between px-4 pb-1 group cursor-pointer text-[#bcabbc] hover:text-white">
            <h3 className="font-medium">Apps</h3>
          </div>
          <ul>
            <li
              onClick={() => onNavigate?.("playground")}
              className={`px-4 py-1 cursor-pointer flex items-center ${
                activePage === "playground" ? "bg-[#1164A3] text-white" : "text-[#bcabbc] hover:bg-[#350d36]"
              }`}
            >
              <span className="mr-2">⚡️</span> Playground
            </li>
            <li
              onClick={() => onNavigate?.("settings")}
              className={`px-4 py-1 cursor-pointer flex items-center ${
                activePage === "settings" ? "bg-[#1164A3] text-white" : "text-[#bcabbc] hover:bg-[#350d36]"
              }`}
            >
              <span className="mr-2">⚙️</span> Settings
            </li>
          </ul>
        </div>

        {/* Section: Channels */}
        <div className="mb-6">
          <div className="flex items-center justify-between px-4 pb-1 group cursor-pointer text-[#bcabbc] hover:text-white">
            <h3 className="font-medium">Channels</h3>
            <span className="hidden group-hover:block text-lg leading-none">+</span>
          </div>
          <ul>
            {["general", "random", "tauri-v2", "bun-js", "help"].map((channel) => (
              <li
                key={channel}
                onClick={() => onNavigate?.("home")}
                className={`px-4 py-1 cursor-pointer flex items-center ${
                  activePage === "home" && channel === "general" ? "bg-[#1164A3] text-white" : "text-[#bcabbc] hover:bg-[#350d36]"
                }`}
              >
                <span className="opacity-70 mr-2">#</span> {channel}
              </li>
            ))}
          </ul>
        </div>


        {/* Section: Direct Messages */}
        <div>
          <div className="flex items-center justify-between px-4 pb-1 group cursor-pointer text-[#bcabbc] hover:text-white">
            <h3 className="font-medium">Direct Messages</h3>
            <span className="hidden group-hover:block text-lg leading-none">+</span>
          </div>
          <ul>
            {["Alice", "Bob", "Charlie (You)", "Dave"].map((user) => (
              <li key={user} className="px-4 py-1 cursor-pointer flex items-center text-[#bcabbc] hover:bg-[#350d36]">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-3"></span>
                {user}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

