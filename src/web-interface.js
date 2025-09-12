const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const MusicManager = require('./utils/musicManager');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const cors = require('cors');

// SFX manifest is now embedded in the code to avoid filesystem issues in containers.
const SFX_MANIFEST = [
  {
    "id": "SFX_TURN_OFF_PC",
    "name": "PC Turn Off",
    "format": "wav"
  },
  {
    "id": "SFX_TURN_ON_PC",
    "name": "PC Turn On",
    "format": "wav"
  }
];

class WebInterface {
  constructor(client) {
    this.client = client;
    this.app = express();
    this.musicManager = client.musicManager;
    this.sfxManifestCache = null; // Cache for the SFX manifest
    this.sfxCacheTimestamp = null; // Timestamp for the cache
    
    this.setupAuth();
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  setupAuth() {
    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((obj, done) => done(null, obj));

    passport.use(new DiscordStrategy({
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackURL: process.env.DISCORD_CALLBACK_URL,
      scope: ['identify', 'guilds']
    }, (accessToken, refreshToken, profile, done) => {
      process.nextTick(() => done(null, profile));
    }));
  }

  setupMiddleware() {
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true
    }));
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));
    
    this.app.use(session({
      secret: process.env.SESSION_SECRET || 'secret',
      resave: false,
      saveUninitialized: false,
    }));

    this.app.use(passport.initialize());
    this.app.use(passport.session());
  }
  
  ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: 'Not authenticated' });
  }

  async ensureUserHasRole(req, res, next) {
    const controllerRoleName = process.env.CONTROLLER_ROLE_NAME;
    if (!controllerRoleName) {
      return next(); // If no role is set, allow the action
    }

    try {
      const guildId = req.params.guildId;
      const userId = req.user.id;

      const guild = await this.client.guilds.fetch(guildId);
      const member = await guild.members.fetch(userId);

      if (member.roles.cache.some(role => role.name === controllerRoleName)) {
        return next();
      } else {
        res.status(403).json({ error: 'You do not have the required role to perform this action.' });
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      res.status(500).json({ error: 'Could not verify user permissions.' });
    }
  }

  setupRoutes() {
    // Auth routes
    this.app.get('/api/auth/discord', passport.authenticate('discord'));

    this.app.get('/api/auth/discord/callback', passport.authenticate('discord', {
      failureRedirect: `${process.env.FRONTEND_URL}/login-failed`
    }), (req, res) => {
      res.redirect(process.env.FRONTEND_URL || '/'); // Redirect to frontend
    });

    this.app.get('/api/auth/user', (req, res) => {
      res.json(req.user || null);
    });

    this.app.post('/api/auth/logout', (req, res) => {
      req.logout((err) => {
        if (err) {
          return res.status(500).json({ error: 'Logout failed' });
        }
        req.session.destroy(() => {
          res.clearCookie('connect.sid');
          res.json({ success: true, message: 'Logged out' });
        });
      });
    });

    // Invite URL endpoint
    this.app.get('/api/invite', (req, res) => {
      res.json({
        inviteUrl: process.env.OAUTH2_INVITE_URL || null,
        controllerRoleName: process.env.CONTROLLER_ROLE_NAME || null,
      });
    });

    // API endpoints for bot control
    
    // Get bot status
    this.app.get('/api/status', this.ensureAuthenticated, (req, res) => {
      res.json({
        status: 'online',
        guilds: this.client.guilds.cache.size,
        users: this.client.users.cache.size,
        uptime: this.client.uptime
      });
    });
    
    // Get music status for a specific guild
    this.app.get('/api/music/:guildId', this.ensureAuthenticated, (req, res) => {
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
    this.app.post('/api/music/:guildId/play', this.ensureAuthenticated, this.ensureUserHasRole.bind(this), async (req, res) => {
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

        const wasPlaying = this.musicManager.getNowPlaying(guildId);

        if (this.isYouTubePlaylistUrl(query)) {
          const tracks = await this.musicManager.getPlaylistTracks(query);
          if (!tracks || tracks.length === 0) {
            return res.status(404).json({ error: 'Could not find any videos in the playlist.' });
          }
          
          tracks.forEach(track => this.musicManager.addToQueue(guildId, track));
          
          if (!wasPlaying) {
            await this.musicManager.playNext(guildId);
          }
          
          return res.json({ success: true, message: `Added ${tracks.length} tracks to the queue.` });
        }


        const track = await this.musicManager.getTrackInfo(query);
        if (!track) {
          return res.status(404).json({ error: 'No track found for your query.' });
        }
        
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
    this.app.post('/api/music/:guildId/stop', this.ensureAuthenticated, this.ensureUserHasRole.bind(this), async (req, res) => {
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
    this.app.post('/api/music/:guildId/skip', this.ensureAuthenticated, this.ensureUserHasRole.bind(this), async (req, res) => {
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
    this.app.get('/api/sfx', this.ensureAuthenticated, async (req, res) => {
      const cacheDuration = 5 * 60 * 1000; // 5 minutes in milliseconds

      // Check if cache is valid
      if (this.sfxManifestCache && (Date.now() - this.sfxCacheTimestamp < cacheDuration)) {
        return res.json(this.sfxManifestCache);
      }

      try {
        const sfxBaseUrl = process.env.SFX_BASE_URL;
        if (!sfxBaseUrl) {
          throw new Error('SFX_BASE_URL is not configured.');
        }

        const manifestUrl = `${sfxBaseUrl.replace(/\/$/, '')}/manifest.json`;
        const response = await fetch(manifestUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch manifest: ${response.statusText}`);
        }

        const manifest = await response.json();

        // Update cache
        this.sfxManifestCache = manifest;
        this.sfxCacheTimestamp = Date.now();

        res.json(manifest);
      } catch (error) {
        console.error('Error fetching or serving SFX manifest:', error);
        // Serve the old cache if available, otherwise send an error
        if (this.sfxManifestCache) {
          res.json(this.sfxManifestCache);
        } else {
          res.status(500).json({ error: 'Could not retrieve sound effects.' });
        }
      }
    });

    // Play sound effect command
    this.app.post('/api/music/:guildId/sfx', this.ensureAuthenticated, this.ensureUserHasRole.bind(this), async (req, res) => {
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
        
        // Ensure the manifest is loaded before proceeding
        if (!this.sfxManifestCache) {
          // You might want to trigger a fetch here or just rely on the client having fetched it.
          // For simplicity, we'll assume the client has already triggered a fetch via the /api/sfx endpoint.
          return res.status(503).json({ error: 'SFX manifest not yet loaded. Please try again in a moment.' });
        }

        // Find the sound effect in the manifest to get its format
        const sfxData = this.sfxManifestCache.find(s => s.id === effect);

        if (!sfxData) {
          return res.status(404).json({ error: 'Sound effect not found in manifest.' });
        }
        
        // Use the format from the manifest, defaulting to mp3 if not specified.
        const format = sfxData.format || 'mp3';
        const sfxUrl = `${sfxBaseUrl.replace(/\/$/, '')}/${effect}.${format}`;

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
          title: `SFX: ${sfxData.name}`,
          url: sfxUrl,
          author: 'Soundboard',
        };
        
        // Plays the SFX, interrupting and resuming if a track is already playing
        await this.musicManager.playSfx(guildId, sfxTrack);
        
        res.json({ success: true, track: sfxTrack });
        
      } catch (error) {
        console.error('Web API sfx error:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Pause/Resume command
    this.app.post('/api/music/:guildId/pause', this.ensureAuthenticated, this.ensureUserHasRole.bind(this), async (req, res) => {
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
    this.app.post('/api/music/:guildId/previous', this.ensureAuthenticated, this.ensureUserHasRole.bind(this), async (req, res) => {
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
    this.app.delete('/api/music/:guildId/queue/:trackIndex', this.ensureAuthenticated, this.ensureUserHasRole.bind(this), async (req, res) => {
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
    this.app.delete('/api/music/:guildId/queue', this.ensureAuthenticated, this.ensureUserHasRole.bind(this), async (req, res) => {
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
    this.app.delete('/api/music/:guildId/history', this.ensureAuthenticated, this.ensureUserHasRole.bind(this), async (req, res) => {
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
    this.app.post('/api/music/:guildId/queue/play/:trackIndex', this.ensureAuthenticated, this.ensureUserHasRole.bind(this), async (req, res) => {
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
    this.app.get('/api/guilds', this.ensureAuthenticated, (req, res) => {
      if (!req.user || !req.user.guilds) {
        return res.status(403).json({ error: 'Could not retrieve guilds for user.' });
      }
      
      const userGuilds = new Set(req.user.guilds.map(g => g.id));
      
      const guilds = this.client.guilds.cache
        .filter(guild => userGuilds.has(guild.id))
        .map(guild => ({
          id: guild.id,
          name: guild.name,
          memberCount: guild.memberCount,
          icon: guild.iconURL()
      }));
      
      res.json(guilds);
    });
    
    // Join voice channel command
    this.app.post('/api/music/:guildId/join', this.ensureAuthenticated, this.ensureUserHasRole.bind(this), async (req, res) => {
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
    this.app.post('/api/music/:guildId/leave', this.ensureAuthenticated, this.ensureUserHasRole.bind(this), async (req, res) => {
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
    this.app.get('/api/music/:guildId/status', this.ensureAuthenticated, async (req, res) => {
      try {
        const { guildId } = req.params;
        const userId = req.user.id;
        const controllerRoleName = process.env.CONTROLLER_ROLE_NAME;
        
        let canControl = false;
        if (controllerRoleName) {
          try {
            const guild = await this.client.guilds.fetch(guildId);
            const member = await guild.members.fetch(userId);
            canControl = member.roles.cache.some(role => role.name === controllerRoleName);
          } catch (error) {
            console.error('Could not check user role for status:', error);
          }
        } else {
          // If no role is set, everyone can control
          canControl = true;
        }

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
          canControl,
          connected: isConnected,
          playerStatus: player?.state.status || 'idle',
          playbackDuration: player?.state.status === 'playing' ? player.state.playbackDuration : 0,
          loopMode: this.musicManager.loopModes.get(guildId) || 'none',
          volume: this.musicManager.getVolume(guildId),
          sfxVolume: this.musicManager.getSfxVolume(guildId),
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
    this.app.post('/api/music/:guildId/loop', this.ensureAuthenticated, this.ensureUserHasRole.bind(this), async (req, res) => {
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
    this.app.post('/api/music/:guildId/volume', this.ensureAuthenticated, this.ensureUserHasRole.bind(this), async (req, res) => {
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

    // Set SFX volume command
    this.app.post('/api/music/:guildId/sfx-volume', this.ensureAuthenticated, this.ensureUserHasRole.bind(this), async (req, res) => {
      try {
        const { guildId } = req.params;
        const { level } = req.body;

        if (level === undefined || level < 0 || level > 200) {
          return res.status(400).json({ error: 'Invalid volume level specified.' });
        }

        this.musicManager.setSfxVolume(guildId, level);
        res.json({ success: true, message: `SFX volume set to ${level}%` });

      } catch (error) {
        console.error('Web API SFX volume error:', error);
        res.status(500).json({ error: error.message });
      }
    });
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
  
  isYouTubePlaylistUrl(query) {
    const playlistPattern = /^https?:\/\/(www\.)?youtube\.com\/playlist\?list=/;
    return playlistPattern.test(query);
  }

  start(port = 3001) {
    this.app.listen(port, () => {
      console.log(`🌐 Web interface listening on port ${port}`);
    });
  }
}

module.exports = WebInterface;
