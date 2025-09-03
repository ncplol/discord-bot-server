import { useState, useEffect } from 'react';
import Soundboard from './components/Soundboard';
import Queue from './components/Queue';
import ConnectionManager from './components/ConnectionManager';
import './App.css';

function App() {
  const [guilds, setGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [status, setStatus] = useState({ connected: false, queue: [], previousTracks: [] });
  const [isLoading, setIsLoading] = useState(false);

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
      const response = await fetch(`/api/music/${guildId}/status`);
      if (!response.ok) throw new Error('Failed to fetch status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error fetching status:', error);
      // On error, reset to a disconnected state
      setStatus({ connected: false, queue: [], previousTracks: [] });
    }
  };
  
  // Effect to fetch guilds on initial load
  useEffect(() => {
    // Fetch the list of guilds the bot is in
    const fetchGuilds = async () => {
      try {
        const response = await fetch('/api/guilds');
        if (!response.ok) {
          throw new Error('Failed to fetch guilds');
        }
        const data = await response.json();
        setGuilds(data);
        // Automatically select the first guild
        if (data.length > 0) {
          setSelectedGuild(data[0]);
        }
      } catch (error) {
        console.error('Error fetching guilds:', error);
      }
    };

    fetchGuilds();
  }, []);

  // Effect to poll for status updates for the selected guild
  useEffect(() => {
    if (selectedGuild) {
      fetchStatus(selectedGuild.id);
      const interval = setInterval(() => fetchStatus(selectedGuild.id), 2000);
      return () => clearInterval(interval);
    }
  }, [selectedGuild]);


  return (
    <div className="App">
      <header className="App-header">
        <div className="header-title">
          <img src="/favicon.svg" alt="Bot Icon" className="header-logo" />
          <h1>Bard Bot Control Panel</h1>
        </div>
        {guilds.length > 0 && (
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
        )}
      </header>

      {selectedGuild && (
        <main className="main-content">
          <ConnectionManager 
            guildId={selectedGuild.id} 
            isConnected={status.connected} 
            onConnectionChange={() => fetchStatus(selectedGuild.id)} 
          />

          {status.connected ? (
            <div className="panels">
              <div className="panel soundboard-panel">
                <Soundboard guildId={selectedGuild.id} />
              </div>
              <div className="panel queue-panel">
                <Queue 
                  guildId={selectedGuild.id} 
                  status={{...status, isLoading}} 
                  volume={status.volume}
                  onApiCall={apiCall} 
                />
              </div>
            </div>
          ) : (
            <p className="status-message">Bot is not in a voice channel. Click "Join Channel" to start.</p>
          )}
        </main>
      )}
    </div>
  );
}

export default App;
