import { useState, useEffect } from 'react';
import './PlayerControls.css';

function PlayerControls({ guildId, playerStatus, loopMode, volume, isLoading, onApiCall, canControl }) {
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

  return (
    <div className={`controls-container ${isLoading ? 'loading' : ''}`}>
      {isLoading && <div className="loading-overlay"><div className="spinner"></div></div>}
      <div className="controls-wrapper">
        <div className="playback-controls">
          <button 
            onClick={() => handleAction('previous')} 
            disabled={isLoading || !canControl}
            className="control-btn secondary"
            title="Previous"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 19 2 12 11 5 11 19"></polygon>
              <line x1="22" y1="5" x2="22" y2="19"></line>
            </svg>
          </button>
          <button 
            onClick={() => handleAction('pause')} 
            disabled={isLoading || !canControl}
            className="control-btn primary"
            title={playerStatus === 'playing' ? 'Pause' : 'Play'}
          >
            {playerStatus === 'playing' ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            )}
          </button>
          <button 
            onClick={() => handleAction('skip')} 
            disabled={isLoading || !canControl}
            className="control-btn secondary"
            title="Next"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 19 22 12 13 5 13 19"></polygon>
              <line x1="2" y1="5" x2="2" y2="19"></line>
            </svg>
          </button>
        </div>
        
        <div className="controls-group">
          <div className="volume-control">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            <input 
              type="range" 
              min="0" 
              max="200" 
              value={currentVolume}
              onChange={(e) => handleVolumeChange(e.target.value)}
              onMouseUp={(e) => handleVolumeCommit(e.target.value)}
              onTouchEnd={(e) => handleVolumeCommit(e.target.value)}
              disabled={isLoading || !canControl}
              className="volume-slider"
            />
            <span className="volume-value">{currentVolume}%</span>
          </div>
          
          <div className="loop-controls">
            <button 
              className={`loop-btn ${loopMode === 'none' ? 'active' : ''}`} 
              onClick={() => handleSetLoopMode('none')} 
              disabled={isLoading || !canControl}
              title="No Loop"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
              <span>Off</span>
            </button>
            <button 
              className={`loop-btn ${loopMode === 'queue' ? 'active' : ''}`} 
              onClick={() => handleSetLoopMode('queue')} 
              disabled={isLoading || !canControl}
              title="Loop Queue"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
              <span>Queue</span>
            </button>
            <button 
              className={`loop-btn ${loopMode === 'track' ? 'active' : ''}`} 
              onClick={() => handleSetLoopMode('track')} 
              disabled={isLoading || !canControl}
              title="Loop Track"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                <polyline points="22 12 16 12 14 18 10 6 8 12 2 12"></polyline>
              </svg>
              <span>Track</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerControls;
