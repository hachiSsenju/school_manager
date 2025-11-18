import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import { Teachers } from "./pages/Teachers";
import Finances from "./pages/Finances";
import { StudentsManager } from "./pages/Students";
import { ClassManager } from "./pages/Classes";
import GradesPage from "./pages/ReportCards";
import DashboardWelcomePage from "./pages/DashboardWelcome";
import { SessionServices } from "./services/sessionServices";
import { ClassDetails } from "./pages/ClasseDetails";
import { StudentDetails } from "./pages/StudentDetails";
import { ProfDetails } from "./pages/ProfDetails";
// import ClassDetails from "./pages/ClasseDetails";

function App() {
  return SessionServices.getSchoolId() ? (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<StudentsManager />} />
          <Route path="/students/:id" element={<StudentDetails />} />
          <Route path="/classes" element={<ClassManager />} />
          <Route path="/classes/:id" element={<ClassDetails />} />
          <Route path="/teachers" element={<Teachers />} />
          <Route path="/teachers/:id" element={<ProfDetails />} />
          <Route path="/finances" element={<Finances />} />
          <Route path="/welcome" element={<DashboardWelcomePage />} />
          <Route path="/reports" element={<GradesPage />} />
        </Routes>
      </Layout>
    </Router>
  ) : 
  <DashboardWelcomePage/>
}

export default App;
