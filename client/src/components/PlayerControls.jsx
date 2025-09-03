import { useState, useEffect } from 'react';
import './PlayerControls.css';

function PlayerControls({ guildId, playerStatus, loopMode, volume, isLoading, onApiCall }) {
  const [query, setQuery] = useState('');
  const [playMode, setPlayMode] = useState('queue'); // 'queue', 'next', 'now'
  const [currentVolume, setCurrentVolume] = useState(volume);

  useEffect(() => {
    setCurrentVolume(volume);
  }, [volume]);

  const handleAction = (action, method = 'POST') => {
    onApiCall(() => fetch(`/api/music/${guildId}/${action}`, { method }));
  };

  const handleSetLoopMode = (mode) => {
    onApiCall(() => fetch(`/api/music/${guildId}/loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    }));
  };

  const handleVolumeChange = (level) => {
    setCurrentVolume(level);
  };

  const handleVolumeCommit = (level) => {
    onApiCall(() => fetch(`/api/music/${guildId}/volume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: parseInt(level, 10) }),
    }));
  };

  const handleAddSong = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    onApiCall(() => fetch(`/api/music/${guildId}/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, mode: playMode }),
    }));
    setQuery('');
  };

  return (
    <div className={`controls-container ${isLoading ? 'loading' : ''}`}>
      {isLoading && <div className="loading-overlay"><div className="spinner"></div></div>}
      <div className="playback-controls">
        <button onClick={() => handleAction('previous')} disabled={isLoading}>⏮️</button>
        <button onClick={() => handleAction('pause')} disabled={isLoading}>
          {playerStatus === 'playing' ? '⏸️' : '▶️'}
        </button>
        <button onClick={() => handleAction('skip')} disabled={isLoading}>⏭️</button>
      </div>
      <div className="volume-control">
        <span>🔊</span>
        <input 
          type="range" 
          min="0" 
          max="200" 
          value={currentVolume}
          onChange={(e) => handleVolumeChange(e.target.value)}
          onMouseUp={(e) => handleVolumeCommit(e.target.value)}
          onTouchEnd={(e) => handleVolumeCommit(e.target.value)}
          disabled={isLoading}
        />
        <span>{currentVolume}%</span>
      </div>
      <div className="loop-controls">
        <button className={loopMode === 'none' ? 'active' : ''} onClick={() => handleSetLoopMode('none')} disabled={isLoading}>🔁 Off</button>
        <button className={loopMode === 'queue' ? 'active' : ''} onClick={() => handleSetLoopMode('queue')} disabled={isLoading}>🔁 Queue</button>
        <button className={loopMode === 'track' ? 'active' : ''} onClick={() => handleSetLoopMode('track')} disabled={isLoading}>🔂 Track</button>
      </div>
      <form onSubmit={handleAddSong} className="add-song-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter YouTube URL or search..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>Add Song</button>
      </form>
      <div className="play-mode-selector">
        <label>
          <input type="radio" value="queue" checked={playMode === 'queue'} onChange={() => setPlayMode('queue')} disabled={isLoading} />
          Add to Queue
        </label>
        <label>
          <input type="radio" value="next" checked={playMode === 'next'} onChange={() => setPlayMode('next')} />
          Play Next
        </label>
        <label>
          <input type="radio" value="now" checked={playMode === 'now'} onChange={() => setPlayMode('now')} />
          Play Now
        </label>
      </div>
    </div>
  );
}

export default PlayerControls;
