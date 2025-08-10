import { Alert } from 'react-native';
import { getCurrentUser } from './FirebaseService';
import { User } from '../interfaces/webrtc';

interface Contact {
  id: string;
  name: string;
  phoneNumbers?: { number?: string; }[];
  emails?: { email?: string; }[];
}

export class VideoCallService {
  private static instance: VideoCallService;
  private webRTCContext: any = null;
  private navigationRef: any = null;

  static getInstance(): VideoCallService {
    if (!VideoCallService.instance) {
      VideoCallService.instance = new VideoCallService();
    }
    return VideoCallService.instance;
  }

  setWebRTCContext(context: any) {
    this.webRTCContext = context;
  }

  setNavigationRef(navigationRef: any) {
    this.navigationRef = navigationRef;
  }

  async initializeVideoCall(): Promise<boolean> {
    try {
      if (!this.webRTCContext) {
        console.error('WebRTC context not set');
        return false;
      }

      const user = getCurrentUser();
      const username = user?.displayName || user?.email?.split('@')[0] || `user_${Date.now()}`;
      
      await this.webRTCContext.initialize(username);
      return true;
    } catch (error) {
      console.error('Failed to initialize video call:', error);
      return false;
    }
  }

  convertContactToUser(contact: Contact): User {
    return {
      username: contact.name,
      peerId: '', // Will be set when user connects
      id: contact.id,
      name: contact.name,
      phoneNumbers: contact.phoneNumbers,
    };
  }

  async startVideoCall(contact: Contact): Promise<void> {
    try {
      if (!this.webRTCContext) {
        Alert.alert('Error', 'Video calling is not initialized. Please try again.');
        return;
      }

      // Initialize WebRTC if not already done
      if (!this.webRTCContext.localStream) {
        const initialized = await this.initializeVideoCall();
        if (!initialized) {
          Alert.alert('Error', 'Failed to initialize camera and microphone.');
          return;
        }
      }

      // For now, show a placeholder call since we don't have a real peer discovery system
      // In a real implementation, you would discover peers through a signaling server
      Alert.alert(
        'Video Call',
        `Starting video call with ${contact.name}...`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Call',
            onPress: () => this.startMockCall(contact)
          }
        ]
      );
    } catch (error) {
      console.error('Error starting video call:', error);
      Alert.alert('Error', 'Failed to start video call. Please try again.');
    }
  }

  private startMockCall(contact: Contact) {
    try {
      // Set up a mock remote user for demonstration
      const mockUser = this.convertContactToUser(contact);
      mockUser.peerId = `mock_${contact.id}_${Date.now()}`;
      
      // Simulate setting remote user
      if (this.webRTCContext.setRemoteUser) {
        // This would normally be done through peer discovery
        // For now, we'll navigate to call screen to show the UI
        this.navigateToCallScreen(contact);
      }
    } catch (error) {
      console.error('Error in mock call setup:', error);
    }
  }

  private navigateToCallScreen(contact: Contact) {
    if (this.navigationRef?.current) {
      this.navigationRef.current.navigate('VideoCallScreen', {
        id: `call_${contact.id}`,
        type: 'outgoing',
        contact: contact
      });
    }
  }

  async handleIncomingCall(caller: User): Promise<void> {
    return new Promise((resolve) => {
      Alert.alert(
        'Incoming Call',
        `${caller.name || caller.username} is calling...`,
        [
          {
            text: 'Decline',
            style: 'destructive',
            onPress: () => {
              this.declineCall(caller);
              resolve();
            }
          },
          {
            text: 'Accept',
            onPress: () => {
              this.acceptCall(caller);
              resolve();
            }
          }
        ],
        { cancelable: false }
      );
    });
  }

  private acceptCall(caller: User) {
    try {
      if (this.webRTCContext) {
        // This would normally be handled by the WebRTC context
        // For now, navigate to call screen
        if (this.navigationRef?.current) {
          this.navigationRef.current.navigate('VideoCallScreen', {
            id: `call_${caller.id || caller.username}`,
            type: 'incoming',
            caller: caller
          });
        }
      }
    } catch (error) {
      console.error('Error accepting call:', error);
    }
  }

  private declineCall(caller: User) {
    try {
      // Emit reject call event if socket is available
      console.log(`Declined call from ${caller.name || caller.username}`);
    } catch (error) {
      console.error('Error declining call:', error);
    }
  }

  endCall() {
    try {
      if (this.webRTCContext) {
        this.webRTCContext.closeCall();
      }
      
      if (this.navigationRef?.current) {
        // Navigate back to previous screen
        this.navigationRef.current.goBack();
      }
    } catch (error) {
      console.error('Error ending call:', error);
    }
  }

  // Utility method to check if video calling is available
  isVideoCallAvailable(): boolean {
    return this.webRTCContext && this.webRTCContext.localStream !== null;
  }

  // Get current call status
  getCallStatus() {
    if (!this.webRTCContext) return 'unavailable';
    
    if (this.webRTCContext.activeCall) return 'active';
    if (this.webRTCContext.remoteUser) return 'connecting';
    if (this.webRTCContext.localStream) return 'ready';
    
    return 'initializing';
  }
}

export const videoCallService = VideoCallService.getInstance();