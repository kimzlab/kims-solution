import { ThemeProvider } from "./contexts/ThemeContext";
import { DerivAuthProvider } from "./contexts/DerivAuthContext";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <ThemeProvider>
      <DerivAuthProvider>
        <Dashboard />
      </DerivAuthProvider>
    </ThemeProvider>
  );
}

export default App;
