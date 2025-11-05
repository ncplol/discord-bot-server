import { useState } from 'react';
import './YouTubeInput.css';

function YouTubeInput({ guildId, playMode, onPlayModeChange, onApiCall, isLoading, canControl }) {
  const [query, setQuery] = useState('');

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
    <div className="youtube-input-container">
      <form onSubmit={handleAddSong} className="add-song-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter YouTube URL or search..."
          disabled={isLoading || !canControl}
        />
        <button type="submit" disabled={isLoading || !canControl}>Add Song</button>
      </form>
      <div className="play-mode-selector">
        <label>
          <input 
            type="radio" 
            value="queue" 
            checked={playMode === 'queue'} 
            onChange={() => onPlayModeChange('queue')} 
            disabled={isLoading || !canControl} 
          />
          Add to Queue
        </label>
        <label>
          <input 
            type="radio" 
            value="next" 
            checked={playMode === 'next'} 
            onChange={() => onPlayModeChange('next')} 
            disabled={!canControl} 
          />
          Play Next
        </label>
        <label>
          <input 
            type="radio" 
            value="now" 
            checked={playMode === 'now'} 
            onChange={() => onPlayModeChange('now')} 
            disabled={!canControl} 
          />
          Play Now
        </label>
      </div>
    </div>
  );
}

export default YouTubeInput;

