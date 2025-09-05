import React, {useState, useRef, useEffect} from 'react';
import {Alert} from 'react-native';
import {mediaDevices, MediaStream} from 'react-native-webrtc';
import {WebRTCContext} from './WebRTCContext';
import {User, WebRTCContextType} from './WebRTCTypes';
import {WebRTCSocketManager} from './WebRTCSocketManager';
import {WebRTCPeerManager} from './WebRTCPeerManager';
import {WebRTCMeetingManager} from './WebRTCMeetingManager';

interface Props {
  children: React.ReactNode;
}

const WebRTCProvider: React.FC<Props> = ({children}) => {
  // State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [peerId, setPeerId] = useState<string>('');
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const [remoteUser, setRemoteUser] = useState<User | null>(null);
  const [participants, setParticipants] = useState<User[]>([]);
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isMuted, setIsMuted] = useState(false);

  // Refs for immediate access to current values
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<any>(null);
  const peerIdRef = useRef<string>('');
  const currentMeetingIdRef = useRef<string | null>(null);

  // Managers
  const socketManager = useRef<WebRTCSocketManager | null>(null);
  const peerManager = useRef<WebRTCPeerManager | null>(null);
  const meetingManager = useRef<WebRTCMeetingManager | null>(null);

  // Initialize managers
  useEffect(() => {
    if (!socketManager.current) {
      socketManager.current = new WebRTCSocketManager();
      peerManager.current = new WebRTCPeerManager(socketManager.current);
      meetingManager.current = new WebRTCMeetingManager();

      // Setup socket callbacks
      socketManager.current.setCallbacks({
        onUserJoined: (user: User) => {
          meetingManager.current?.handleUserJoined(user);
        },
        onUserLeft: (user: User) => {
          meetingManager.current?.handleUserLeft(user);
          peerManager.current?.closePeerConnection(user.peerId);
          
          // Clear the remote stream for this user
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.delete(user.peerId);
            return newMap;
          });
          
          if (user.id === remoteUser?.id) {
            setRemoteUser(null);
            setRemoteStream(null);
            setActiveCall(null);
          }
        },
        onOfferReceived: (data: any) => {
          peerManager.current?.handleOffer(data);
        },
        onAnswerReceived: (data: any) => {
          peerManager.current?.handleAnswer(data);
        },
        onIceCandidateReceived: (data: any) => {
          peerManager.current?.handleIceCandidate(data);
        },
        onMeetingEnded: () => {
          Alert.alert('Meeting ended');
          leaveMeeting();
        },
        onUsersChange: (users: User[]) => {
          setUsers(users);
        }
      });

      // Setup peer manager callbacks
      peerManager.current.setCallbacks({
        onRemoteStreamAdded: (peerId: string, stream: MediaStream) => {
          console.log('🔄 FORCING REACT RE-RENDER due to remote stream update');
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.set(peerId, stream);
            console.log('   Updated stream for peer ID:', peerId);
            console.log('   Stream has video tracks:', stream.getVideoTracks().length);
            console.log('   Stream has audio tracks:', stream.getAudioTracks().length);
            return newMap;
          });
          
          // For backward compatibility
          setRemoteStream(stream);
          const user = participants.find(p => p.peerId === peerId);
          if (user) {
            setRemoteUser(user);
          }
        },
        onConnectionStateChanged: (peerId: string, state: string) => {
          console.log('Connection state changed:', state, 'for peer:', peerId);
        },
        onParticipantUpdated: (peerId: string, updates: Partial<User>) => {
          setParticipants(prev =>
            prev.map(p => p.peerId === peerId ? { ...p, ...updates } : p)
          );
        }
      });

      // Setup meeting manager callbacks
      meetingManager.current.setCallbacks({
        onMeetingCreated: (meetingId: string) => {
          setCurrentMeetingId(meetingId);
          currentMeetingIdRef.current = meetingId;
        },
        onMeetingJoined: (meetingId: string, participants: User[]) => {
          setCurrentMeetingId(meetingId);
          currentMeetingIdRef.current = meetingId;
          
          // Filter out the current user from the participants to prevent duplicates
          const currentSocketId = socket?.id;
          const filteredParticipants = participants.filter(p => p.peerId !== currentSocketId);
          
          console.log('🔄 onMeetingJoined: Filtering participants');
          console.log('  Original participants:', participants.length);
          console.log('  Current socket ID:', currentSocketId);
          console.log('  Filtered participants:', filteredParticipants.length);
          
          setParticipants(filteredParticipants);
        },
        onParticipantsUpdated: (participants: User[]) => {
          setParticipants(participants);
        },
        onPeerConnectionRequested: (participant: User, isInitiator: boolean) => {
          if (peerManager.current) {
            peerManager.current.createPeerConnection(participant, isInitiator);
          }
        }
      });
    }
  }, []);

  // Cleanup stale remote streams when participants change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        const currentPeerIds = new Set(participants.map(p => p.peerId));
        
        // Only keep streams for current participants
        for (const [peerId] of newMap) {
          if (!currentPeerIds.has(peerId)) {
            console.log('Removing stale stream for peer:', peerId);
            newMap.delete(peerId);
          }
        }
        
        if (newMap.size !== prev.size) {
          console.log('Updated remote streams map, removed stale entries');
          console.log('Previous size:', prev.size, 'New size:', newMap.size);
          console.log('Current peer IDs:', Array.from(currentPeerIds));
          console.log('Stream keys after cleanup:', Array.from(newMap.keys()));
          return newMap;
        }
        
        return prev;
      });
    }, 300); // 300ms debounce to allow participant state to stabilize
    
    return () => clearTimeout(timeoutId);
  }, [participants]);

  // Keep refs in sync
  useEffect(() => {
    currentMeetingIdRef.current = currentMeetingId;
    socketManager.current?.setMeetingId(currentMeetingId || '');
    peerManager.current?.setMeetingId(currentMeetingId || '');
    console.log('📋 Meeting ID updated:', currentMeetingId);
  }, [currentMeetingId]);

  useEffect(() => {
    localStreamRef.current = localStream;
    if (peerManager.current && localStream) {
      peerManager.current.setLocalStream(localStream);
    }
  }, [localStream]);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    peerIdRef.current = peerId;
    if (peerManager.current && peerId) {
      peerManager.current.setPeerId(peerId);
    }
    if (meetingManager.current && peerId) {
      meetingManager.current.setPeerId(peerId);
    }
  }, [peerId]);

  useEffect(() => {
    if (meetingManager.current && username) {
      meetingManager.current.setUsername(username);
    }
  }, [username]);

  const initialize = async (currentUsername?: string): Promise<any> => {
    console.log('=== WEBRTC INITIALIZE START ===');
    
    // Prevent multiple simultaneous initializations
    if (socket && socket.connected && localStream) {
      console.log('⚠️ Already initialized - returning existing connection');
      return { socket, localStream };
    }
    
    const finalUsername = currentUsername || username || 'User';
    console.log('Using username:', finalUsername);
    setUsername(finalUsername);
    setCurrentUser(finalUsername);
    
    const constraints = {
      audio: true,
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    };

    let newStream: MediaStream;
    
    try {
      console.log('Requesting user media with constraints:', constraints);
      newStream = await mediaDevices.getUserMedia(constraints);
      console.log('Got local stream:', newStream.id);
      setLocalStream(newStream as MediaStream);
      localStreamRef.current = newStream as MediaStream;
    } catch (error) {
      console.error('Failed to get user media:', error);
      throw new Error(`Failed to access camera/microphone: ${error}`);
    }

    try {
      if (!socketManager.current) {
        throw new Error('Socket manager not initialized');
      }
      
      const io = await socketManager.current.initializeSocket(finalUsername);
      
      setSocket(io);
      setPeerId(io.id || '');
      peerIdRef.current = io.id || '';
      socketRef.current = io;
      
      // Store for immediate access
      io.localStream = newStream;
      io.currentPeerId = io.id;
      
      setIsInitialized(true);
      console.log('WebRTC initialization completed successfully');
      
      return { socket: io, localStream: newStream };
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      throw error;
    }
  };

  const createMeeting = (): Promise<string> => {
    if (!meetingManager.current || !socket) {
      return Promise.reject('Not properly initialized');
    }
    return meetingManager.current.createMeeting(socket);
  };

  const createMeetingWithSocket = (socketToUse: any): Promise<string> => {
    if (!meetingManager.current) {
      return Promise.reject('Meeting manager not initialized');
    }
    return meetingManager.current.createMeeting(socketToUse);
  };

  const joinMeeting = (meetingId: string, socketToUse?: any): Promise<boolean> => {
    if (!meetingManager.current) {
      return Promise.reject('Meeting manager not initialized');
    }
    const activeSocket = socketToUse || socket;
    return meetingManager.current.joinMeeting(meetingId, activeSocket);
  };

  const leaveMeeting = () => {
    meetingManager.current?.leaveMeeting(socket);
    peerManager.current?.closeAllConnections();
    
    setCurrentMeetingId(null);
    setParticipants([]);
    setRemoteUser(null);
    setRemoteStream(null);
    setActiveCall(null);
    setRemoteStreams(new Map());
  };

  const call = (user: User) => {
    if (!socket || !localStream) {
      Alert.alert('Not ready to make calls');
      return;
    }

    setRemoteUser(user);
    peerManager.current?.createPeerConnection(user, true);
  };

  const switchCamera = () => {
    if (localStream) {
      // @ts-ignore
      localStream.getVideoTracks().forEach((track) => track._switchCamera());
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
      });
    }
  };

  const closeCall = () => {
    console.log('=== CLOSE CALL ===');
    peerManager.current?.closeAllConnections();
    
    setActiveCall(null);
    setRemoteUser(null);
    setRemoteStream(null);
    setRemoteStreams(new Map());
    
    leaveMeeting();
    console.log('Call cleanup completed');
  };

  const reset = async () => {
    console.log('=== RESET WEBRTC ===');
    
    // Disconnect socket
    if (socketManager.current) {
      socketManager.current.disconnect();
    }
    setSocket(null);
    socketRef.current = null;
    
    // Close all connections
    peerManager.current?.closeAllConnections();
    
    // Leave meeting
    leaveMeeting();
    
    // Stop local stream tracks
    if (localStream) {
      console.log('Stopping local stream tracks');
      localStream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
    }
    
    // Clear all state
    setLocalStream(null);
    localStreamRef.current = null;
    setRemoteStream(null);
    setRemoteStreams(new Map());
    setIsInitialized(false);
    setCurrentUser(null);
    setUsername('');
    setPeerId('');
    peerIdRef.current = '';
    setActiveCall(null);
    setRemoteUser(null);
    setParticipants([]);
    setUsers([]);
    setCurrentMeetingId(null);
    currentMeetingIdRef.current = null;
    setIsMuted(false);

    // Reset managers
    socketManager.current = null;
    peerManager.current = null;
    meetingManager.current = null;
    
    console.log('WebRTC reset completed');
  };

  const refreshParticipantVideo = async (participantPeerId: string): Promise<void> => {
    console.log('=== REFRESH PARTICIPANT VIDEO ===');
    console.log('Participant peer ID:', participantPeerId);
    
    const participant = participants.find(p => p.peerId === participantPeerId);
    if (!participant) {
      console.error('Participant not found:', participantPeerId);
      return;
    }

    console.log('Found participant:', participant.username);
    console.log('Setting participant as refreshing...');
    
    meetingManager.current?.updateParticipant(participantPeerId, { isRefreshing: true });
    
    try {
      // Close existing connection
      peerManager.current?.closePeerConnection(participantPeerId);
      
      // Remove from remote streams
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(participantPeerId);
        return newMap;
      });
      
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create new connection
      const newPc = peerManager.current?.createPeerConnection(participant, true);
      if (newPc) {
        console.log('✅ Successfully refreshed connection for:', participant.username);
      } else {
        console.error('❌ Failed to create new connection for:', participant.username);
      }
    } catch (error) {
      console.error('❌ Error refreshing participant video:', error);
    } finally {
      meetingManager.current?.updateParticipant(participantPeerId, { isRefreshing: false });
    }
  };

  const contextValue: WebRTCContextType = {
    localStream,
    remoteStreams,
    isInitialized,
    currentUser,
    activeCall,
    remoteUser,
    participants,
    socket,
    meetingId: currentMeetingId,
    peerId,
    currentMeetingId,
    remoteStream,
    isMuted,
    users,
    initialize,
    reset,
    createMeeting,
    createMeetingWithSocket,
    joinMeeting,
    refreshParticipantVideo,
    setUsername: (newUsername: string) => setUsername(newUsername),
    leaveMeeting,
    call,
    closeCall,
    switchCamera,
    toggleMute,
  };

  return (
    <WebRTCContext.Provider value={contextValue}>
      {children}
    </WebRTCContext.Provider>
  );
};

export default WebRTCProvider;
