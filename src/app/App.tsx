import { useState } from "react";
import { HomePage } from "@pages/home";
import { PlaygroundPage } from "@pages/playground";
import { Sidebar } from "@widgets/sidebar";

function App() {
  const [activePage, setActivePage] = useState("home");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {activePage === "home" && <HomePage />}
        {activePage === "playground" && <PlaygroundPage />}
      </main>
    </div>
  );
}

export default App;
