import { useState, useEffect } from 'react';
import Queue from './components/Queue';
import ConnectionManager from './components/ConnectionManager';
import Modal from './components/Modal';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function App() {
  const [guilds, setGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [status, setStatus] = useState({ connected: false, queue: [], previousTracks: [], canControl: false });
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [inviteUrl, setInviteUrl] = useState(null);
  const [controllerRoleName, setControllerRoleName] = useState(null);
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);

  const apiCall = async (apiFunction) => {
    setIsLoading(true);
    try {
      await apiFunction();
    } catch (error) {
      console.error("API call failed:", error);
    } finally {
      // Use a short delay before fetching status to allow Discord API to update
      setTimeout(() => {
        if (selectedGuild) {
          fetchStatus(selectedGuild.id);
        }
        setIsLoading(false);
      }, 500);
    }
  };

  const fetchStatus = async (guildId) => {
    if (!guildId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/music/${guildId}/status`);
      if (!response.ok) {
        if (response.status === 401) setUser(null); // Logged out
        throw new Error('Failed to fetch status');
      }
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error fetching status:', error);
      // On error, reset to a disconnected state
      setStatus({ connected: false, queue: [], previousTracks: [], canControl: false });
    }
  };
  
  // Effect to fetch user and guilds on initial load
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch invite URL and controller role name
        const inviteResponse = await fetch(`${API_BASE_URL}/api/invite`);
        if (inviteResponse.ok) {
          const inviteData = await inviteResponse.json();
          setInviteUrl(inviteData.inviteUrl);
          setControllerRoleName(inviteData.controllerRoleName);
        }

        // Fetch user
        const userResponse = await fetch(`${API_BASE_URL}/api/auth/user`);
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData) {
            setUser(userData);
            // Fetch guilds only if user is logged in
            const guildsResponse = await fetch(`${API_BASE_URL}/api/guilds`);
            if (!guildsResponse.ok) {
              throw new Error('Failed to fetch guilds');
            }
            const guildsData = await guildsResponse.json();
            setGuilds(guildsData);
            if (guildsData.length > 0) {
              setSelectedGuild(guildsData[0]);
            }
          } else {
            setUser(null);
            setGuilds([]);
            setSelectedGuild(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setUser(null);
      }
    };

    fetchInitialData();
  }, []);

  // Effect to poll for status updates for the selected guild
  useEffect(() => {
    if (selectedGuild) {
      fetchStatus(selectedGuild.id);
      const interval = setInterval(() => fetchStatus(selectedGuild.id), 2000);
      return () => clearInterval(interval);
    }
  }, [selectedGuild]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST' });
      setUser(null);
      setGuilds([]);
      setSelectedGuild(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };


  return (
    <div className="App">
      <header className="App-header">
        <div className="header-title">
          <img src="/favicon.svg" alt="Bot Icon" className="header-logo" />
          <h1>Bard Bot Control Panel</h1>
        </div>
        <div className="header-right">
          <button onClick={() => setInviteModalOpen(true)} className="btn-header-action">
            Invite & Setup
          </button>
          {user ? (
            <div className="user-info">
              <img 
                src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} 
                alt="User Avatar" 
                className="user-avatar"
              />
              <span>{user.username}</span>
              <button onClick={handleLogout} className="btn-logout">Logout</button>
            </div>
          ) : (
            <a href={`${API_BASE_URL}/api/auth/discord`} className="btn-login">
              Login with Discord
            </a>
          )}
        </div>
      </header>
      
      {!user ? (
        <div className="login-prompt">
          <h2>Please login with Discord to continue.</h2>
        </div>
      ) : (
        <>
          {guilds.length > 0 && selectedGuild ? (
            <main className="main-content">
              <div className="guild-selector-container">
                <label htmlFor="guild-select">Server:</label>
                <select 
                  id="guild-select"
                  onChange={(e) => setSelectedGuild(guilds.find(g => g.id === e.target.value))}
                  value={selectedGuild?.id || ''}
                  className="guild-selector"
                >
                  {guilds.map((guild) => (
                    <option key={guild.id} value={guild.id}>
                      {guild.name}
                    </option>
                  ))}
                </select>
              </div>

              <ConnectionManager 
                guildId={selectedGuild.id} 
                isConnected={status.connected} 
                canControl={status.canControl}
                onConnectionChange={() => fetchStatus(selectedGuild.id)} 
              />

              {status.connected ? (
                <div className="panels">
                  <div className="panel queue-panel">
                    <Queue 
                      guildId={selectedGuild.id} 
                      status={{...status, isLoading}} 
                      volume={status.volume}
                      onApiCall={apiCall}
                      canControl={status.canControl}
                    />
                  </div>
                </div>
              ) : (
                <p className="status-message">Bot is not in a voice channel. Click "Join Channel" to start.</p>
              )}
            </main>
          ) : (
            <div className="no-guilds-prompt">
              <h2>You don't share any servers with this bot.</h2>
              {inviteUrl ? (
                <>
                  <p>Click the button below to invite the bot to one of your servers!</p>
                  <a href={inviteUrl} className="btn-invite" target="_blank" rel="noopener noreferrer">
                    Invite Bot to Server
                  </a>
                  {controllerRoleName && (
                    <div className="setup-instructions">
                      <h4>Setup Instructions:</h4>
                      <p>
                        After inviting the bot, create a role named exactly <strong>"{controllerRoleName}"</strong> in your server settings.
                        Assign this role to any members you want to give control over the bot.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p>Please make sure the bot has been added to a server you are in.</p>
              )}
            </div>
          )}
        </>
      )}

      <Modal isOpen={isInviteModalOpen} onClose={() => setInviteModalOpen(false)}>
        <div className="invite-modal-content">
          <h2>Invite & Setup</h2>
          {inviteUrl ? (
            <>
              <p>Click the button below to invite the bot to one of your servers!</p>
              <a href={inviteUrl} className="btn-invite" target="_blank" rel="noopener noreferrer">
                Invite Bot to Server
              </a>
              {controllerRoleName && (
                <div className="setup-instructions">
                  <h4>Setup Instructions:</h4>
                  <p>
                    After inviting the bot, create a role named exactly <strong>"{controllerRoleName}"</strong> in your server settings.
                    Assign this role to any members you want to give control over the bot.
                  </p>
                </div>
              )}
            </>
          ) : (
            <p>The bot invite link has not been configured by the administrator.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default App;
