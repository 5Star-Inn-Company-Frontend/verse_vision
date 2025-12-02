import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import ProgramOutput from "@/pages/ProgramOutput";
import ErrorBoundary from "@/components/ErrorBoundary";
import CameraSender from "@/components/CameraSender";

export default function App() {
  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/program" element={<ProgramOutput />} />
          <Route path="/camera" element={<CameraSender />} />
          <Route path="/other" element={<div className="text-center text-xl">Other Page - Coming Soon</div>} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}
