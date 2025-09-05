import {User} from './WebRTCTypes';

export class WebRTCParticipantManager {
  private participants: User[] = [];
  private onParticipantsUpdated?: (participants: User[]) => void;
  private onPeerConnectionRequested?: (participant: User, isInitiator: boolean) => void;

  setCallbacks(callbacks: {
    onParticipantsUpdated?: (participants: User[]) => void;
    onPeerConnectionRequested?: (participant: User, isInitiator: boolean) => void;
  }) {
    this.onParticipantsUpdated = callbacks.onParticipantsUpdated;
    this.onPeerConnectionRequested = callbacks.onPeerConnectionRequested;
  }

  getParticipants(): User[] {
    return [...this.participants];
  }

  setParticipants(participants: User[]) {
    this.participants = [...participants];
    this.onParticipantsUpdated?.(this.participants);
  }

  addParticipant(user: User) {
    console.log(`👥 Adding participant: ${user.username} (${user.peerId})`);
    
    // Check for existing participant by peer ID first
    const existingIndex = this.participants.findIndex(p => p.peerId === user.peerId);
    if (existingIndex !== -1) {
      console.log(`🔄 Updating existing participant: ${user.username}`);
      this.participants[existingIndex] = { ...this.participants[existingIndex], ...user };
    } else {
      // Also check for duplicate participants by username (in case of multiple socket connections)
      const duplicateByName = this.participants.find(p => 
        p.username.trim() === user.username.trim() && p.peerId !== user.peerId
      );
      
      if (duplicateByName) {
        console.log(`⚠️ DUPLICATE USER DETECTED: ${user.username} already exists with different peer ID`);
        console.log(`   Existing: ${duplicateByName.peerId}, New: ${user.peerId}`);
        console.log(`   Replacing old participant with new one`);
        
        // Remove the old participant and add the new one
        const oldIndex = this.participants.findIndex(p => p.peerId === duplicateByName.peerId);
        if (oldIndex !== -1) {
          this.participants.splice(oldIndex, 1);
        }
      }
      
      console.log(`➕ Adding new participant: ${user.username}`);
      this.participants.push(user);
    }
    
    console.log(`📊 Total participants: ${this.participants.length}`);
    this.participants.forEach(p => {
      console.log(`   - ${p.username} (${p.peerId})`);
    });
    
    this.onParticipantsUpdated?.(this.participants);
  }

  removeParticipant(peerId: string) {
    console.log(`👥 Removing participant with peer ID: ${peerId}`);
    
    const participantIndex = this.participants.findIndex(p => p.peerId === peerId);
    if (participantIndex !== -1) {
      const removedParticipant = this.participants[participantIndex];
      console.log(`➖ Removed participant: ${removedParticipant.username}`);
      this.participants.splice(participantIndex, 1);
      
      console.log(`📊 Remaining participants: ${this.participants.length}`);
      this.participants.forEach(p => {
        console.log(`   - ${p.username} (${p.peerId})`);
      });
      
      this.onParticipantsUpdated?.(this.participants);
      return removedParticipant;
    } else {
      console.warn(`⚠️ Participant not found for removal: ${peerId}`);
      return null;
    }
  }

  updateParticipant(peerId: string, updates: Partial<User>) {
    console.log(`🔄 Updating participant ${peerId} with:`, updates);
    
    const participantIndex = this.participants.findIndex(p => p.peerId === peerId);
    if (participantIndex !== -1) {
      this.participants[participantIndex] = { 
        ...this.participants[participantIndex], 
        ...updates 
      };
      console.log(`✅ Updated participant: ${this.participants[participantIndex].username}`);
      this.onParticipantsUpdated?.(this.participants);
      return this.participants[participantIndex];
    } else {
      console.warn(`⚠️ Participant not found for update: ${peerId}`);
      return null;
    }
  }

  findParticipant(peerId: string): User | null {
    return this.participants.find(p => p.peerId === peerId) || null;
  }

  createPeerConnectionsWithExistingParticipants(serverParticipants: User[], currentSocketId: string) {
    console.log('🔗 Creating peer connections with existing participants');
    console.log('Server participants:', serverParticipants.length);
    console.log('Current socket ID:', currentSocketId);
    
    // Filter out self from participants
    const otherParticipants = serverParticipants.filter(p => p.peerId !== currentSocketId);
    console.log('Other participants (excluding self):', otherParticipants.length);
    
    // Update our participants list
    this.setParticipants(serverParticipants);
    
    // Create peer connections with other participants
    otherParticipants.forEach(participant => {
      console.log(`🤝 Requesting peer connection with: ${participant.username} (${participant.peerId})`);
      
      // We are the initiator since we're joining an existing meeting
      this.onPeerConnectionRequested?.(participant, true);
    });
  }

  handleUserJoined(user: User, currentPeerId: string) {
    console.log(`👋 User joined: ${user.username} (${user.peerId})`);
    
    this.addParticipant(user);
    
    // If this is not us joining, create a peer connection
    if (user.peerId !== currentPeerId) {
      console.log(`🤝 Creating peer connection with new user: ${user.username}`);
      
      // We are NOT the initiator since the other user joined after us
      this.onPeerConnectionRequested?.(user, false);
    } else {
      console.log(`🆔 This is our own join event, skipping peer connection creation`);
    }
  }

  handleUserLeft(user: User) {
    console.log(`👋 User left: ${user.username} (${user.peerId})`);
    this.removeParticipant(user.peerId);
  }

  clearParticipants() {
    console.log('🧹 Clearing all participants');
    this.participants = [];
    this.onParticipantsUpdated?.(this.participants);
  }

  reset() {
    this.clearParticipants();
  }
}
