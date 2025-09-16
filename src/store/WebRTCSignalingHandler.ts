import {RTCPeerConnection, RTCIceCandidate, RTCSessionDescription} from 'react-native-webrtc';
import {User} from './WebRTCTypes';
import {WebRTCSocketManager} from './WebRTCSocketManager';

export class WebRTCSignalingHandler {
  private socketManager: WebRTCSocketManager;
  private peerConnections: Map<string, RTCPeerConnection>;
  private meetingId: string = '';
  private peerId: string = '';

  private onOfferError?: (error: any, user: User, pc: RTCPeerConnection) => void;

  constructor(socketManager: WebRTCSocketManager, peerConnections: Map<string, RTCPeerConnection>) {
    this.socketManager = socketManager;
    this.peerConnections = peerConnections;
  }

  setCallbacks(callbacks: {
    onOfferError?: (error: any, user: User, pc: RTCPeerConnection) => void;
  }) {
    this.onOfferError = callbacks.onOfferError;
  }

  setPeerId(peerId: string) {
    this.peerId = peerId;
  }

  setMeetingId(meetingId: string) {
    this.meetingId = meetingId;
  }

  async createAndSendOffer(pc: RTCPeerConnection, user: User): Promise<void> {
    try {
      console.log(`📞 Creating offer for ${user.username} (${user.peerId})`);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await pc.setLocalDescription(offer);
      console.log(`✅ Set local description (offer) for ${user.username}`);

      const payload = {
        type: 'offer',
        offer: offer.sdp,
        from: this.peerId,
        to: user.peerId,
        meetingId: this.meetingId,
      };

      console.log(`📤 Sending offer to ${user.username}:`, {
        from: payload.from,
        to: payload.to,
        meetingId: payload.meetingId,
        offerLength: payload.offer?.length || 0
      });

      this.socketManager.sendOffer(offer.sdp, user.peerId, this.meetingId);
    } catch (error) {
      console.error(`❌ Error creating offer for ${user.username}:`, error);
      this.handleOfferError(error, user, pc);
    }
  }

  private handleOfferError(error: any, user: User, pc: RTCPeerConnection): void {
    console.error(`💥 OFFER ERROR for ${user.username}:`, {
      error: error.message || error,
      state: pc.connectionState,
      iceState: pc.iceConnectionState,
      localDesc: !!pc.localDescription,
      remoteDesc: !!pc.remoteDescription
    });

    if (this.onOfferError) {
      this.onOfferError(error, user, pc);
    }
  }

  async handleOffer(data: any): Promise<void> {
    console.log(`📥 Handling offer from ${data.from} to ${data.to}`);
    console.log('Offer data:', {
      from: data.from,
      to: data.to,
      meetingId: data.meetingId,
      hasOffer: !!data.offer
    });

    const pc = this.peerConnections.get(data.from);
    if (!pc) {
      console.error(`No peer connection found for ${data.from}`);
      return;
    }

    try {
      // Check if remote description is already set to avoid conflicts
      if (pc.remoteDescription) {
        console.log(`⚠️ Remote description already set for ${data.from}, current state:`, pc.signalingState);
        if (pc.signalingState === 'stable') {
          console.log(`🔄 Connection is stable, ignoring duplicate offer from ${data.from}`);
          return;
        }
      }

      const remoteDesc = new RTCSessionDescription({
        type: 'offer',
        sdp: data.offer,
      });

      await pc.setRemoteDescription(remoteDesc);
      console.log(`✅ Set remote description (offer) from ${data.from}`);

      const answer = await pc.createAnswer();

      await pc.setLocalDescription(answer);
      console.log(`✅ Set local description (answer) for ${data.from}`);

      const payload = {
        type: 'answer',
        answer: answer.sdp,
        from: this.peerId,
        to: data.from,
        meetingId: this.meetingId,
      };

      this.socketManager.sendAnswer(answer.sdp, data.from, this.meetingId);
      console.log(`📤 Sent answer to ${data.from}`);
    } catch (error) {
      console.error(`❌ Error handling offer from ${data.from}:`, error);
      console.error('Connection state:', pc.connectionState);
      console.error('Signaling state:', pc.signalingState);
      console.error('ICE connection state:', pc.iceConnectionState);
    }
  }

  async handleAnswer(data: any): Promise<void> {
    console.log(`📥 Handling answer from ${data.from} to ${data.to}`);

    const pc = this.peerConnections.get(data.from);
    if (!pc) {
      console.error(`No peer connection found for ${data.from}`);
      return;
    }

    try {
      // Check if we're in the right state to receive an answer
      if (pc.signalingState !== 'have-local-offer') {
        console.warn(`⚠️ Unexpected signaling state for answer from ${data.from}: ${pc.signalingState}`);
        if (pc.signalingState === 'stable') {
          console.log(`🔄 Connection is already stable, ignoring answer from ${data.from}`);
          return;
        }
      }

      const remoteDesc = new RTCSessionDescription({
        type: 'answer',
        sdp: data.answer,
      });

      await pc.setRemoteDescription(remoteDesc);
      console.log(`✅ Set remote description (answer) from ${data.from}`);
      console.log(`🔗 Connection state after answer: ${pc.connectionState}`);
      console.log(`🎯 Signaling state after answer: ${pc.signalingState}`);
    } catch (error) {
      console.error(`❌ Error handling answer from ${data.from}:`, error);
      console.error('Connection state:', pc.connectionState);
      console.error('Signaling state:', pc.signalingState);
      console.error('ICE connection state:', pc.iceConnectionState);
    }
  }

  async handleIceCandidate(data: any): Promise<void> {
    console.log(`🧊 Handling ICE candidate from ${data.from} to ${data.to}`);

    const pc = this.peerConnections.get(data.from);
    if (!pc) {
      console.error(`No peer connection found for ICE candidate from ${data.from}`);
      return;
    }

    try {
      // Only add ICE candidates when remote description is set
      if (!pc.remoteDescription) {
        console.warn(`⚠️ Received ICE candidate before remote description from ${data.from}`);
        console.warn(`Current signaling state: ${pc.signalingState}`);
        // We could queue candidates here, but for now we'll try to add them anyway
      }

      const candidate = new RTCIceCandidate(data.candidate);
      await pc.addIceCandidate(candidate);
      console.log(`✅ Added ICE candidate from ${data.from}`);
      console.log(`🧊 ICE connection state: ${pc.iceConnectionState}`);
    } catch (error) {
      console.error(`❌ Error adding ICE candidate from ${data.from}:`, error);
      console.error('Connection state:', pc.connectionState);
      console.error('Signaling state:', pc.signalingState);
      console.error('ICE connection state:', pc.iceConnectionState);
      console.error('Candidate data:', data.candidate);
    }
  }
}
