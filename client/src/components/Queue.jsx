import PlaybackStatus from './PlaybackStatus';
import './Queue.css';

function Queue({ guildId, status, onApiCall, canControl }) {
  return (
    <div className="queue-container">
      <PlaybackStatus 
        guildId={guildId}
        status={status}
        onApiCall={onApiCall}
        canControl={canControl}
      />
    </div>
  );
}

export default Queue;
