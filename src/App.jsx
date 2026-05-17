import React from 'react';
import { HashRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import AppRoutes from './routes/AppRoutes';
import CommandPalette from './components/CommandPalette';

function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <CommandPalette />
            <AppRoutes />
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </HashRouter>
  );
}

export default App;
