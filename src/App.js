import './App.css';
import { useCallback, useState } from 'react';
import { Auth } from './Auth';
import { Chat } from './Chat';
function App() {
  const [token, setToken] = useState(() => localStorage.getItem('chat_token'));
  const logout = useCallback(() => {
    localStorage.removeItem('chat_token');
    setToken(null);
  }, []);

  if (!token) {
    return <main className="app-shell"><Auth onAuthenticated={setToken} /></main>;
  }

  return (
    <main className="app-shell">
      <Chat token={token} onLogout={logout} />
    </main>
  );
}

export default App;
