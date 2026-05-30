import React from 'react';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import AppRoutes from './routes/AppRoutes';
import CommandPalette from './components/CommandPalette';
import ScrollToTop from './components/ScrollToTop';

const Router = window.Capacitor ? HashRouter : BrowserRouter;

function App() {
  return (
    <Router>
      <ScrollToTop />
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <CommandPalette />
            <AppRoutes />
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
