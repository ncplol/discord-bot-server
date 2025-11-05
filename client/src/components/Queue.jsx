import { useState, useEffect, useRef } from 'react';
import PlayerControls from './PlayerControls';
import ProgressBar from './ProgressBar';
import './Queue.css';

function Queue({ guildId, status, volume, onApiCall, canControl, activeTab }) {
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef(null);

  const startProgressTimer = (startTime) => {
    clearInterval(progressIntervalRef.current);
    setProgress(startTime);
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => prev + 1);
    }, 1000);
  };

  const stopProgressTimer = () => {
    clearInterval(progressIntervalRef.current);
  };

  const playFromQueue = (trackIndex) => {
    onApiCall(() => fetch(`/api/music/${guildId}/queue/play/${trackIndex}`, { method: 'POST' }));
  };

  const playTrackNow = (trackUrl) => {
    onApiCall(() => fetch(`/api/music/${guildId}/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: trackUrl, mode: 'now' }),
    }));
  };

  useEffect(() => {
    // Logic to handle song changes and sync progress
    if (status.playerStatus === 'playing' && status.nowPlaying) {
      const serverProgress = Math.floor(status.playbackDuration / 1000);
      // Only restart timer if a new song is playing or if timer is significantly off
      if (!progressIntervalRef.current || Math.abs(serverProgress - progress) > 2) {
        startProgressTimer(serverProgress);
      }
    } else {
      stopProgressTimer();
      setProgress(0);
    }
  }, [status.nowPlaying, status.playerStatus, status.playbackDuration]);

  return (
    <div className="queue-container">
      <PlayerControls 
        guildId={guildId} 
        playerStatus={status.playerStatus}
        loopMode={status.loopMode}
        volume={volume}
        isLoading={status.isLoading}
        onApiCall={onApiCall}
        canControl={canControl}
        activeTab={activeTab}
      />

      <h4>Now Playing</h4>
      {status.nowPlaying ? (
        <div className="track now-playing">
          {status.nowPlaying.thumbnail && (
            <img src={status.nowPlaying.thumbnail} alt={status.nowPlaying.title} className="track-thumbnail" />
          )}
          <div className="track-details">
            <p className="track-title">{status.nowPlaying.title}</p>
            <p className="track-author">{status.nowPlaying.author}</p>
            {status.nowPlaying.album && (
              <p className="track-album">{status.nowPlaying.album}</p>
            )}
            <ProgressBar current={progress} total={status.nowPlaying.duration} />
          </div>
        </div>
      ) : (
        <p>Nothing is playing.</p>
      )}

      <div className="queue-header">
        <h4>Up Next ({(status.queue || []).length})</h4>
        {(status.queue || []).length > 0 && (
          <button 
            className="btn-clear"
            onClick={() => onApiCall(() => fetch(`/api/music/${guildId}/queue`, { method: 'DELETE' }))}
            disabled={status.isLoading || !canControl}
          >
            Clear
          </button>
        )}
      </div>
      <div className="queue-list">
        {(status.queue || []).length > 0 ? (
          (status.queue || []).map((track, index) => (
            <div key={`${track.url}-${index}`} className={`track ${canControl ? 'clickable' : ''}`} onClick={canControl ? () => playFromQueue(index) : undefined}>
              <span className="track-position">{index + 1}.</span>
              <p className="track-title">{track.title}</p>
            </div>
          ))
        ) : (
          <p>The queue is empty.</p>
        )}
      </div>

      <div className="queue-header">
        <h4>History ({(status.previousTracks || []).length})</h4>
        {(status.previousTracks || []).length > 0 && (
          <button 
            className="btn-clear"
            onClick={() => onApiCall(() => fetch(`/api/music/${guildId}/history`, { method: 'DELETE' }))}
            disabled={status.isLoading || !canControl}
          >
            Clear
          </button>
        )}
      </div>
      <div className="queue-list history-list">
        {(status.previousTracks || []).length > 0 ? (
          (status.previousTracks || []).map((track, index) => (
            <div key={`${track.url}-${index}`} className={`track history-track ${canControl ? 'clickable' : ''}`} onClick={canControl ? () => playTrackNow(track.url) : undefined}>
              <span className="track-position">{index + 1}.</span>
              <p className="track-title">{track.title}</p>
            </div>
          ))
        ) : (
          <p>No previously played tracks.</p>
        )}
      </div>
    </div>
  );
}

export default Queue;
