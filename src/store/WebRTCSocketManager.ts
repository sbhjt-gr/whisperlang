import {Alert} from 'react-native';
import {RTCPeerConnection, RTCIceCandidate, RTCSessionDescription} from 'react-native-webrtc';
import socketio from 'socket.io-client';
import {User} from './WebRTCTypes';
import {SERVER_URL, SERVER_URLS, WEBRTC_CONFIG} from './WebRTCConfig';

export class WebRTCSocketManager {
  private socket: any = null;
  private currentMeetingId: string | null = null;
  private peerId: string = '';
  private username: string = '';
  private onUserJoined?: (user: User) => void;
  private onUserLeft?: (user: User) => void;
  private onOfferReceived?: (data: any) => void;
  private onAnswerReceived?: (data: any) => void;
  private onIceCandidateReceived?: (data: any) => void;
  private onMeetingEnded?: () => void;
  private onUsersChange?: (users: User[]) => void;

  setCallbacks(callbacks: {
    onUserJoined?: (user: User) => void;
    onUserLeft?: (user: User) => void;
    onOfferReceived?: (data: any) => void;
    onAnswerReceived?: (data: any) => void;
    onIceCandidateReceived?: (data: any) => void;
    onMeetingEnded?: () => void;
    onUsersChange?: (users: User[]) => void;
  }) {
    this.onUserJoined = callbacks.onUserJoined;
    this.onUserLeft = callbacks.onUserLeft;
    this.onOfferReceived = callbacks.onOfferReceived;
    this.onAnswerReceived = callbacks.onAnswerReceived;
    this.onIceCandidateReceived = callbacks.onIceCandidateReceived;
    this.onMeetingEnded = callbacks.onMeetingEnded;
    this.onUsersChange = callbacks.onUsersChange;
  }

  private async connectWithFallback(urls: string[], username: string): Promise<any> {
    console.log(`Starting WebRTC connection in ${WEBRTC_CONFIG.environment} mode`);
    console.log('Available server URLs:', urls);
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`Attempting to connect to: ${url} (attempt ${i + 1}/${urls.length})`);
      
      try {
        const io = socketio(url, {
          reconnection: true,
          reconnectionAttempts: WEBRTC_CONFIG.reconnectionAttempts,
          reconnectionDelay: WEBRTC_CONFIG.reconnectionDelay,
          autoConnect: true,
          timeout: WEBRTC_CONFIG.timeout,
          transports: ['polling', 'websocket'],
          forceNew: true,
          upgrade: true,
        });

        return new Promise((resolve, reject) => {
          const connectionTimeout = setTimeout(() => {
            console.error(`Connection timeout for ${url} after ${WEBRTC_CONFIG.timeout}ms`);
            io.disconnect();
            reject(new Error(`Connection timeout: ${url}`));
          }, WEBRTC_CONFIG.timeout + 5000);

          io.on('connect', () => {
            clearTimeout(connectionTimeout);
            console.log(`✅ Socket connected successfully to: ${url}`);
            console.log('Socket ID:', io.id);
            console.log('Transport:', io.io.engine.transport.name);
            console.log('Registering user:', username);
            
            this.peerId = io.id || '';
            
            io.emit('register', username);
            io.emit('set-peer-id', io.id);
            
            resolve(io);
          });

          io.on('connect_error', (error: any) => {
            clearTimeout(connectionTimeout);
            console.error(`❌ Connection failed for ${url}:`, error.message);
            console.error('Error type:', error.type);
            console.error('Error description:', error.description);
            io.disconnect();
            reject(error);
          });

          io.on('disconnect', (reason: any) => {
            console.log(`📡 Disconnected from ${url}:`, reason);
          });

          io.on('reconnect', () => {
            console.log(`🔄 Reconnected to ${url}`);
          });
        });
      } catch (error) {
        console.error(`Failed to connect to ${url}:`, error);
        if (i === urls.length - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
    }
    
    throw new Error('All server URLs failed');
  }

  async initializeSocket(username: string): Promise<any> {
    this.username = username;
    
    try {
      const serverUrls = SERVER_URLS.length > 0 ? SERVER_URLS : [SERVER_URL];
      console.log('Trying server URLs:', serverUrls);
      const io = await this.connectWithFallback(serverUrls, username);
      
      this.socket = io;
      this.setupSocketListeners(io);
      
      console.log('Socket initialization completed successfully');
      console.log('Socket connected:', io.connected);
      
      return io;
    } catch (error) {
      console.error('Failed to initialize socket:', error);
      throw error;
    }
  }

  private setupSocketListeners(io: any) {
    io.on('disconnect', (reason: string) => {
      console.log('Socket disconnected:', reason);
    });

    io.on('users-change', (users: User[]) => {
      this.onUsersChange?.(users);
    });

    io.on('user-joined', (user: User) => {
      console.log('=== USER JOINED EVENT ===');
      console.log('User joined meeting:', user.username);
      console.log('User details:', {
        id: user.id,
        peerId: user.peerId,
        username: user.username
      });
      
      if (user.peerId === this.peerId) {
        console.log('⏭️ Ignoring user-joined event for self:', user.peerId);
        return;
      }

      this.onUserJoined?.(user);
    });

    io.on('user-left', (user: User) => {
      console.log('user left:', user.username);
      this.onUserLeft?.(user);
    });

    io.on('meeting-ended', () => {
      Alert.alert('Meeting ended');
      this.onMeetingEnded?.();
    });

    io.on('offer', async (data: any) => {
      const { offer, fromPeerId, fromUsername, meetingId } = data;
      console.log('🎯 CLIENT: === OFFER RECEIVED ===');
      console.log('📨 Offer received from:', fromUsername, fromPeerId);
      console.log('🏢 Offer meeting ID:', meetingId);
      console.log('📋 Current meeting ID:', this.currentMeetingId);
      console.log('📊 Full offer data:', data);

      if (meetingId !== this.currentMeetingId) {
        console.warn('❌ Received offer for different meeting, ignoring');
        console.warn('   Offer meeting:', meetingId);
        console.warn('   Current meeting:', this.currentMeetingId);
        return;
      }
      
      console.log('✅ Offer meeting ID matches, processing...');
      
      // Transform server data format to match signaling handler expectations
      const transformedData = {
        from: fromPeerId,
        to: this.peerId, // Our peer ID
        offer: offer,
        meetingId: meetingId,
        fromUsername: fromUsername
      };
      
      console.log('📋 Transformed offer data:', {
        from: transformedData.from,
        to: transformedData.to,
        meetingId: transformedData.meetingId,
        hasOffer: !!transformedData.offer
      });
      
      this.onOfferReceived?.(transformedData);
    });

    io.on('answer', async (data: any) => {
      const { answer, fromPeerId } = data;
      console.log('\n📝 === ANSWER RECEIVED ===');
      console.log('   From peer:', fromPeerId);
      console.log('   Answer SDP type:', answer.type);
      
      // Transform server data format to match signaling handler expectations
      const transformedData = {
        from: fromPeerId,
        to: this.peerId,
        answer: answer,
        meetingId: this.currentMeetingId
      };
      
      this.onAnswerReceived?.(transformedData);
    });

    io.on('ice-candidate', async (data: any) => {
      const { candidate, fromPeerId } = data;
      console.log('\n🧊 === ICE CANDIDATE RECEIVED ===');
      console.log('   From peer:', fromPeerId);
      
      // Transform server data format to match signaling handler expectations
      const transformedData = {
        from: fromPeerId,
        to: this.peerId,
        candidate: candidate,
        meetingId: this.currentMeetingId
      };
      
      this.onIceCandidateReceived?.(transformedData);
    });
  }

  sendOffer(offer: any, targetPeerId: string, meetingId: string) {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }
    
    this.socket.emit('offer', {
      offer: offer,
      targetPeerId: targetPeerId,
      meetingId: meetingId
    });
  }

  sendAnswer(answer: any, targetPeerId: string, meetingId: string) {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }
    
    this.socket.emit('answer', {
      answer: answer,
      targetPeerId: targetPeerId,
      meetingId: meetingId
    });
  }

  sendIceCandidate(candidate: any, targetPeerId: string) {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }
    
    this.socket.emit('ice-candidate', {
      candidate: candidate,
      targetPeerId: targetPeerId
    });
  }

  setMeetingId(meetingId: string) {
    this.currentMeetingId = meetingId;
  }

  getMeetingId(): string | null {
    return this.currentMeetingId;
  }

  getPeerId(): string {
    return this.peerId;
  }

  getSocket(): any {
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
