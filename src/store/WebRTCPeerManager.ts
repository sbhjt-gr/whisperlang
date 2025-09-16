import {MediaStream, RTCPeerConnection} from 'react-native-webrtc';
import {User} from './WebRTCTypes';
import {ICE_SERVERS} from './WebRTCConfig';
import {WebRTCSocketManager} from './WebRTCSocketManager';
import {WebRTCSignalingHandler} from './WebRTCSignalingHandler';

export class WebRTCPeerManager {
  private peerConnections = new Map<string, RTCPeerConnection>();
  private localStream: MediaStream | null = null;
  private remoteStreams = new Map<string, MediaStream>();
  private socketManager: WebRTCSocketManager;
  private signalingHandler: WebRTCSignalingHandler;
  private peerId: string = '';
  private currentMeetingId: string | null = null;
  
  private onRemoteStreamAdded?: (peerId: string, stream: MediaStream) => void;
  private onConnectionStateChanged?: (peerId: string, state: string) => void;
  private onParticipantUpdated?: (peerId: string, updates: Partial<User>) => void;

  constructor(socketManager: WebRTCSocketManager) {
    this.socketManager = socketManager;
    this.signalingHandler = new WebRTCSignalingHandler(socketManager, this.peerConnections);
  }

  setCallbacks(callbacks: {
    onRemoteStreamAdded?: (peerId: string, stream: MediaStream) => void;
    onConnectionStateChanged?: (peerId: string, state: string) => void;
    onParticipantUpdated?: (peerId: string, updates: Partial<User>) => void;
  }) {
    this.onRemoteStreamAdded = callbacks.onRemoteStreamAdded;
    this.onConnectionStateChanged = callbacks.onConnectionStateChanged;
    this.onParticipantUpdated = callbacks.onParticipantUpdated;
  }

  setLocalStream(stream: MediaStream) {
    this.localStream = stream;
  }

  setPeerId(peerId: string) {
    this.peerId = peerId;
    this.signalingHandler.setPeerId(peerId);
  }

  setMeetingId(meetingId: string) {
    this.currentMeetingId = meetingId;
    this.signalingHandler.setMeetingId(meetingId);
  }

  createPeerConnection(user: User, isInitiator: boolean): RTCPeerConnection | null {
    console.log('\n=== CREATE PEER CONNECTION ===');
    console.log('Creating peer connection for:', user.username);
    console.log('User peer ID:', user.peerId);
    console.log('Is initiator:', isInitiator);
    console.log('Current meeting ID:', this.currentMeetingId);
    console.log('Local stream available:', !!this.localStream);
    console.log('Local stream tracks:', this.localStream?.getTracks().length || 0);
    
    if (!user.peerId) {
      console.error('Cannot create peer connection: user has no peer ID');
      return null;
    }

    // Check if we already have a connection for this user
    const existingPc = this.peerConnections.get(user.peerId);
    if (existingPc) {
      console.log('Existing peer connection found for:', user.username);
      console.log('Existing connection state:', existingPc.connectionState);
      
      // Only reuse if connection is in good state
      if (existingPc.connectionState === 'connected' || 
          existingPc.connectionState === 'connecting' ||
          existingPc.connectionState === 'new') {
        console.log('Reusing existing connection in good state:', existingPc.connectionState);
        return existingPc;
      } else {
        console.log('Closing existing connection in bad state:', existingPc.connectionState);
        existingPc.close();
        this.peerConnections.delete(user.peerId);
      }
    }

    // Create new peer connection
    const pc = new RTCPeerConnection(ICE_SERVERS);
    console.log('✅ Created new RTCPeerConnection for:', user.username);
    
    this.peerConnections.set(user.peerId, pc);
    console.log('📋 Stored peer connection. Total connections:', this.peerConnections.size);

    // Add local stream to connection
    this.addLocalTracksToConnection(pc, user);
    
    // Setup event handlers
    this.setupPeerConnectionEvents(pc, user);
    
    // Create offer if we're the initiator
    if (isInitiator) {
      console.log(`📞 Creating offer for ${user.username} (initiator: true)`);
      this.signalingHandler.createAndSendOffer(pc, user);
    } else {
      console.log(`⏳ Waiting to receive offer from ${user.username} (initiator: false)`);
    }
    
    return pc;
  }

  private addLocalTracksToConnection(pc: RTCPeerConnection, user: User) {
    if (!this.localStream) {
      console.warn(`No local stream to add to connection for ${user.username}`);
      return;
    }

    console.log(`🎵 Adding local tracks to connection for ${user.username}`);
    
    // Add all tracks from the local stream
    this.localStream.getTracks().forEach((track, index) => {
      console.log(`   Track ${index + 1}: ${track.kind} (enabled: ${track.enabled})`);
      try {
        const sender = pc.addTrack(track, this.localStream!);
        console.log(`   ✅ Added ${track.kind} track successfully`);
      } catch (error) {
        console.error(`   ❌ Error adding ${track.kind} track:`, error);
      }
    });
    
    console.log(`✅ Finished adding local tracks for ${user.username}`);
  }

  private setupPeerConnectionEvents(pc: RTCPeerConnection, user: User) {
    console.log(`🔧 Setting up event handlers for ${user.username}`);

    pc.addEventListener('track', (event: any) => {
      console.log(`📺 Received remote track from ${user.username}:`, event.track.kind);
      this.handleRemoteTrack(event, user);
    });

    pc.addEventListener('icecandidate', (event: any) => {
      if (event.candidate && this.currentMeetingId) {
        console.log(`🧊 Sending ICE candidate to ${user.username}`);
        this.socketManager.sendIceCandidate(event.candidate, user.peerId);
      }
    });

    pc.addEventListener('connectionstatechange', () => {
      const state = pc.connectionState;
      console.log(`🔗 Connection state changed for ${user.username}: ${state}`);
      
      if (this.onConnectionStateChanged) {
        this.onConnectionStateChanged(user.peerId, state);
      }

      if (state === 'connected') {
        console.log(`🎉 Connection established with ${user.username}!`);
      } else if (state === 'failed') {
        console.log(`💔 Connection failed for ${user.username} - attempting to restart ICE`);
        // Attempt ICE restart
        pc.restartIce();
        
        // Clean up after a delay if still failed
        setTimeout(() => {
          if (pc.connectionState === 'failed') {
            console.log(`�️ Cleaning up failed connection for ${user.username}`);
            this.remoteStreams.delete(user.peerId);
          }
        }, 5000);
      } else if (state === 'closed') {
        console.log(`🚪 Connection closed for ${user.username} - cleaning up`);
        this.remoteStreams.delete(user.peerId);
      }
    });

    pc.addEventListener('iceconnectionstatechange', () => {
      const state = pc.iceConnectionState;
      console.log(`❄️  ICE connection state for ${user.username}: ${state}`);
      
      if (state === 'connected' || state === 'completed') {
        console.log(`🎯 ICE connection successful for ${user.username}`);
      } else if (state === 'failed') {
        console.log(`❌ ICE connection failed for ${user.username}`);
      }
    });

    pc.addEventListener('icegatheringstatechange', () => {
      console.log(`🔍 ICE gathering state for ${user.username}: ${pc.iceGatheringState}`);
    });

    pc.addEventListener('signalingstatechange', () => {
      console.log(`📡 Signaling state for ${user.username}: ${pc.signalingState}`);
    });

    console.log(`✅ Event handlers setup completed for ${user.username}`);
  }

  private handleRemoteTrack(event: any, user: User) {
    console.log(`\n=== REMOTE TRACK RECEIVED ===`);
    console.log(`From: ${user.username} (${user.peerId})`);
    console.log(`Track kind: ${event.track.kind}`);
    console.log(`Track ID: ${event.track.id}`);
    console.log(`Track enabled: ${event.track.enabled}`);
    console.log(`Track readyState: ${event.track.readyState}`);
    console.log(`Streams count: ${event.streams?.length || 0}`);
    
    if (!event.streams || event.streams.length === 0) {
      console.warn(`⚠️  No streams in track event from ${user.username}`);
      return;
    }

    const remoteStream = event.streams[0];
    console.log(`📺 Remote stream ID: ${remoteStream.id}`);
    console.log(`📺 Remote stream tracks: ${remoteStream.getTracks().length}`);
    
    // Log all tracks in the stream with detailed info
    remoteStream.getTracks().forEach((track: any, index: number) => {
      console.log(`   Track ${index + 1}: ${track.kind} (enabled: ${track.enabled}, readyState: ${track.readyState})`);
      
      // Add track event listeners for debugging
      track.addEventListener('ended', () => {
        console.log(`🛑 Track ended from ${user.username}: ${track.kind}`);
      });
      
      track.addEventListener('mute', () => {
        console.log(`🔇 Track muted from ${user.username}: ${track.kind}`);
      });
      
      track.addEventListener('unmute', () => {
        console.log(`🔊 Track unmuted from ${user.username}: ${track.kind}`);
      });
    });

    // Verify we have at least one video track
    const videoTracks = remoteStream.getVideoTracks();
    const audioTracks = remoteStream.getAudioTracks();
    console.log(`📹 Video tracks: ${videoTracks.length}, Audio tracks: ${audioTracks.length}`);

    // Store the remote stream
    const existingStream = this.remoteStreams.get(user.peerId);
    if (existingStream && existingStream.id === remoteStream.id) {
      console.log(`🔄 Stream already exists for ${user.username}, not updating`);
      return;
    }

    console.log(`💾 Storing remote stream for ${user.username}`);
    this.remoteStreams.set(user.peerId, remoteStream);
    
    // Notify the callback
    if (this.onRemoteStreamAdded) {
      console.log(`📢 Notifying callback of new remote stream from ${user.username}`);
      this.onRemoteStreamAdded(user.peerId, remoteStream);
    }

    console.log(`✅ Remote track handling completed for ${user.username}`);
    console.log(`📊 Total remote streams: ${this.remoteStreams.size}`);
  }

  // Signaling method delegates
  async handleOffer(data: any): Promise<void> {
    return this.signalingHandler.handleOffer(data);
  }

  async handleAnswer(data: any): Promise<void> {
    return this.signalingHandler.handleAnswer(data);
  }

  async handleIceCandidate(data: any): Promise<void> {
    return this.signalingHandler.handleIceCandidate(data);
  }

  // Utility methods
  getPeerConnection(peerId: string): RTCPeerConnection | undefined {
    return this.peerConnections.get(peerId);
  }

  getRemoteStream(peerId: string): MediaStream | undefined {
    return this.remoteStreams.get(peerId);
  }

  getAllRemoteStreams(): Map<string, MediaStream> {
    return new Map(this.remoteStreams);
  }

  closePeerConnection(peerId: string): void {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      console.log('Closing peer connection for:', peerId);
      pc.close();
      this.peerConnections.delete(peerId);
      this.remoteStreams.delete(peerId);
    }
  }

  closeAllConnections(): void {
    console.log('Closing all peer connections');
    this.peerConnections.forEach((pc, peerId) => {
      console.log('Closing connection for:', peerId);
      pc.close();
    });
    this.peerConnections.clear();
    this.remoteStreams.clear();
  }

  getConnectionCount(): number {
    return this.peerConnections.size;
  }

  getActiveConnections(): string[] {
    const active: string[] = [];
    this.peerConnections.forEach((pc, peerId) => {
      if (pc.connectionState === 'connected') {
        active.push(peerId);
      }
    });
    return active;
  }
}
