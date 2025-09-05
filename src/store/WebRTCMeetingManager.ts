import {User} from './WebRTCTypes';
import {WebRTCParticipantManager} from './WebRTCParticipantManager';

export class WebRTCMeetingManager {
  private currentMeetingId: string | null = null;
  private username: string = '';
  private peerId: string = '';
  private participantManager: WebRTCParticipantManager;
  
  private onMeetingCreated?: (meetingId: string) => void;
  private onMeetingJoined?: (meetingId: string, participants: User[]) => void;

  constructor() {
    this.participantManager = new WebRTCParticipantManager();
  }

  setCallbacks(callbacks: {
    onMeetingCreated?: (meetingId: string) => void;
    onMeetingJoined?: (meetingId: string, participants: User[]) => void;
    onParticipantsUpdated?: (participants: User[]) => void;
    onPeerConnectionRequested?: (participant: User, isInitiator: boolean) => void;
  }) {
    this.onMeetingCreated = callbacks.onMeetingCreated;
    this.onMeetingJoined = callbacks.onMeetingJoined;
    
    // Forward participant callbacks to participant manager
    this.participantManager.setCallbacks({
      onParticipantsUpdated: callbacks.onParticipantsUpdated,
      onPeerConnectionRequested: callbacks.onPeerConnectionRequested,
    });
  }

  setUsername(username: string) {
    this.username = username;
  }

  setPeerId(peerId: string) {
    this.peerId = peerId;
  }

  getCurrentMeetingId(): string | null {
    return this.currentMeetingId;
  }

  getParticipants(): User[] {
    return this.participantManager.getParticipants();
  }

  async createMeeting(socket: any): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log('=== CREATE MEETING DEBUG ===');
      console.log('Socket exists:', !!socket);
      console.log('Socket connected:', socket?.connected);
      console.log('Socket ID:', socket?.id);
      
      if (!socket) {
        console.error('Socket not connected when creating meeting - socket is null/undefined');
        reject('Socket not connected');
        return;
      }

      if (!socket.connected) {
        console.error('Socket not connected when creating meeting - connected:', socket.connected);
        reject('Socket not connected');
        return;
      }

      console.log('Emitting create-meeting event...');
      
      const timeoutId = setTimeout(() => {
        console.error('❌ Create meeting timeout - no response from server');
        reject('Create meeting timeout');
      }, 10000);

      socket.emit('create-meeting', { username: this.username }, (response: any) => {
        clearTimeout(timeoutId);
        console.log('Create meeting response received:', response);
        
        if (response && response.meetingId) {
          const meetingId = response.meetingId;
          console.log(`✅ Meeting created successfully: ${meetingId}`);
          
          this.currentMeetingId = meetingId;
          this.onMeetingCreated?.(meetingId);
          resolve(meetingId);
        } else {
          console.error('❌ Failed to create meeting - invalid response:', response);
          reject(response?.error || 'Failed to create meeting');
        }
      });
    });
  }

  async joinMeeting(meetingId: string, socket: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      console.log('=== JOIN MEETING DEBUG ===');
      console.log('Meeting ID to join:', meetingId);
      console.log('Username:', this.username);
      console.log('Socket exists:', !!socket);
      console.log('Socket connected:', socket?.connected);
      console.log('Socket ID:', socket?.id);
      
      if (!socket?.connected) {
        console.error('Socket not connected when joining meeting');
        reject('Socket not connected');
        return;
      }

      console.log('Emitting join-meeting event...');
      
      const timeoutId = setTimeout(() => {
        console.error('❌ Join meeting timeout - no response from server');
        reject('Join meeting timeout');
      }, 10000);

      socket.emit('join-meeting', { 
        meetingId, 
        username: this.username,
        peerId: socket.id 
      }, (response: any) => {
        clearTimeout(timeoutId);
        console.log('Join meeting response received:', response);
        
        if (response && response.success) {
          console.log(`✅ Successfully joined meeting: ${meetingId}`);
          console.log('Participants from server:', response.participants?.length || 0);
          
          this.currentMeetingId = meetingId;
          
          if (response.participants && Array.isArray(response.participants)) {
            console.log('Processing server participants:', response.participants);
            
            // Use participant manager to handle existing participants
            this.participantManager.createPeerConnectionsWithExistingParticipants(
              response.participants, 
              socket.id
            );
            
            this.onMeetingJoined?.(meetingId, response.participants);
          }
          
          resolve(true);
        } else {
          console.error('❌ Failed to join meeting:', response);
          reject(response?.error || 'Failed to join meeting');
        }
      });
    });
  }

  handleUserJoined(user: User) {
    this.participantManager.handleUserJoined(user, this.peerId);
  }

  handleUserLeft(user: User) {
    this.participantManager.handleUserLeft(user);
  }

  leaveMeeting(socket: any) {
    if (this.currentMeetingId && socket) {
      console.log(`🚪 Leaving meeting: ${this.currentMeetingId}`);
      socket.emit('leave-meeting', { meetingId: this.currentMeetingId });
    }
    
    this.currentMeetingId = null;
    this.participantManager.clearParticipants();
  }

  updateParticipant(peerId: string, updates: Partial<User>) {
    return this.participantManager.updateParticipant(peerId, updates);
  }

  reset() {
    this.currentMeetingId = null;
    this.username = '';
    this.peerId = '';
    this.participantManager.reset();
  }
}
