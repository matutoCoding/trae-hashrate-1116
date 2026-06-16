import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Wash from "@/pages/Wash";
import Transactions from "@/pages/Transactions";
import Quota from "@/pages/Quota";
import Pricing from "@/pages/Pricing";
import BottomNav from "@/components/BottomNav";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/wash" element={<Wash />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/quota" element={<Quota />} />
          <Route path="/pricing" element={<Pricing />} />
        </Routes>
        <BottomNav />
      </div>
    </Router>
  );
}
