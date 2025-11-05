import { useState, useEffect } from 'react';
import Queue from './components/Queue';
import S3FileBrowser from './components/S3FileBrowser';
import YouTubeInput from './components/YouTubeInput';
import PlayerControls from './components/PlayerControls';
import PlaybackStatus from './components/PlaybackStatus';
import ConnectionManager from './components/ConnectionManager';
import Modal from './components/Modal';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

// Mock data for development
const MOCK_USER = {
  id: '123456789012345678',
  username: 'Dev User',
  avatar: 'a1b2c3d4e5f6',
};

const MOCK_GUILDS = [
  { id: '111111111111111111', name: 'Test Server 1', memberCount: 50, icon: null },
  { id: '222222222222222222', name: 'Test Server 2', memberCount: 100, icon: null },
];

const MOCK_STATUS = {
  connected: true,
  canControl: true,
  playerStatus: 'playing',
  playbackDuration: 45000, // 45 seconds
  loopMode: 'none',
  volume: 75,
  nowPlaying: {
    title: 'Sample Song',
    author: 'Sample Artist',
    album: 'Sample Album',
    duration: 180,
    thumbnail: null,
    source: 's3',
  },
  queue: [
    { title: 'Next Song', author: 'Next Artist', album: 'Next Album', duration: 200, source: 's3' },
    { title: 'Third Song', author: 'Third Artist', album: null, duration: 150, source: 'youtube' },
  ],
  previousTracks: [
    { title: 'Previous Song', author: 'Previous Artist', album: 'Previous Album', duration: 190, source: 's3' },
  ],
};

function App() {
  const [guilds, setGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [status, setStatus] = useState({ connected: false, queue: [], previousTracks: [], canControl: false });
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [inviteUrl, setInviteUrl] = useState(null);
  const [controllerRoleName, setControllerRoleName] = useState(null);
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('youtube'); // 'youtube' or 's3'
  const [playMode, setPlayMode] = useState('queue'); // 'queue', 'next', 'now'

  const apiCall = async (apiFunction) => {
    // In dev mode, just simulate loading
    if (DEV_MODE) {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 500);
      return;
    }
    
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
    
    // In dev mode, return mock status
    if (DEV_MODE) {
      setStatus(MOCK_STATUS);
      return;
    }
    
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
      // In dev mode, use mock data
      if (DEV_MODE) {
        setUser(MOCK_USER);
        setGuilds(MOCK_GUILDS);
        setSelectedGuild(MOCK_GUILDS[0]);
        setInviteUrl('https://discord.com/api/oauth2/authorize?client_id=123456789&permissions=0&scope=bot');
        setControllerRoleName('Bot Controller');
        setStatus(MOCK_STATUS);
        return;
      }
      
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
    if (selectedGuild && !DEV_MODE) {
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
      {DEV_MODE && (
        <div style={{
          background: '#ff6b6b',
          color: 'white',
          padding: '8px',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '0.9rem'
        }}>
          🚧 DEV MODE - Using Mock Data
        </div>
      )}
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
                  {/* Tab Section - Above Playback Status */}
                  <div className="tab-section-container">
                    {/* Tab Navigation */}
                    <div className="tab-navigation">
                      <button
                        className={`tab-button ${activeTab === 'youtube' ? 'active' : ''}`}
                        onClick={() => setActiveTab('youtube')}
                      >
                        YouTube
                      </button>
                      <button
                        className={`tab-button ${activeTab === 's3' ? 'active' : ''}`}
                        onClick={() => setActiveTab('s3')}
                      >
                        Library
                      </button>
                    </div>

                    {/* Tab Content */}
                    <div className="tab-content-panel">
                      {activeTab === 'youtube' ? (
                        <YouTubeInput
                          guildId={selectedGuild.id}
                          playMode={playMode}
                          onPlayModeChange={setPlayMode}
                          onApiCall={apiCall}
                          isLoading={isLoading}
                          canControl={status.canControl}
                        />
                      ) : (
                        <S3FileBrowser
                          guildId={selectedGuild.id}
                          onApiCall={apiCall}
                          canControl={status.canControl}
                          playMode={playMode}
                          onPlayModeChange={setPlayMode}
                        />
                      )}
                    </div>
                  </div>

                  {/* Player Controls and Playback Status - Combined Section */}
                  <div className="playback-status-container">
                    <PlayerControls 
                      guildId={selectedGuild.id} 
                      playerStatus={status.playerStatus}
                      loopMode={status.loopMode}
                      volume={status.volume}
                      isLoading={isLoading}
                      onApiCall={apiCall}
                      canControl={status.canControl}
                    />
                    <PlaybackStatus 
                      guildId={selectedGuild.id}
                      status={{...status, isLoading}}
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
