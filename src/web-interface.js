const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const MusicManager = require('./utils/musicManager');

// SFX manifest is now embedded in the code to avoid filesystem issues in containers.
const SFX_MANIFEST = [
  {
    "id": "SFX_TURN_OFF_PC",
    "name": "PC Turn Off"
  },
  {
    "id": "SFX_TURN_ON_PC",
    "name": "PC Turn On"
  }
];

class WebInterface {
  constructor(client) {
    this.client = client;
    this.app = express();
    this.musicManager = client.musicManager;
    
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));
  }
  
  setupRoutes() {
    // API endpoints for bot control
    
    // Get bot status
    this.app.get('/api/status', (req, res) => {
      res.json({
        status: 'online',
        guilds: this.client.guilds.cache.size,
        users: this.client.users.cache.size,
        uptime: this.client.uptime
      });
    });
    
    // Get music status for a specific guild
    this.app.get('/api/music/:guildId', (req, res) => {
      const { guildId } = req.params;
      
      const nowPlaying = this.musicManager.getNowPlaying(guildId);
      const queue = this.musicManager.getQueue(guildId);
      const isConnected = this.musicManager.connections.has(guildId);
      
      res.json({
        connected: isConnected,
        nowPlaying,
        queue,
        queueLength: queue.length
      });
    });
    
    // Play music command (now with modes)
    this.app.post('/api/music/:guildId/play', async (req, res) => {
      try {
        const { guildId } = req.params;
        const { query, mode = 'queue' } = req.body; // Default to 'queue'
        
        if (!query) {
          return res.status(400).json({ error: 'Query is required' });
        }
        
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
          return res.status(404).json({ error: 'Guild not found' });
        }
        
        // Find a voice channel to join if not connected
        if (!this.musicManager.connections.has(guildId)) {
          const voiceChannel = guild.channels.cache.find(c => c.type === 2);
          if (!voiceChannel) {
            return res.status(400).json({ error: 'No voice channels found to join.' });
          }
          const mockInteraction = { guildId, guild, member: { voice: { channel: voiceChannel } } };
          await this.musicManager.joinVoiceChannel(mockInteraction);
        }

        const track = await this.musicManager.getTrackInfo(query);
        if (!track) {
          return res.status(404).json({ error: 'No track found for your query.' });
        }
        
        const wasPlaying = this.musicManager.getNowPlaying(guildId);

        let message = '';
        if (mode === 'next') {
          this.musicManager.addToQueueFront(guildId, track);
          message = `Added to front of queue: ${track.title}`;
        } else if (mode === 'now') {
          this.musicManager.addToQueueFront(guildId, track);
          if (wasPlaying) {
            this.musicManager.skipTrack(guildId);
          }
          message = `Now playing: ${track.title}`;
        } else { // mode === 'queue'
          this.musicManager.addToQueue(guildId, track);
          message = `Added to queue: ${track.title}`;
        }

        // If nothing was playing, start the playback loop
        if (!wasPlaying) {
          await this.musicManager.playNext(guildId);
        }
        
        res.json({ success: true, message, track });
        
      } catch (error) {
        console.error('Web API play error:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Stop music command
    this.app.post('/api/music/:guildId/stop', async (req, res) => {
      try {
        const { guildId } = req.params;
        
        if (this.musicManager.connections.has(guildId)) {
          await this.musicManager.leaveVoiceChannel(guildId);
          res.json({ success: true, message: 'Music stopped' });
        } else {
          res.status(400).json({ error: 'Not connected to voice channel' });
        }
        
      } catch (error) {
        console.error('Web API stop error:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Skip track command
    this.app.post('/api/music/:guildId/skip', async (req, res) => {
      try {
        const { guildId } = req.params;
        
        if (this.musicManager.connections.has(guildId)) {
          const skipped = this.musicManager.skipTrack(guildId);
          if (skipped) {
            res.json({ success: true, message: 'Track skipped' });
          } else {
            res.status(400).json({ error: 'Failed to skip track' });
          }
        } else {
          res.status(400).json({ error: 'Not connected to voice channel' });
        }
        
      } catch (error) {
        console.error('Web API skip error:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Get available sound effects from the manifest
    this.app.get('/api/sfx', async (req, res) => {
      try {
        // The manifest is now an in-memory constant.
        res.json(SFX_MANIFEST);
      } catch (error) {
        console.error('Error serving SFX manifest:', error);
        res.status(500).json({ error: 'Could not retrieve sound effects.' });
      }
    });

    // Play sound effect command
    this.app.post('/api/music/:guildId/sfx', async (req, res) => {
      try {
        const { guildId } = req.params;
        const { effect } = req.body;
        const sfxBaseUrl = process.env.SFX_BASE_URL;

        if (!sfxBaseUrl) {
          const errorMessage = 'SFX_BASE_URL is not configured on the server.';
          console.error(`Web API sfx error: ${errorMessage}`);
          return res.status(500).json({ error: errorMessage });
        }
        if (!effect) {
          return res.status(400).json({ error: 'Effect is required' });
        }
        
        // Construct the full URL. We assume a .mp3 extension for simplicity.
        // A more advanced system could store extensions in the manifest.
        const sfxUrl = `${sfxBaseUrl.replace(/\/$/, '')}/${effect}.mp3`;

        // Find the guild
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
          return res.status(404).json({ error: 'Guild not found' });
        }
        
        // Create a mock interaction for the music manager
        const mockInteraction = {
          guildId,
          guild,
          member: { voice: { channel: guild.channels.cache.find(c => c.type === 2) } }
        };
        
        // Join voice channel
        await this.musicManager.joinVoiceChannel(mockInteraction);
        
        // Create sound effect track
        const sfxTrack = {
          title: `SFX: ${effect.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
          url: sfxUrl,
          author: 'Soundboard',
        };
        
        // Playskip the sound effect
        this.musicManager.addToQueueFront(guildId, sfxTrack);
        if (this.musicManager.getNowPlaying(guildId)) {
          this.musicManager.skipTrack(guildId);
        } else {
          await this.musicManager.playNext(guildId);
        }
        
        res.json({ success: true, track: sfxTrack });
        
      } catch (error) {
        console.error('Web API sfx error:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Pause/Resume command
    this.app.post('/api/music/:guildId/pause', async (req, res) => {
      try {
        const { guildId } = req.params;
        const result = this.musicManager.togglePause(guildId);
        if (result === 'paused' || result === 'resumed') {
          res.json({ success: true, status: result });
        } else {
          res.status(400).json({ error: 'Cannot pause/resume. Player is not in the correct state.' });
        }
      } catch (error) {
        console.error('Web API pause error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Previous track command
    this.app.post('/api/music/:guildId/previous', async (req, res) => {
      try {
        const { guildId } = req.params;
        const success = await this.musicManager.playPrevious(guildId);
        if (success) {
          res.json({ success: true, message: 'Playing previous track.' });
        } else {
          res.status(404).json({ error: 'No previous track to play.' });
        }
      } catch (error) {
        console.error('Web API previous error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Remove a track from the queue
    this.app.delete('/api/music/:guildId/queue/:trackIndex', async (req, res) => {
      try {
        const { guildId, trackIndex } = req.params;
        const index = parseInt(trackIndex, 10);

        if (isNaN(index) || index < 0) {
          return res.status(400).json({ error: 'Invalid track index.' });
        }
        
        const removedTrack = this.musicManager.removeTrack(guildId, index);

        if (removedTrack) {
          res.json({ success: true, message: `Removed "${removedTrack.title}" from the queue.` });
        } else {
          res.status(404).json({ error: 'Track not found in queue at that index.' });
        }
      } catch (error) {
        console.error('Web API remove track error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Clear the entire queue
    this.app.delete('/api/music/:guildId/queue', async (req, res) => {
      try {
        const { guildId } = req.params;
        const success = this.musicManager.clearQueue(guildId);
        if (success) {
          res.json({ success: true, message: 'Queue cleared.' });
        } else {
          // This might happen if there was no queue to begin with, which is fine.
          res.json({ success: true, message: 'Queue was already empty.' });
        }
      } catch (error) {
        console.error('Web API clear queue error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Clear the history
    this.app.delete('/api/music/:guildId/history', async (req, res) => {
      try {
        const { guildId } = req.params;
        const success = this.musicManager.clearHistory(guildId);
        if (success) {
          res.json({ success: true, message: 'History cleared.' });
        } else {
          res.json({ success: true, message: 'History was already empty.' });
        }
      } catch (error) {
        console.error('Web API clear history error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Play a specific track from the queue
    this.app.post('/api/music/:guildId/queue/play/:trackIndex', async (req, res) => {
      try {
        const { guildId, trackIndex } = req.params;
        const index = parseInt(trackIndex, 10);

        if (isNaN(index)) {
          return res.status(400).json({ error: 'Invalid track index.' });
        }

        // Move the track to the front
        const moveSuccess = this.musicManager.moveTrack(guildId, index, 0);
        if (!moveSuccess) {
          return res.status(404).json({ error: 'Track not found at that index.' });
        }

        // Skip the current song to play the new one
        this.musicManager.skipTrack(guildId);

        res.json({ success: true, message: 'Playing selected track.' });
      } catch (error) {
        console.error('Web API play from queue error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get available guilds
    this.app.get('/api/guilds', (req, res) => {
      const guilds = this.client.guilds.cache.map(guild => ({
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        icon: guild.iconURL()
      }));
      
      res.json(guilds);
    });
    
    // Join voice channel command
    this.app.post('/api/music/:guildId/join', async (req, res) => {
      try {
        const { guildId } = req.params;
        
        // Find the guild
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
          return res.status(404).json({ error: 'Guild not found' });
        }
        
        // Find first voice channel in the guild
        const voiceChannel = guild.channels.cache.find(c => c.type === 2);
        if (!voiceChannel) {
          return res.status(400).json({ error: 'No voice channels found in this server' });
        }
        
        // Create a mock interaction for the music manager
        const mockInteraction = {
          guildId,
          guild,
          member: { voice: { channel: voiceChannel } }
        };
        
        // Join voice channel
        await this.musicManager.joinVoiceChannel(mockInteraction);
        
        res.json({
          success: true,
          message: `Joined voice channel: ${voiceChannel.name}`,
          channel: voiceChannel.name
        });
        
      } catch (error) {
        console.error('Web API join error:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Leave voice channel command
    this.app.post('/api/music/:guildId/leave', async (req, res) => {
      try {
        const { guildId } = req.params;
        
        if (this.musicManager.connections.has(guildId)) {
          await this.musicManager.leaveVoiceChannel(guildId);
          res.json({ success: true, message: 'Left voice channel' });
        } else {
          res.status(400).json({ error: 'Not connected to voice channel' });
        }
        
      } catch (error) {
        console.error('Web API leave error:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Get voice status
    this.app.get('/api/music/:guildId/status', (req, res) => {
      try {
        const { guildId } = req.params;
        
        const isConnected = this.musicManager.connections.has(guildId);
        const nowPlaying = this.musicManager.getNowPlaying(guildId);
        const queue = this.musicManager.getQueue(guildId);
        const previousTracks = this.musicManager.previousTracks.get(guildId) || [];
        const player = this.musicManager.players.get(guildId);
        
        let connectionInfo = null;
        if (isConnected) {
          const connection = this.musicManager.connections.get(guildId);
          const channel = this.client.guilds.cache.get(guildId)?.channels.cache.get(connection.joinConfig.channelId);
          connectionInfo = {
            channelName: channel?.name || 'Unknown',
            status: connection.state.status
          };
        }
        
        res.json({
          connected: isConnected,
          playerStatus: player?.state.status || 'idle',
          playbackDuration: player?.state.status === 'playing' ? player.state.playbackDuration : 0,
          loopMode: this.musicManager.loopModes.get(guildId) || 'none',
          volume: this.musicManager.getVolume(guildId),
          connectionInfo,
          nowPlaying,
          queue,
          previousTracks,
          queueLength: queue.length
        });
        
      } catch (error) {
        console.error('Web API status error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Set loop mode command
    this.app.post('/api/music/:guildId/loop', async (req, res) => {
      try {
        const { guildId } = req.params;
        const { mode } = req.body;
        
        const success = this.musicManager.setLoopMode(guildId, mode);
        
        if (success) {
          res.json({ success: true, message: `Loop mode set to ${mode}` });
        } else {
          res.status(400).json({ error: 'Invalid loop mode specified.' });
        }
      } catch (error) {
        console.error('Web API loop error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Set volume command
    this.app.post('/api/music/:guildId/volume', async (req, res) => {
      try {
        const { guildId } = req.params;
        const { level } = req.body;

        if (level === undefined || level < 0 || level > 200) {
          return res.status(400).json({ error: 'Invalid volume level specified.' });
        }

        const success = this.musicManager.setVolume(guildId, level);

        if (success) {
          res.json({ success: true, message: `Volume set to ${level}%` });
        } else {
          res.status(400).json({ error: 'Could not set volume. Is a track playing?' });
        }
      } catch (error) {
        console.error('Web API volume error:', error);
        res.status(500).json({ error: error.message });
      }
    });
  }
  
  getSoundEffectUrl(effect) {
    const sfxUrls = {
      'party_horn': 'https://example.com/sounds/party_horn.mp3',
      'applause': 'https://example.com/sounds/applause.mp3',
      'bell': 'https://example.com/sounds/bell.mp3',
      'alert': 'https://example.com/sounds/alert.mp3',
      'drum_roll': 'https://example.com/sounds/drum_roll.mp3',
      'fanfare': 'https://example.com/sounds/fanfare.mp3',
      'notification': 'https://example.com/sounds/notification.mp3',
      'celebration': 'https://example.com/sounds/celebration.mp3'
    };
    
    return sfxUrls[effect] || sfxUrls['bell'];
  }
  
  // Helper method to check if a string is a YouTube URL
  isYouTubeUrl(query) {
    const youtubePatterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=/,
      /^https?:\/\/youtu\.be\//,
      /^https?:\/\/(www\.)?youtube\.com\/embed\//,
      /^https?:\/\/(www\.)?youtube\.com\/v\//
    ];
    
    return youtubePatterns.some(pattern => pattern.test(query));
  }
  
  start(port = 3001) {
    this.app.listen(port, () => {
      console.log(`🌐 Web interface listening on port ${port}`);
    });
  }
}

module.exports = WebInterface;
