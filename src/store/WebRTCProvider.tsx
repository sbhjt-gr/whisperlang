import React, {useState, useRef} from 'react';
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

  // Use refs for immediate access to current values
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerIdRef = useRef<string>('');

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
      console.log('Socket and peer ID state will be updated to:', io.id);
      
      // Store these on the socket for immediate access
      io.localStream = newStream;
      io.currentPeerId = io.id;
      console.log('Stored on socket - localStream:', !!io.localStream, 'peerId:', io.currentPeerId);
      
      setupSocketListeners(io);
      
      console.log('WebRTC initialization completed successfully');
      console.log('Socket state set successfully:', !!io);
      console.log('Socket connected:', io.connected);
      
      return io;
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

      // Add user to participants list immediately
      setParticipants(prev => {
        const exists = prev.find(p => p.peerId === user.peerId);
        if (!exists) {
          console.log('Adding user to participants list:', user.username);
          return [...prev, user];
        }
        console.log('User already in participants list:', user.username);
        return prev;
      });

      // Create peer connection for the new user (we are the initiator since we were here first)
      // Use a more reliable check for peer IDs
      const currentPeerId = peerIdRef.current || peerId || io.id;
      const shouldCreateConnection =
        user.peerId &&
        user.peerId !== currentPeerId &&
        (localStreamRef.current || localStream);

      console.log('Peer connection decision:', {
        userPeerId: user.peerId,
        currentPeerId: currentPeerId,
        hasLocalStream: !!(localStreamRef.current || localStream),
        shouldCreateConnection: shouldCreateConnection
      });

      if (shouldCreateConnection) {
        console.log('Creating peer connection for new user (we initiate):', user.username);
        // Use a shorter timeout to ensure state is settled
        setTimeout(() => {
          // Double-check conditions before creating connection
          const finalPeerId = peerIdRef.current || peerId || io.id;
          const finalStream = localStreamRef.current || localStream;

          if (finalStream && user.peerId && user.peerId !== finalPeerId) {
            console.log('Final check passed, creating peer connection');
            createPeerConnection(user, true);
          } else {
            console.log('Final check failed, skipping peer connection:', {
              hasStream: !!finalStream,
              userPeerId: user.peerId,
              finalPeerId: finalPeerId
            });
          }
        }, 500); // Reduced timeout for faster connection
      } else {
        console.log('Not creating peer connection:', {
          userPeerId: user.peerId,
          currentPeerId: currentPeerId,
          hasLocalStream: !!(localStreamRef.current || localStream)
        });
      }
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
      console.log('=== OFFER RECEIVED ===');
      console.log('Offer received from:', fromUsername, fromPeerId);
      console.log('Current meeting ID:', meetingId);
      console.log('My peer ID:', peerId);

      if (meetingId !== currentMeetingId) {
        console.warn('Received offer for different meeting, ignoring');
        return;
      }

      const user = {
        peerId: fromPeerId,
        username: fromUsername,
        id: fromPeerId
      };

      // Ensure we have the user in our participants list
      setParticipants(prev => {
        const exists = prev.find(p => p.peerId === fromPeerId);
        if (!exists) {
          console.log('Adding user to participants list from offer:', fromUsername);
          return [...prev, user];
        }
        return prev;
      });

      const pc = createPeerConnection(user, false);

      if (!pc) {
        console.error('Failed to create peer connection for offer from:', fromUsername);
        return;
      }

      try {
        console.log('Setting remote description for offer');
        await new Promise((resolve, reject) => {
          (pc as any).setRemoteDescription(new RTCSessionDescription(offer), () => {
            console.log('Remote description set for offer from:', fromUsername);
            resolve(true);
          }, (error: any) => {
            console.error('Error setting remote description:', error);
            reject(error);
          });
        });

        console.log('Creating answer for offer from:', fromUsername);
        await new Promise((resolve, reject) => {
          (pc as any).createAnswer({}, (answer: any) => {
            console.log('Answer created, setting local description');
            (pc as any).setLocalDescription(answer, () => {
              console.log('Local description set for answer, sending to:', fromUsername);

              io.emit('answer', {
                answer: answer,
                targetPeerId: fromPeerId,
                meetingId: meetingId
              });
              console.log('Answer sent to:', fromUsername, fromPeerId);
              resolve(true);
            }, (error: any) => {
              console.error('Error setting local description for answer:', error);
              reject(error);
            });
          }, (error: any) => {
            console.error('Error creating answer:', error);
            reject(error);
          });
        });
      } catch (error) {
        console.error('Error handling offer from:', fromUsername, error);
      }
    });

    io.on('answer', async (data: any) => {
      const { answer, fromPeerId } = data;
      console.log('=== ANSWER RECEIVED ===');
      console.log('Answer received from peer:', fromPeerId);

      setPeerConnections(prevConnections => {
        const pc = prevConnections.get(fromPeerId);
        if (pc) {
          console.log('Setting remote description for answer from:', fromPeerId);
          (pc as any).setRemoteDescription(new RTCSessionDescription(answer), () => {
            console.log('Remote description set successfully for:', fromPeerId);
          }, (error: any) => {
            console.error('Error setting remote description for:', fromPeerId, error);
          });
        } else {
          console.error('No peer connection found for answer from:', fromPeerId);
          console.log('Available connections:', Array.from(prevConnections.keys()));
        }
        return prevConnections;
      });
    });

    io.on('ice-candidate', async (data: any) => {
      const { candidate, fromPeerId } = data;
      console.log('=== ICE CANDIDATE RECEIVED ===');
      console.log('ICE candidate from peer:', fromPeerId);

      setPeerConnections(prevConnections => {
        const pc = prevConnections.get(fromPeerId);
        if (pc && candidate) {
          console.log('Adding ICE candidate for:', fromPeerId);
          pc.addIceCandidate(new RTCIceCandidate(candidate))
            .then(() => {
              console.log('ICE candidate added successfully for:', fromPeerId);
            })
            .catch(error => {
              console.error('Error adding ICE candidate for:', fromPeerId, error);
            });
        } else if (!pc) {
          console.error('No peer connection found for ICE candidate from:', fromPeerId);
          console.log('Available connections:', Array.from(prevConnections.keys()));
        } else if (!candidate) {
          console.warn('Received empty ICE candidate from:', fromPeerId);
        }
        return prevConnections;
      });
    });
  };

  const createPeerConnection = (user: User, isInitiator: boolean): RTCPeerConnection => {
    console.log('=== CREATE PEER CONNECTION ===');
    console.log('Creating peer connection for:', user.username);
    console.log('User peer ID:', user.peerId);
    console.log('Is initiator:', isInitiator);
    console.log('Current meeting ID:', currentMeetingId);

    if (!user.peerId) {
      console.error('Cannot create peer connection: user has no peer ID');
      return null as any;
    }

    // Check if we already have a connection for this user
    const existingPc = peerConnections.get(user.peerId);
    if (existingPc) {
      console.log('Existing peer connection found, reusing it for:', user.username);
      return existingPc;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local stream tracks - use modern addTrack API instead of deprecated addStream
    const streamToAdd = localStreamRef.current || localStream;
    if (streamToAdd) {
      console.log('Adding local stream tracks to peer connection:', streamToAdd.id);

      // Add each track individually (modern WebRTC API)
      streamToAdd.getTracks().forEach(track => {
        console.log('Adding track:', track.kind, track.id);
        pc.addTrack(track, streamToAdd);
      });

      console.log('Local stream tracks added successfully');
    } else {
      console.warn('No local stream available when creating peer connection');
      console.warn('Ref stream:', !!localStreamRef.current, 'State stream:', !!localStream);
    }

    pc.addEventListener('icecandidate', (event: any) => {
      if (event.candidate && socket) {
        console.log('Sending ICE candidate to:', user.username);
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          targetPeerId: user.peerId,
          meetingId: currentMeetingId
        });
      }
    });

    // Handle incoming remote tracks (modern API)
    pc.addEventListener('track', (event: any) => {
      console.log('=== RECEIVED TRACK ===');
      console.log('Track kind:', event.track?.kind);
      console.log('Track ID:', event.track?.id);
      console.log('Streams:', event.streams?.length || 0);
      console.log('From user:', user.username, user.peerId);

      if (event.streams && event.streams[0]) {
        const stream = event.streams[0] as MediaStream;
        console.log('=== RECEIVED STREAM ===');
        console.log('Remote stream ID:', stream.id);
        console.log('Remote stream tracks:', stream.getTracks().length);

        // Store stream per participant
        setRemoteStreams(prev => new Map(prev.set(user.peerId, stream)));
        
        // For backward compatibility, also set the global remoteStream for 1-on-1 calls
        setRemoteStream(stream);
        setRemoteUser(user);

        // Also update participants with active connection status
        setParticipants(prev =>
          prev.map(p =>
            p.peerId === user.peerId
              ? { ...p, hasActiveConnection: true }
              : p
          )
        );
      } else {
        console.error('No stream in track event');
      }
    });

    pc.addEventListener('connectionstatechange', () => {
      console.log('Connection state changed:', pc.connectionState, 'for user:', user.username);

      if ((pc as any).connectionState === 'connected') {
        console.log('✅ Peer connection established with:', user.username);
      } else if ((pc as any).connectionState === 'failed' || (pc as any).connectionState === 'disconnected') {
        console.log('❌ Peer connection failed/disconnected with:', user.username);
      }
    });

    // Store the connection before creating offer
    setPeerConnections(prev => new Map(prev.set(user.peerId, pc)));
    console.log('Stored peer connection for:', user.peerId);

    if (isInitiator) {
      console.log('Creating and sending offer to:', user.username);
      // Ensure connection is ready before creating offer
      setTimeout(() => {
        if (pc.connectionState === 'new' || pc.connectionState === 'connecting') {
          (pc as any).createOffer({}, (offer: any) => {
            console.log('Offer created for:', user.username);
            (pc as any).setLocalDescription(offer, () => {
              console.log('Local description set, sending offer');
              socket?.emit('offer', {
                offer: offer,
                targetPeerId: user.peerId,
                meetingId: currentMeetingId
              });
              console.log('Offer sent to:', user.username, user.peerId);
            }, (error: any) => {
              console.error('Error setting local description for offer:', user.username, error);
            });
          }, (error: any) => {
            console.error('Error creating offer for:', user.username, error);
          });
        } else {
          console.warn('Peer connection not in correct state for offer creation:', pc.connectionState);
        }
      }, 1000); // Wait for connection to be ready
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
          setCurrentMeetingId(response.meetingId);
          console.log('Meeting created successfully:', response.meetingId);

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
          setCurrentMeetingId(response.meetingId);
          console.log('Meeting created successfully:', response.meetingId);

          // Set participants from server response
          if (response.participants) {
            const participantsWithLocalFlag = response.participants.map((participant: User) => ({
              ...participant,
              isLocal: participant.id === socket.id
            }));
            setParticipants(participantsWithLocalFlag);
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
      console.log('Meeting ID:', meetingId);
      console.log('Socket exists:', !!(socketToUse || socket));
      console.log('Socket connected:', (socketToUse || socket)?.connected);
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
          setCurrentMeetingId(meetingId);

          // Set participants from server response and mark local user
          const participantsWithLocalFlag = (response.participants || []).map((participant: User) => ({
            ...participant,
            isLocal: participant.id === activeSocket.id
          }));

          setParticipants(participantsWithLocalFlag);

          console.log('Successfully joined meeting:', meetingId);
          console.log('Number of participants including self:', participantsWithLocalFlag.length);
          
          // Wait longer for state updates, then create peer connections
          setTimeout(() => {
            console.log('=== PEER CONNECTION CREATION TIMEOUT ===');
            console.log('Current state:', {
              localStreamState: !!localStream,
              localStreamRef: !!localStreamRef.current,
              localStreamSocket: !!activeSocket.localStream,
              peerIdState: peerId,
              peerIdRef: peerIdRef.current,
              peerIdSocket: activeSocket.currentPeerId || activeSocket.id
            });

            response.participants?.forEach((participant: User) => {
              console.log('Processing existing participant:', {
                username: participant.username,
                peerId: participant.peerId,
                id: participant.id
              });

              // Use ref values for immediate access with fallback
              const hasStream = !!(localStreamRef.current || localStream);
              const currentId = peerIdRef.current || peerId || activeSocket.id;

              console.log('Peer connection check for existing participant:', {
                hasLocalStream: hasStream,
                participantPeerId: participant.peerId,
                currentPeerId: currentId,
                sameId: participant.peerId === currentId
              });

              if (hasStream && participant.peerId && participant.peerId !== currentId) {
                console.log('✅ Creating peer connection to existing participant:', participant.username);
                createPeerConnection(participant, true);
              } else {
                console.log('❌ Skipping peer connection to existing participant - conditions not met:', {
                  hasStream: hasStream,
                  participantPeerId: participant.peerId,
                  currentPeerId: currentId,
                  isSameId: participant.peerId === currentId
                });
              }
            });
          }, 2000); // Increased timeout to ensure all state is settled
          
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
    peerConnections.forEach(pc => pc.close());
    setPeerConnections(new Map());
    setActiveCall(null);
    setRemoteUser(null);
    setRemoteStream(null);
    setRemoteStreams(new Map());
    leaveMeeting();
  };

  const reset = async () => {
    socket?.disconnect();
    peerConnections.forEach(pc => pc.close());
    setPeerConnections(new Map());
    leaveMeeting();
    setLocalStream(null);
    setRemoteStream(null);
    setRemoteStreams(new Map());
    setUsername('');
    setPeerId('');
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