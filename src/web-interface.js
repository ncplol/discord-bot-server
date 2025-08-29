const express = require('express');
const path = require('path');
const MusicManager = require('./utils/musicManager');

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
    
    // Play music command
    this.app.post('/api/music/:guildId/play', async (req, res) => {
      try {
        const { guildId } = req.params;
        const { query } = req.body;
        
        if (!query) {
          return res.status(400).json({ error: 'Query is required' });
        }
        
        // Find the guild
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
          return res.status(404).json({ error: 'Guild not found' });
        }
        
        // Create a mock interaction for the music manager
        const mockInteraction = {
          guildId,
          guild,
          member: { voice: { channel: guild.channels.cache.find(c => c.type === 2) } } // Find first voice channel
        };
        
        // Join voice channel
        await this.musicManager.joinVoiceChannel(mockInteraction);
        
        let track;
        
        // Check if it's a URL or search query
        if (this.isYouTubeUrl(query)) {
          track = await this.musicManager.getTrackInfo(query);
        } else {
          const results = await this.musicManager.searchTracks(query, 1);
          if (results.length === 0) {
            return res.status(404).json({ error: 'No tracks found' });
          }
          track = results[0];
        }
        
        // Add to queue and play
        const queuePosition = await this.musicManager.addToQueue(guildId, track);
        
        if (queuePosition === 1) {
          await this.musicManager.playTrack(guildId, track);
        }
        
        res.json({
          success: true,
          track,
          queuePosition,
          message: queuePosition === 1 ? 'Now playing' : 'Added to queue'
        });
        
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
    
    // Play sound effect command
    this.app.post('/api/music/:guildId/sfx', async (req, res) => {
      try {
        const { guildId } = req.params;
        const { effect } = req.body;
        
        if (!effect) {
          return res.status(400).json({ error: 'Effect is required' });
        }
        
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
          title: `Sound Effect: ${effect.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
          url: this.getSoundEffectUrl(effect),
          duration: 5,
          author: 'Sound Effect',
          thumbnail: null
        };
        
        // Play the sound effect immediately
        await this.musicManager.playTrack(guildId, sfxTrack);
        
        res.json({
          success: true,
          track: sfxTrack,
          message: 'Sound effect playing'
        });
        
      } catch (error) {
        console.error('Web API sfx error:', error);
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
          connectionInfo,
          nowPlaying,
          queue,
          queueLength: queue.length
        });
        
      } catch (error) {
        console.error('Web API status error:', error);
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
