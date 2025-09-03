import React from 'react';
import './ProgressBar.css';

function ProgressBar({ current, total }) {
  const progressPercent = total > 0 ? (current / total) * 100 : 0;

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="progress-bar-container">
      <div className="times">
        <span>{formatTime(current)}</span>
        <span>{formatTime(total)}</span>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>
    </div>
  );
}

export default ProgressBar;
