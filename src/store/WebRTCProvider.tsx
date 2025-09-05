import React, {useState, useRef, useEffect} from 'react';
import {Alert} from 'react-native';
import {
  mediaDevices,
  MediaStream,
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
} from 'react-native-webrtc';
import socketio from 'socket.io-client';
import {WebRTCContext as WebRTCContextType, User} from '../interfaces/webrtc';
import {
  SIGNALING_SERVER_URL,
  FALLBACK_SERVER_URLS,
  WEBRTC_TIMEOUT,
  WEBRTC_RECONNECTION_ATTEMPTS,
  WEBRTC_RECONNECTION_DELAY,
  STUN_SERVERS,
  NODE_ENV
} from '@env';

const getServerURL = () => {
  return SIGNALING_SERVER_URL;
};

const getServerURLs = () => {
  if (FALLBACK_SERVER_URLS) {
    return FALLBACK_SERVER_URLS.split(',').map(url => url.trim());
  }
  return [];
};

const getStunServers = () => {
  if (STUN_SERVERS) {
    return STUN_SERVERS.split(',').map(url => url.trim());
  }
  return [
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302',
  ];
};

const SERVER_URL = getServerURL();
const SERVER_URLS = getServerURLs();

const ICE_SERVERS = {
  iceServers: [
    {
      urls: getStunServers(),
    },
    // Public TURN servers for testing
    {
      urls: 'turn:turn.bistri.com:80',
      username: 'homeo',
      credential: 'homeo'
    },
    {
      urls: 'turn:turn.anyfirewall.com:443?transport=tcp',
      username: 'webrtc',
      credential: 'webrtc'
    }
  ],
};

const initialValues: WebRTCContextType = {
  username: '',
  peerId: '',
  users: [],
  localStream: null,
  remoteStream: null,
  remoteStreams: new Map(),
  remoteUser: null,
  initialize: () => {},
  setUsername: () => {},
  call: () => {},
  switchCamera: () => {},
  toggleMute: () => {},
  isMuted: false,
  closeCall: () => {},
  reset: () => {},
  activeCall: null,
  createMeeting: () => Promise.resolve(''),
  createMeetingWithSocket: () => Promise.resolve(''),
  joinMeeting: () => Promise.resolve(false),
  leaveMeeting: () => {},
  refreshParticipantVideo: () => Promise.resolve(),
  currentMeetingId: null,
  participants: [],
};

export const WebRTCContext = React.createContext(initialValues);

interface Props {
  children: React.ReactNode;
}

const WebRTCProvider: React.FC<Props> = ({children}) => {
  const [username, setUsername] = useState(initialValues.username);
  const [peerId, setPeerId] = useState(initialValues.peerId);
  const [users, setUsers] = useState<User[]>(initialValues.users);
  const [localStream, setLocalStream] = useState<MediaStream | null>(
    initialValues.localStream,
  );
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(
    initialValues.remoteStream,
  );
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [remoteUser, setRemoteUser] = useState<User | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(initialValues.isMuted);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map());
  const [participants, setParticipants] = useState<User[]>([]);

  // Use refs for immediate access to current values and avoid race conditions
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerIdRef = useRef<string>('');
  const socketRef = useRef<any>(null);
  const currentMeetingIdRef = useRef<string | null>(null);

  // Cleanup stale remote streams when participants change - debounced to prevent race conditions
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setRemoteStreams(prev => {
        const validPeerIds = participants.map(p => p.peerId);
        const newMap = new Map();
        
        // Only keep streams for current participants
        prev.forEach((stream, peerId) => {
          if (validPeerIds.includes(peerId)) {
            newMap.set(peerId, stream);
          } else {
            console.log('🗑️ Removing stale remote stream for peer:', peerId);
          }
        });
        
        if (newMap.size !== prev.size) {
          console.log('🧹 Cleaned up remote streams:', prev.size, '→', newMap.size);
          console.log('Valid peer IDs:', validPeerIds);
          console.log('Remaining stream keys:', Array.from(newMap.keys()));
        }
        
        return newMap;
      });
    }, 300); // 300ms debounce to allow participant state to stabilize
    
    return () => clearTimeout(timeoutId);
  }, [participants]);

  // Keep meetingId ref in sync with state
  useEffect(() => {
    currentMeetingIdRef.current = currentMeetingId;
    console.log('📋 Meeting ID ref updated:', currentMeetingId);
  }, [currentMeetingId]);

    const connectWithFallback = async (urls: string[], username: string): Promise<any> => {
    console.log(`Starting WebRTC connection in ${NODE_ENV || 'production'} mode`);
    console.log('Available server URLs:', urls);
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`Attempting to connect to: ${url} (attempt ${i + 1}/${urls.length})`);
      
      try {
        const timeout = parseInt(WEBRTC_TIMEOUT) || 20000;
        const reconnectionAttempts = parseInt(WEBRTC_RECONNECTION_ATTEMPTS) || 3;
        const reconnectionDelay = parseInt(WEBRTC_RECONNECTION_DELAY) || 1000;
        
        const io = socketio(url, {
          reconnection: true,
          reconnectionAttempts: reconnectionAttempts,
          reconnectionDelay: reconnectionDelay,
          autoConnect: true,
          timeout: timeout,
          transports: ['polling', 'websocket'],
          forceNew: true,
          upgrade: true,
        });

        return new Promise((resolve, reject) => {
          const connectionTimeout = setTimeout(() => {
            console.error(`Connection timeout for ${url} after ${timeout}ms`);
            io.disconnect();
            reject(new Error(`Connection timeout: ${url}`));
          }, timeout + 5000);

          io.on('connect', () => {
            clearTimeout(connectionTimeout);
            console.log(`✅ Socket connected successfully to: ${url}`);
            console.log('Socket ID:', io.id);
            console.log('Transport:', io.io.engine.transport.name);
            console.log('Registering user:', username);
            
            // Set peer ID to socket ID for consistency
            if (io.id) {
              setPeerId(io.id);
            }
            
            // Register user and set peer ID on server
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
        // Wait before trying next server
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
    }
    
    throw new Error('All server URLs failed');
  };

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
      console.log('Local stream state will be updated to:', newStream.id);
    } catch (error) {
      console.error('Failed to get user media:', error);
      throw new Error(`Failed to access camera/microphone: ${error}`);
    }

    try {
      const serverUrls = getServerURLs();
      console.log('Trying server URLs:', serverUrls);
      const io = await connectWithFallback(serverUrls, finalUsername);
      
      setSocket(io);
      setPeerId(io.id || '');
      peerIdRef.current = io.id || '';
      socketRef.current = io;
      console.log('Socket and peer ID state will be updated to:', io.id);
      
      // Store these on the socket for immediate access
      io.localStream = newStream;
      io.currentPeerId = io.id;
      console.log('Stored on socket - localStream:', !!io.localStream, 'peerId:', io.currentPeerId);
      
      setupSocketListeners(io);
      
      console.log('WebRTC initialization completed successfully');
      console.log('Socket state set successfully:', !!io);
      console.log('Socket connected:', io.connected);
      
      // Return both socket and stream for immediate access
      return { socket: io, localStream: newStream };
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      throw error;
    }
  };

  const setupSocketListeners = (io: any) => {
    io.on('disconnect', (reason: string) => {
      console.log('Socket disconnected:', reason);
    });

    io.on('users-change', (users: User[]) => {
      setUsers(users);
    });

    io.on('user-joined', (user: User) => {
      console.log('=== USER JOINED EVENT ===');
      console.log('User joined meeting:', user.username);
      console.log('User details:', {
        id: user.id,
        peerId: user.peerId,
        username: user.username
      });
      console.log('Current meeting ID:', currentMeetingId);
      console.log('Local stream exists:', !!localStream);
      
      // Ignore events for our own connection
      if (user.peerId === (peerIdRef.current || peerId || io.id)) {
        console.log('⏭️ Ignoring user-joined event for self:', user.peerId);
        return;
      }

      // Add user to participants list immediately, preventing duplicates
      setParticipants(prev => {
        // Check if user already exists by peerId (most reliable identifier)
        const existsByPeerId = prev.find(p => p.peerId === user.peerId);
        if (existsByPeerId) {
          console.log('👥 User already in participants list (by peerId):', user.username, user.peerId);
          return prev; // No change needed
        }
        
        // Check if user exists by ID as backup
        const existsById = prev.find(p => p.id === user.id);
        if (existsById) {
          console.log('👥 User already in participants list (by id):', user.username, user.id);
          return prev; // No change needed
        }
        
        // Remove any existing participants with the same username but different peer ID (connection refresh)
        const filteredParticipants = prev.filter(p => p.username !== user.username);
        const removedCount = prev.length - filteredParticipants.length;
        
        console.log('👥 Adding new user to participants list:', user.username);
        console.log('   User peer ID:', user.peerId);
        console.log('   User ID:', user.id);
        console.log('   Removed old entries for same username:', removedCount);
        console.log('   Current participants count after cleanup:', filteredParticipants.length);
        
        return [...filteredParticipants, user];
      });

      // DO NOT create peer connection here - let the joiner initiate
      // The user who joins should create connections to existing participants
      // Existing participants just wait for offers from the joiner
      console.log('\n✅ USER ADDED TO PARTICIPANTS LIST');
      console.log('   Waiting for peer connection from joiner:', user.username);
      console.log('   Total participants will be:', participants.length + 1);
    });

    io.on('user-left', (user: User) => {
      console.log('user left:', user.username);
      setParticipants(prev => prev.filter(p => p.id !== user.id));
      
      setPeerConnections(prev => {
        const pc = prev.get(user.peerId);
        if (pc) {
          pc.close();
          prev.delete(user.peerId);
        }
        return new Map(prev);
      });
      
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
    });

    io.on('meeting-ended', () => {
      Alert.alert('Meeting ended');
      leaveMeeting();
    });

    io.on('offer', async (data: any) => {
      const { offer, fromPeerId, fromUsername, meetingId } = data;
      console.log('🎯 CLIENT: === OFFER RECEIVED ===');
      console.log('📨 Offer received from:', fromUsername, fromPeerId);
      console.log('🏢 Offer meeting ID:', meetingId);
      console.log('🔍 Current meeting ID state:', currentMeetingId);
      console.log('📋 Current meeting ID ref:', currentMeetingIdRef.current);
      console.log('🎪 My peer ID:', peerId);
      console.log('🔍 My socket ID:', io?.id);
      console.log('📊 Full offer data:', data);

      // Use the same fallback logic as offer sending
      const finalCurrentMeetingId = currentMeetingId || currentMeetingIdRef.current;
      console.log('✅ Final current meeting ID:', finalCurrentMeetingId);

      if (meetingId !== finalCurrentMeetingId) {
        console.warn('❌ Received offer for different meeting, ignoring');
        console.warn('   Offer meeting:', meetingId);
        console.warn('   Current meeting:', finalCurrentMeetingId);
        return;
      }
      
      console.log('✅ Offer meeting ID matches, processing...');

      const user = {
        peerId: fromPeerId,
        username: fromUsername,
        id: fromPeerId
      };

      // Ensure we have the user in our participants list, removing any old entries
      setParticipants(prev => {
        // Remove any existing participants with the same username but different peer ID
        const filteredParticipants = prev.filter(p => p.username !== fromUsername);
        
        const exists = prev.find(p => p.peerId === fromPeerId);
        if (!exists) {
          console.log('👥 Adding user to participants list from offer:', fromUsername);
          console.log('   Peer ID:', fromPeerId);
          console.log('   Removed old entries for same user:', prev.length - filteredParticipants.length);
          return [...filteredParticipants, user];
        }
        return prev;
      });

      const pc = createPeerConnection(user, false);

      if (!pc) {
        console.error('Failed to create peer connection for offer from:', fromUsername);
        return;
      }

      try {
        console.log('\n📝 PROCESSING RECEIVED OFFER');
        console.log('   From:', fromUsername, fromPeerId);
        console.log('   Connection state:', pc.connectionState);
        console.log('   Signaling state:', pc.signalingState);
        console.log('   Offer SDP type:', offer.type);
        console.log('   Offer contains video:', offer.sdp?.includes('m=video'));
        console.log('   Offer contains audio:', offer.sdp?.includes('m=audio'));
        
        // Check signaling state before setting remote description
        if (pc.signalingState === 'stable' || pc.signalingState === 'have-remote-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          console.log('\n✅ REMOTE DESCRIPTION SET');
          console.log('   Signaling state after:', pc.signalingState);
        } else if (pc.signalingState === 'have-local-offer') {
          console.warn('\n⚠️ OFFER COLLISION DETECTED');
          console.warn('   Our state:', pc.signalingState);
          console.warn('   Need to handle glare condition');
          
          // Handle offer collision using peer ID comparison
          const shouldBackOff = peerId < fromPeerId; // Lower ID backs off
          if (shouldBackOff) {
            console.warn('   🔄 BACKING OFF - Restarting as answerer');
            console.warn('   🔄 Resetting connection to handle collision');
            
            // Reset the peer connection by setting signaling state back to stable
            // This is done by calling setLocalDescription with a null offer
            try {
              await pc.setLocalDescription();
              console.log('   ✅ Local description cleared, state:', pc.signalingState);
            } catch (error: any) {
              console.warn('   ⚠️ Could not clear local description:', error.message);
              // Try alternative: create a new rollback
              await pc.setLocalDescription({type: 'rollback'} as any);
              console.log('   ✅ Rollback applied, state:', pc.signalingState);
            }
            
            // Now set the remote offer
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            console.log('   ✅ REMOTE DESCRIPTION SET AFTER COLLISION RESOLUTION');
            console.log('   📊 New signaling state:', pc.signalingState);
          } else {
            console.warn('   ⚡ IGNORING OFFER - Remote should back off');
            console.warn('   📊 Our peer ID:', peerId, 'Their peer ID:', fromPeerId);
            return; // Exit early
          }
        } else {
          console.warn('\n⚠️ CANNOT PROCESS OFFER - Invalid state:', pc.signalingState);
          return; // Exit early
        }

        // Check senders before creating answer  
        const senders = pc.getSenders();
        console.log('\n📊 SENDERS BEFORE ANSWER:');
        console.log('   Total senders:', senders.length);
        senders.forEach((sender, index) => {
          console.log(`   Sender ${index + 1}:`, {
            hasTrack: !!sender.track,
            kind: sender.track?.kind,
            enabled: sender.track?.enabled
          });
        });

        // Check if we can create an answer (should be in have-remote-offer state)
        if (pc.signalingState === 'have-remote-offer') {
          console.log('\n📝 CREATING ANSWER');
          const answer = await pc.createAnswer();
          console.log('\n✅ ANSWER CREATED');
          console.log('   SDP type:', answer.type);
          console.log('   Answer contains video:', answer.sdp?.includes('m=video'));
          console.log('   Answer contains audio:', answer.sdp?.includes('m=audio'));
          
          await pc.setLocalDescription(answer);
          console.log('\n💾 LOCAL DESCRIPTION SET FOR ANSWER');
          console.log('   Signaling state after:', pc.signalingState);

          io.emit('answer', {
            answer: answer,
            targetPeerId: fromPeerId,
            meetingId: meetingId
          });
          console.log('\n📤 ANSWER SENT TO:', fromUsername, fromPeerId);
        } else {
          console.warn('\n⚠️ CANNOT CREATE ANSWER - Wrong signaling state');
          console.warn('   Expected: have-remote-offer');
          console.warn('   Actual:', pc.signalingState);
          console.warn('   This might be an offer collision (glare condition)');
          
          // Handle offer collision - peer with higher ID backs off
          const shouldBackOff = fromPeerId > peerId;
          if (shouldBackOff) {
            console.warn('   🔄 BACKING OFF - Our ID is lower, restarting as answer side');
            // Reset and wait for their offer
          } else {
            console.warn('   ⚡ IGNORING OFFER - Their ID is lower, they should back off');
          }
        }
      } catch (error) {
        console.error('\n❌ ERROR HANDLING OFFER:', fromUsername, error);
        console.error('   Connection state:', pc.connectionState);
        console.error('   Signaling state:', pc.signalingState);
      }
    });

    io.on('answer', async (data: any) => {
      const { answer, fromPeerId } = data;
      console.log('\n📝 === ANSWER RECEIVED ===');
      console.log('   From peer:', fromPeerId);
      console.log('   Answer SDP type:', answer.type);
      console.log('   Answer contains video:', answer.sdp?.includes('m=video'));
      console.log('   Answer contains audio:', answer.sdp?.includes('m=audio'));

      setPeerConnections(prevConnections => {
        const pc = prevConnections.get(fromPeerId);
        if (pc) {
          console.log('\n💾 SETTING REMOTE DESCRIPTION FOR ANSWER');
          console.log('   Connection state:', pc.connectionState);
          console.log('   Signaling state:', pc.signalingState);
          console.log('   ICE connection state:', pc.iceConnectionState);
          
          // Check if we're in the correct state to accept an answer
          if (pc.signalingState === 'have-local-offer') {
            pc.setRemoteDescription(new RTCSessionDescription(answer))
              .then(() => {
                console.log('\n✅ ANSWER REMOTE DESCRIPTION SET');
                console.log('   Signaling state after:', pc.signalingState);
                console.log('   Connection state:', pc.connectionState);
                console.log('   ICE connection state:', pc.iceConnectionState);
              })
              .catch((error: any) => {
                console.error('\n❌ ERROR SETTING ANSWER REMOTE DESCRIPTION:', fromPeerId, error);
              });
          } else {
            console.warn('\n⚠️ IGNORING ANSWER - Wrong signaling state');
            console.warn('   Expected: have-local-offer');
            console.warn('   Actual:', pc.signalingState);
            console.warn('   This might be a duplicate or race condition');
          }
        } else {
          console.error('\n❌ NO PEER CONNECTION FOUND FOR ANSWER');
          console.error('   From peer:', fromPeerId);
          console.error('   Available connections:', Array.from(prevConnections.keys()));
        }
        return prevConnections;
      });
    });

    io.on('ice-candidate', async (data: any) => {
      const { candidate, fromPeerId } = data;
      console.log('\n🧊 === ICE CANDIDATE RECEIVED ===');
      console.log('   From peer:', fromPeerId);
      
      if (candidate) {
        console.log('   Candidate type:', candidate.type);
        console.log('   Candidate protocol:', candidate.protocol);
      }

      setPeerConnections(prevConnections => {
        const pc = prevConnections.get(fromPeerId);
        if (pc && candidate) {
          console.log('\n🔄 ADDING ICE CANDIDATE');
          console.log('   Connection state:', pc.connectionState);
          console.log('   ICE connection state:', pc.iceConnectionState);
          console.log('   ICE gathering state:', pc.iceGatheringState);
          
          pc.addIceCandidate(new RTCIceCandidate(candidate))
            .then(() => {
              console.log('\n✅ ICE CANDIDATE ADDED SUCCESSFULLY');
              console.log('   ICE connection state after:', pc.iceConnectionState);
            })
            .catch(error => {
              console.error('\n❌ ERROR ADDING ICE CANDIDATE:', fromPeerId, error);
            });
        } else if (!pc) {
          console.error('\n❌ NO PEER CONNECTION FOR ICE CANDIDATE');
          console.error('   From peer:', fromPeerId);
          console.error('   Available connections:', Array.from(prevConnections.keys()));
        } else if (!candidate) {
          console.log('\n✅ ICE GATHERING COMPLETED FROM:', fromPeerId);
        }
        return prevConnections;
      });
    });
  };

  const createPeerConnection = (user: User, isInitiator: boolean): RTCPeerConnection => {
    console.log('\n=== CREATE PEER CONNECTION ===');
    console.log('Creating peer connection for:', user.username);
    console.log('User peer ID:', user.peerId);
    console.log('Is initiator:', isInitiator);
    console.log('Current meeting ID:', currentMeetingId);
    console.log('Current meeting ID ref:', currentMeetingIdRef.current);
    console.log('Local stream available:', !!(localStreamRef.current || localStream));
    console.log('Local stream tracks:', (localStreamRef.current || localStream)?.getTracks().length || 0);
    
    // Use the ref value if state is null (race condition protection)
    const activeMeetingId = currentMeetingId || currentMeetingIdRef.current;

    if (!user.peerId) {
      console.error('Cannot create peer connection: user has no peer ID');
      return null as any;
    }

    // Check if we already have a connection for this user
    const existingPc = peerConnections.get(user.peerId);
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
        console.log('Closing and replacing connection in bad state:', existingPc.connectionState);
        existingPc.close();
        setPeerConnections(prev => {
          const newMap = new Map(prev);
          newMap.delete(user.peerId);
          return newMap;
        });
      }
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local stream tracks - use modern addTrack API
    const streamToAdd = localStreamRef.current || localStream;
    if (streamToAdd) {
      console.log('Adding local stream tracks to peer connection:', streamToAdd.id);
      console.log('Stream active:', streamToAdd.active);
      console.log('Available tracks:', streamToAdd.getTracks().length);

      // Add each track individually with validation
      const tracks = streamToAdd.getTracks();
      console.log('\n🎥 ADDING TRACKS TO PEER CONNECTION');
      console.log('Total tracks to add:', tracks.length);
      
      tracks.forEach((track, index) => {
        console.log(`\n📹 Adding track ${index + 1}/${tracks.length}:`, {
          kind: track.kind,
          id: track.id,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted
        });
        
        try {
          const sender = pc.addTrack(track, streamToAdd);
          console.log('✅ Track added successfully:', track.kind);
          console.log('   Sender created:', !!sender);
          console.log('   Track in sender:', !!sender.track);
        } catch (error) {
          console.error('❌ Error adding track:', track.kind, error);
        }
      });
      
      console.log('\n📊 PEER CONNECTION SENDERS SUMMARY:');
      const senders = pc.getSenders();
      console.log('Total senders:', senders.length);
      senders.forEach((sender, index) => {
        console.log(`Sender ${index + 1}:`, {
          hasTrack: !!sender.track,
          trackKind: sender.track?.kind,
          trackEnabled: sender.track?.enabled
        });
      });

      console.log('✅ All local stream tracks processing completed');
    } else {
      console.error('❌ No local stream available when creating peer connection');
      console.error('Stream diagnostics:', {
        refStream: !!localStreamRef.current,
        stateStream: !!localStream,
        refStreamId: localStreamRef.current?.id,
        stateStreamId: (localStream as MediaStream | null)?.id || 'none'
      });
      // Don't create connection without local stream
      return null as any;
    }

    pc.addEventListener('icecandidate', (event: any) => {
      if (event.candidate && socket) {
        console.log('\n🧊 SENDING ICE CANDIDATE');
        console.log('   To user:', user.username);
        console.log('   Candidate type:', event.candidate.type);
        console.log('   Candidate protocol:', event.candidate.protocol);
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          targetPeerId: user.peerId,
          meetingId: activeMeetingId
        });
      } else if (!event.candidate) {
        console.log('\n✅ ICE GATHERING COMPLETED for:', user.username);
      }
    });

    // Handle incoming remote tracks (modern API)
    pc.addEventListener('track', (event: any) => {
      console.log('\n🎬 === RECEIVED TRACK EVENT ===');
      console.log('📥 From user:', user.username, user.peerId);
      console.log('📹 Track details:', {
        kind: event.track?.kind,
        id: event.track?.id,
        enabled: event.track?.enabled,
        readyState: event.track?.readyState,
        muted: event.track?.muted
      });
      console.log('📺 Streams in event:', event.streams?.length || 0);
      
      if (event.streams) {
        event.streams.forEach((stream: MediaStream, index: number) => {
          console.log(`📺 Stream ${index + 1}:`, {
            id: stream.id,
            active: stream.active,
            tracks: stream.getTracks().length,
            videoTracks: stream.getVideoTracks().length,
            audioTracks: stream.getAudioTracks().length
          });
        });
      }

      if (event.streams && event.streams[0]) {
        const stream = event.streams[0] as MediaStream;
        console.log('=== RECEIVED STREAM ===');
        console.log('Remote stream ID:', stream.id);
        console.log('Remote stream tracks:', stream.getTracks().length);
        console.log('Video tracks:', stream.getVideoTracks().length);
        console.log('Audio tracks:', stream.getAudioTracks().length);
        console.log('Stream active:', stream.active);

        // Ensure we have valid video tracks before setting the stream
        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();
        
        if (videoTracks.length === 0) {
          console.warn('⚠️ No video tracks in remote stream from:', user.username);
          console.warn('   Stream ID:', stream.id);
          console.warn('   Stream active:', stream.active);
          console.warn('   All tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));
          console.warn('   This might be a timing issue - tracks may be added later');
        } else {
          console.log('✅ Video tracks found:', videoTracks.length);
          videoTracks.forEach((track, i) => {
            console.log(`   Video track ${i + 1}:`, {
              enabled: track.enabled,
              readyState: track.readyState,
              muted: track.muted,
              id: track.id
            });
          });
        }
        
        if (audioTracks.length === 0) {
          console.warn('⚠️ No audio tracks in remote stream from:', user.username);
        } else {
          console.log('✅ Audio tracks found:', audioTracks.length);
        }

        // Monitor stream for dynamic track additions
        stream.addEventListener('addtrack', (event) => {
          console.log('🔄 Track added to remote stream from', user.username, ':', {
            kind: event.track.kind,
            enabled: event.track.enabled,
            readyState: event.track.readyState,
            id: event.track.id
          });
          
          // Re-check track counts
          const updatedVideoTracks = stream.getVideoTracks();
          const updatedAudioTracks = stream.getAudioTracks();
          console.log('📊 Updated track counts after addition:', {
            video: updatedVideoTracks.length,
            audio: updatedAudioTracks.length
          });
        });

        // Store stream per participant with validation
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.set(user.peerId, stream);
          console.log('🗺️ STREAM MAPPING DEBUG:');
          console.log('   Storing stream for peer ID:', user.peerId);
          console.log('   Stream ID:', stream.id);
          console.log('   Updated remote streams map, total streams:', newMap.size);
          console.log('   All stream keys:', Array.from(newMap.keys()));
          return newMap;
        });
        
        // For backward compatibility, also set the global remoteStream for 1-on-1 calls
        setRemoteStream(stream);
        setRemoteUser(user);

        // Update participants with active connection and stream status (only if participant exists)
        setParticipants(prev =>
          prev.map(p =>
            p.peerId === user.peerId
              ? { ...p, hasActiveConnection: true, hasActiveStream: true, isRefreshing: false }
              : p
          )
        );

        console.log('\n✅ REMOTE STREAM PROCESSING COMPLETED');
        console.log('   Stream attached for:', user.username);
        console.log('   Stream stored in remoteStreams map');
        console.log('   Participants updated with stream status');
      } else {
        console.error('\n❌ NO STREAM IN TRACK EVENT');
        console.error('   From user:', user.username);
        console.error('   Event details:', {
          track: !!event.track,
          streams: event.streams?.length || 0,
          receiver: !!event.receiver
        });
      }
    });

    pc.addEventListener('connectionstatechange', () => {
      console.log('Connection state changed:', pc.connectionState, 'for user:', user.username);

      if (pc.connectionState === 'connected') {
        console.log('✅ Peer connection established with:', user.username);
        // Update participant status to show active connection
        setParticipants(prev =>
          prev.map(p =>
            p.peerId === user.peerId
              ? { ...p, hasActiveConnection: true, isRefreshing: false }
              : p
          )
        );
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.log('❌ Peer connection failed/disconnected with:', user.username);
        // Update participant status
        setParticipants(prev =>
          prev.map(p =>
            p.peerId === user.peerId
              ? { ...p, hasActiveConnection: false, isRefreshing: false }
              : p
          )
        );
        
        // Attempt to reconnect after a delay
        if (pc.connectionState === 'failed') {
          setTimeout(() => {
            console.log('Attempting to recreate failed connection with:', user.username);
            // Remove failed connection
            setPeerConnections(prev => {
              const newMap = new Map(prev);
              newMap.delete(user.peerId);
              return newMap;
            });
            // Create new connection
            createPeerConnection(user, true);
          }, 3000);
        }
      } else if (pc.connectionState === 'connecting') {
        console.log('🔄 Connecting to:', user.username);
        setParticipants(prev =>
          prev.map(p =>
            p.peerId === user.peerId
              ? { ...p, hasActiveConnection: false, isRefreshing: true }
              : p
          )
        );
      }
    });

    // Store the connection before creating offer
    setPeerConnections(prev => new Map(prev.set(user.peerId, pc)));
    console.log('Stored peer connection for:', user.peerId);

    if (isInitiator) {
      console.log('Creating and sending offer to:', user.username);
      // Use modern promise-based approach with proper timing
      setTimeout(async () => {
        try {
          // Validate connection state
          if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
            console.warn('⚠️ Peer connection in invalid state for offer creation:', pc.connectionState);
            return;
          }

          console.log('\n📝 CREATING OFFER');
          console.log('   For user:', user.username);
          console.log('   Connection state:', pc.connectionState);
          console.log('   ICE connection state:', pc.iceConnectionState);
          console.log('   Signaling state:', pc.signalingState);
          
          // Check signaling state before creating offer to prevent state machine errors
          if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
            console.error('❌ CANNOT CREATE OFFER - Wrong signaling state');
            console.error('   Current state:', pc.signalingState);
            console.error('   Expected: stable or have-local-offer');
            
            if (pc.signalingState === 'have-remote-offer') {
              console.error('   🔄 OFFER COLLISION DETECTED - peer already sent us an offer');
              console.error('   We should be answering, not offering');
              
              // Handle offer collision using peer ID comparison
              const shouldBackOff = peerId < user.peerId; // Lower ID backs off
              if (shouldBackOff) {
                console.warn('   🔄 BACKING OFF - Our peer ID is lower, we should answer their offer');
                console.warn('   ✅ Skipping offer creation - will answer incoming offer instead');
                // Don't throw error - just return early and let the answer handler take over
                return;
              } else {
                console.warn('   ⚔️ STANDING GROUND - Our peer ID is higher, expecting them to back off');
                // Wait a bit and retry if they back off
                await new Promise(resolve => setTimeout(resolve, 100));
                // Check if the state changed after waiting
                const newState = pc.signalingState as string;
                if (newState === 'stable') {
                  console.log('   ✅ State reset to stable, proceeding with offer');
                } else {
                  throw new Error(`Offer collision - other peer should back off but state is still: ${newState}`);
                }
              }
            } else {
              throw new Error(`Invalid signaling state for offer creation: ${pc.signalingState}`);
            }
          }
          
          // Check senders before creating offer
          const senders = pc.getSenders();
          console.log('   Senders before offer:', senders.length);
          senders.forEach((sender, index) => {
            console.log(`   Sender ${index + 1}:`, {
              hasTrack: !!sender.track,
              kind: sender.track?.kind,
              enabled: sender.track?.enabled
            });
          });
          
          console.log('✅ SIGNALING STATE VALID - Creating offer');
          const offer = await pc.createOffer({});
          console.log('\n✅ OFFER CREATED');
          console.log('   SDP type:', offer.type);
          console.log('   SDP contains video:', offer.sdp?.includes('m=video'));
          console.log('   SDP contains audio:', offer.sdp?.includes('m=audio'));
          
          await pc.setLocalDescription(offer);
          console.log('\n💾 LOCAL DESCRIPTION SET');
          console.log('   Signaling state after:', pc.signalingState);
          
          // Use the most reliable meeting ID value - prefer ref over state for immediate updates
          const finalMeetingId = currentMeetingIdRef.current || activeMeetingId;
          const activeSocket = socketRef.current || socket;
          
          console.log('\n📤 MEETING ID RESOLUTION FOR OFFER:');
          console.log('   activeMeetingId (local var):', activeMeetingId);
          console.log('   currentMeetingId (state):', currentMeetingId);
          console.log('   currentMeetingIdRef.current:', currentMeetingIdRef.current);
          console.log('   ✅ Final meeting ID (ref || state):', finalMeetingId);
          
          if (!finalMeetingId) {
            console.error('❌ CRITICAL: No meeting ID available to send offer!');
            console.error('State:', currentMeetingId);
            console.error('Ref:', currentMeetingIdRef.current);
            console.error('Local:', activeMeetingId);
            throw new Error('No meeting ID available to send offer');
          }
          
          const offerData = {
            offer: offer,
            targetPeerId: user.peerId,
            meetingId: finalMeetingId
          };
          
          console.log('\n📤 ABOUT TO SEND OFFER:');
          console.log('   Socket connected:', activeSocket?.connected);
          console.log('   Socket ID:', activeSocket?.id);
          console.log('   Target peer:', user.peerId);
          console.log('   Meeting ID state:', activeMeetingId);
          console.log('   Meeting ID ref:', currentMeetingIdRef.current);
          console.log('   Final meeting ID:', finalMeetingId);
          console.log('   Offer data:', offerData);
          
          activeSocket?.emit('offer', offerData);
          console.log('\n📤 OFFER SENT TO:', user.username, user.peerId);
        } catch (error) {
          console.error('\n❌ ERROR CREATING/SENDING OFFER:', user.username, error);
          
          // Handle specific WebRTC state machine errors
          const errorMessage = (error as Error)?.message || String(error);
          if (errorMessage && (errorMessage.includes('have-remote-offer') || errorMessage.includes('Offer collision'))) {
            console.error('   🔄 OFFER COLLISION DETECTED - Remote peer sent offer first');
            console.error('   📊 Current signaling state:', pc.signalingState);
            console.error('   🎯 Our peer ID:', peerId);
            console.error('   🎯 Their peer ID:', user.peerId);
            
            // Check if we should back off (lower peer ID backs off)
            const shouldBackOff = peerId < user.peerId;
            if (shouldBackOff) {
              console.error('   🔄 BACKING OFF - Our peer ID is lower, waiting for their offer to answer');
              console.error('   ✅ This is expected behavior - no action needed');
              // The offer reception handler will take care of this
            } else {
              console.error('   ⚔️ STANDING GROUND - Our peer ID is higher, waiting for them to back off');
              // Retry offer creation after a short delay
              setTimeout(() => {
                console.log('   🔄 RETRYING OFFER CREATION after collision');
                if (pc.signalingState === 'stable') {
                  console.log('   ✅ State reset to stable, retrying offer');
                  // Recursively retry the offer creation by calling the same logic
                  // This would need a proper retry mechanism - for now just log
                  console.log('   ⏳ Should retry offer creation here');
                  // TODO: Implement proper retry mechanism
                }
              }, 200);
            }
          } else {
            console.error('   💥 Unknown error type:', errorMessage);
          }
        }
      }, 500); // Reduced timeout for faster connection
    }

    return pc;
  };

  const createMeetingWithSocket = (socketToUse: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      console.log('=== CREATE MEETING WITH SOCKET DEBUG ===');
      console.log('Socket provided:', !!socketToUse);
      console.log('Socket connected:', socketToUse?.connected);
      console.log('Socket ID:', socketToUse?.id);
      
      if (!socketToUse) {
        console.error('No socket provided to createMeetingWithSocket');
        reject('Socket not provided');
        return;
      }
      
      if (!socketToUse.connected) {
        console.error('Provided socket is not connected');
        reject('Socket not connected to server');
        return;
      }
      
      console.log('Emitting create-meeting event to server');
      socketToUse.emit('create-meeting', (response: any) => {
        console.log('Received response from server:', response);
        if (response && response.success) {
          console.log('🎯 CREATE MEETING SUCCESS: Setting meeting ID to:', response.meetingId);
          console.log('📋 Previous meeting ID state:', currentMeetingId);
          console.log('📋 Previous meeting ID ref:', currentMeetingIdRef.current);
          
          // Update both state and ref immediately to prevent race conditions
          setCurrentMeetingId(response.meetingId);
          currentMeetingIdRef.current = response.meetingId;
          
          console.log('✅ CREATE MEETING: Meeting ID updated to:', response.meetingId);

          // Set participants from server response
          if (response.participants) {
            const participantsWithLocalFlag = response.participants.map((participant: User) => ({
              ...participant,
              isLocal: participant.id === socketToUse.id
            }));
            setParticipants(participantsWithLocalFlag);
          } else {
            // Fallback: Add the initiator to the participants list
            const initiatorUser = {
              id: socketToUse.id,
              username: username,
              peerId: socketToUse.id,
              name: username,
              isLocal: true
            };
            setParticipants([initiatorUser]);
          }

          resolve(response.meetingId);
        } else {
          console.error('Failed to create meeting:', response?.error || 'Unknown error');
          reject(response?.error || 'Failed to create meeting');
        }
      });
    });
  };

  const createMeeting = (): Promise<string> => {
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
        console.error('Socket not connected when creating meeting - socket.connected is false');
        console.error('Socket readyState:', socket.readyState);
        reject('Socket not connected to server');
        return;
      }
      
      console.log('Emitting create-meeting event to server');
      socket.emit('create-meeting', (response: any) => {
        console.log('Received response from server:', response);
        if (response && response.success) {
          console.log('🎯 CREATE MEETING SUCCESS: Setting meeting ID to:', response.meetingId);
          console.log('📋 Previous meeting ID state:', currentMeetingId);
          console.log('📋 Previous meeting ID ref:', currentMeetingIdRef.current);
          
          // Update both state and ref immediately to prevent race conditions
          setCurrentMeetingId(response.meetingId);
          currentMeetingIdRef.current = response.meetingId;
          
          console.log('✅ CREATE MEETING: Meeting ID updated to:', response.meetingId);

          // Set participants from server response
          if (response.participants) {
            const participantsWithLocalFlag = response.participants.map((participant: User) => ({
              ...participant,
              isLocal: participant.id === socket.id
            }));
            
            // Ensure local participant is always included
            const localParticipantExists = participantsWithLocalFlag.some((p: User) => p.isLocal);
            if (!localParticipantExists) {
              const localParticipant = {
                id: socket.id,
                username: username,
                peerId: socket.id,
                name: username,
                isLocal: true
              };
              participantsWithLocalFlag.unshift(localParticipant);
              console.log('Added local participant to participants list:', localParticipant);
            }
            
            setParticipants(participantsWithLocalFlag);
            console.log('Final participants list:', participantsWithLocalFlag);
          } else {
            // Fallback: Add the initiator to the participants list
            const initiatorUser = {
              id: socket.id,
              username: username,
              peerId: socket.id,
              name: username,
              isLocal: true
            };
            setParticipants([initiatorUser]);
            console.log('Set fallback participants list:', [initiatorUser]);
          }

          resolve(response.meetingId);
        } else {
          console.error('Failed to create meeting:', response?.error || 'Unknown error');
          reject(response?.error || 'Failed to create meeting');
        }
      });
    });
  };

  const joinMeeting = (meetingId: string, socketToUse?: any): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      console.log('=== JOIN MEETING DEBUG ===');
      console.log('Meeting ID to join:', meetingId);
      console.log('Meeting ID length:', meetingId?.length);
      console.log('Meeting ID uppercase:', meetingId?.toUpperCase());
      console.log('Socket exists:', !!(socketToUse || socket));
      console.log('Socket connected:', (socketToUse || socket)?.connected);
      console.log('Socket ID:', (socketToUse || socket)?.id);
      console.log('Local stream exists:', !!localStream);
      console.log('Current peer ID:', peerId);
      
      const activeSocket = socketToUse || socket;
      
      if (!activeSocket) {
        console.error('Socket not connected when joining meeting');
        reject('Socket not connected');
        return;
      }
      
      if (!activeSocket.connected) {
        console.error('Socket not connected to server when joining meeting');
        reject('Socket not connected to server');
        return;
      }
      
      activeSocket.emit('join-meeting', meetingId, (response: any) => {
        console.log('=== JOIN MEETING RESPONSE ===');
        console.log('Full response:', response);
        
        if (response.success) {
          console.log('🎯 JOIN MEETING SUCCESS: Setting meeting ID to:', meetingId);
          console.log('📋 Previous meeting ID state:', currentMeetingId);
          console.log('📋 Previous meeting ID ref:', currentMeetingIdRef.current);
          
          // Update both state and ref immediately to prevent race conditions
          setCurrentMeetingId(meetingId);
          currentMeetingIdRef.current = meetingId;
          
          console.log('✅ JOIN MEETING: Meeting ID updated to:', meetingId);

          // Set participants from server response and mark local user
          const participantsWithLocalFlag = (response.participants || []).map((participant: User) => ({
            ...participant,
            isLocal: participant.id === activeSocket.id
          }));

          // Ensure local participant is always included
          const localParticipantExists = participantsWithLocalFlag.some((p: User) => p.isLocal);
          if (!localParticipantExists) {
            const localParticipant = {
              id: activeSocket.id,
              username: username,
              peerId: activeSocket.id,
              name: username,
              isLocal: true
            };
            participantsWithLocalFlag.unshift(localParticipant);
            console.log('Added local participant to participants list on join:', localParticipant);
          }

          setParticipants(participantsWithLocalFlag);

          console.log('Successfully joined meeting:', meetingId);
          console.log('Number of participants including self:', participantsWithLocalFlag.length);
          
          console.log('\n🔗 CREATING PEER CONNECTIONS WITH EXISTING PARTICIPANTS');
          console.log('Total existing participants:', response.participants?.length || 0);
          
          // Immediate peer connection creation for existing participants
          const existingParticipants = (response.participants || []).filter((p: User) => p.id !== activeSocket.id);
          console.log('Filtered existing participants (excluding self):', existingParticipants.length);
          
          existingParticipants.forEach((participant: User, index: number) => {
            console.log(`\n👥 Processing existing participant ${index + 1}/${existingParticipants.length}:`, {
              username: participant.username,
              peerId: participant.peerId,
              id: participant.id
            });

            // Use ref values for immediate access with fallback
            const hasStream = !!(localStreamRef.current || localStream || activeSocket.localStream);
            const currentId = peerIdRef.current || peerId || activeSocket.id;

            console.log('\n🔍 Connection validation:', {
              hasLocalStream: hasStream,
              participantPeerId: participant.peerId,
              currentPeerId: currentId,
              sameId: participant.peerId === currentId,
              streamRef: !!localStreamRef.current,
              streamState: !!localStream,
              streamSocket: !!activeSocket.localStream
            });

            if (hasStream && participant.peerId && participant.peerId !== currentId) {
              console.log('\n✅ CREATING PEER CONNECTION (joiner initiates)');
              console.log('   To existing participant:', participant.username);
              try {
                const pc = createPeerConnection(participant, true);
                if (pc) {
                  console.log('\n✅ PEER CONNECTION CREATED SUCCESSFULLY');
                } else {
                  console.error('\n❌ PEER CONNECTION CREATION FAILED');
                }
              } catch (error) {
                console.error('\n❌ ERROR CREATING PEER CONNECTION:', error);
              }
            } else {
              console.log('\n⚠️ SKIPPING PEER CONNECTION - CONDITIONS NOT MET:', {
                hasStream: hasStream,
                participantPeerId: participant.peerId,
                currentPeerId: currentId,
                isSameId: participant.peerId === currentId
              });
            }
          });
          
          resolve(true);
        } else {
          console.error('Failed to join meeting:', response.error);
          resolve(false);
        }
      });
    });
  };

  const leaveMeeting = () => {
    if (socket) {
      socket.emit('leave-meeting');
    }
    
    peerConnections.forEach(pc => pc.close());
    setPeerConnections(new Map());
    
    setCurrentMeetingId(null);
    setParticipants([]);
    setRemoteUser(null);
    setRemoteStream(null);
    setActiveCall(null);
  };

  const call = (user: User) => {
    if (!socket || !localStream) {
      Alert.alert('Not ready to make calls');
      return;
    }

    setRemoteUser(user);
    createPeerConnection(user, true);
  };

  const switchCamera = () => {
    if (localStream) {
      // @ts-ignore
      localStream.getVideoTracks().forEach((track) => track._switchCamera());
    }
  };

  const toggleMute = () => {
    if (localStream)
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
      });
  };

  const closeCall = () => {
    console.log('=== CLOSE CALL ===');
    console.log('Closing peer connections:', peerConnections.size);
    
    // Close all peer connections
    peerConnections.forEach((pc, peerId) => {
      console.log('Closing connection for peer:', peerId, 'state:', pc.connectionState);
      pc.close();
    });
    setPeerConnections(new Map());
    
    // Clean up streams
    console.log('Cleaning up streams');
    setActiveCall(null);
    setRemoteUser(null);
    setRemoteStream(null);
    setRemoteStreams(new Map());
    
    // Leave meeting and disconnect
    leaveMeeting();
    
    console.log('Call cleanup completed');
  };

  const reset = async () => {
    console.log('=== RESET WEBRTC ===');
    
    // Disconnect socket
    if (socket) {
      console.log('Disconnecting socket');
      socket.disconnect();
      setSocket(null);
      socketRef.current = null;
    }
    
    // Close all peer connections
    console.log('Closing', peerConnections.size, 'peer connections');
    peerConnections.forEach((pc, peerId) => {
      console.log('Closing connection for peer:', peerId);
      pc.close();
    });
    setPeerConnections(new Map());
    
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
    setUsername('');
    setPeerId('');
    peerIdRef.current = '';
    
    console.log('WebRTC reset completed');
  };

  const refreshParticipantVideo = async (participantPeerId: string): Promise<void> => {
    console.log('=== REFRESH PARTICIPANT VIDEO ===');
    console.log('Refreshing video for participant:', participantPeerId);
    console.log('Current meeting ID:', currentMeetingId);
    console.log('Local stream available:', !!localStream);
    console.log('Socket connected:', socket?.connected);

    if (!socket || !socket.connected) {
      console.error('Socket not connected, cannot refresh participant video');
      throw new Error('Socket not connected');
    }

    if (!localStream) {
      console.error('No local stream available, cannot refresh participant video');
      throw new Error('No local stream available');
    }

    if (!currentMeetingId) {
      console.error('Not in a meeting, cannot refresh participant video');
      throw new Error('Not in a meeting');
    }

    // Find the participant in the participants list
    const participant = participants.find(p => p.peerId === participantPeerId);
    if (!participant) {
      console.error('Participant not found in participants list:', participantPeerId);
      throw new Error('Participant not found');
    }

    console.log('Found participant:', participant.username, participant.peerId);

    // Close existing peer connection
    const existingPc = peerConnections.get(participantPeerId);
    if (existingPc) {
      console.log('Closing existing peer connection for:', participant.username);
      existingPc.close();
      setPeerConnections(prev => {
        const newMap = new Map(prev);
        newMap.delete(participantPeerId);
        return newMap;
      });
    }

    // Clear remote stream for this participant
    console.log('Clearing remote stream for:', participant.username);
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(participantPeerId);
      return newMap;
    });

    // Update participant status to indicate refreshing
    setParticipants(prev =>
      prev.map(p =>
        p.peerId === participantPeerId
          ? { ...p, isRefreshing: true, hasActiveConnection: false }
          : p
      )
    );

    try {
      console.log('Creating new peer connection for:', participant.username);
      const newPc = createPeerConnection(participant, true);

      if (!newPc) {
        throw new Error('Failed to create new peer connection');
      }

      console.log('New peer connection created successfully for:', participant.username);

      // Wait a bit for the connection to establish
      setTimeout(() => {
        console.log('Checking connection status after refresh for:', participant.username);
        const pc = peerConnections.get(participantPeerId);
        if (pc) {
          console.log('Connection state:', pc.connectionState);
          console.log('ICE connection state:', pc.iceConnectionState);
          console.log('ICE gathering state:', pc.iceGatheringState);
        }

        // Update participant status
        setParticipants(prev =>
          prev.map(p =>
            p.peerId === participantPeerId
              ? { ...p, isRefreshing: false }
              : p
          )
        );
      }, 3000);

    } catch (error) {
      console.error('Error refreshing participant video:', error);
      setParticipants(prev =>
        prev.map(p =>
          p.peerId === participantPeerId
            ? { ...p, isRefreshing: false, hasActiveConnection: false }
            : p
        )
      );
      throw error;
    }
  };

  return (
    <WebRTCContext.Provider
      value={{
        username,
        setUsername,
        peerId,
        setPeerId,
        users,
        setUsers,
        localStream,
        setLocalStream,
        remoteStream,
        setRemoteStream,
        remoteStreams,
        setRemoteStreams,
        initialize,
        call,
        switchCamera,
        toggleMute,
        isMuted,
        closeCall,
        reset,
        remoteUser,
        activeCall,
        createMeeting,
        createMeetingWithSocket,
        joinMeeting,
        leaveMeeting,
        refreshParticipantVideo,
        currentMeetingId,
        participants,
      }}>
      {children}
    </WebRTCContext.Provider>
  );
};

export default WebRTCProvider;