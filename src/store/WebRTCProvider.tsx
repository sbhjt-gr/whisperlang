import React, {useState} from 'react';
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

const getServerURL = () => {
  return 'https://whisperlang-render.onrender.com';
};

const getServerURLs = () => {
  return ['https://whisperlang-render.onrender.com'];
};

const SERVER_URL = getServerURL();

const ICE_SERVERS = {
  iceServers: [
    {
      urls: [
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ],
};

const initialValues: WebRTCContextType = {
  username: '',
  peerId: '',
  users: [],
  localStream: null,
  remoteStream: null,
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
  const [remoteUser, setRemoteUser] = useState<User | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(initialValues.isMuted);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map());
  const [participants, setParticipants] = useState<User[]>([]);

    const connectWithFallback = async (urls: string[], username: string): Promise<any> => {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`Attempting to connect to: ${url} (attempt ${i + 1}/${urls.length})`);
      
      try {
        const io = socketio(url, {
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 1000,
          autoConnect: true,
          timeout: 20000,
          transports: ['polling', 'websocket'],
          forceNew: true,
          upgrade: true,
        });

        return new Promise((resolve, reject) => {
          const connectionTimeout = setTimeout(() => {
            console.error(`Connection timeout for ${url}`);
            io.disconnect();
            reject(new Error(`Connection timeout: ${url}`));
          }, 25000);

          io.on('connect', () => {
            clearTimeout(connectionTimeout);
            console.log(`Socket connected successfully to: ${url}`);
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
            console.error(`Connection failed for ${url}:`, error.message);
            console.error('Error type:', error.type);
            console.error('Error description:', error.description);
            io.disconnect();
            reject(error);
          });

          io.on('disconnect', (reason: any) => {
            console.log(`Disconnected from ${url}:`, reason);
          });

          io.on('reconnect', () => {
            console.log(`Reconnected to ${url}`);
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
  };

  const initialize = async (currentUsername?: string): Promise<any> => {
    console.log('=== WEBRTC INITIALIZE START ===');
    
    const finalUsername = currentUsername || username || 'User';
    console.log('Using username:', finalUsername);
    setUsername(finalUsername);
    
    const constraints = {
      audio: true,
      video: {
        width: { min: 1280 },
        height: { min: 720 },
        frameRate: { min: 30 },
        facingMode: 'user',
      },
    };

    try {
      console.log('Requesting user media with constraints:', constraints);
      const newStream = await mediaDevices.getUserMedia(constraints);
      console.log('Got local stream:', newStream.id);
      setLocalStream(newStream as MediaStream);
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
      
      setParticipants(prev => {
        const updated = [...prev, user];
        console.log('Updated participants list:', updated.map(p => p.username));
        return updated;
      });
      
      // Create peer connection for the new user (we are the initiator since we were here first)
      if (localStream && user.peerId && user.peerId !== peerId) {
        console.log('Creating peer connection for new user (we initiate):', user.username);
        setTimeout(() => {
          createPeerConnection(user, true);
        }, 500);
      } else {
        console.log('Not creating peer connection:', {
          hasLocalStream: !!localStream,
          userPeerId: user.peerId,
          currentPeerId: peerId,
          sameId: user.peerId === peerId
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
      
      const pc = createPeerConnection(user, false);
      
      try {
        (pc as any).setRemoteDescription(new RTCSessionDescription(offer), () => {
          console.log('Remote description set for offer from:', fromUsername);
          
          (pc as any).createAnswer({}, (answer: any) => {
            (pc as any).setLocalDescription(answer, () => {
              console.log('Answer created and local description set');
              
              io.emit('answer', {
                answer: answer,
                targetPeerId: fromPeerId,
                meetingId: meetingId
              });
              console.log('Answer sent to:', fromUsername, fromPeerId);
            }, (error: any) => {
              console.error('Error setting local description for answer:', error);
            });
          }, (error: any) => {
            console.error('Error creating answer:', error);
          });
        }, (error: any) => {
          console.error('Error setting remote description:', error);
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
    
    const existingPc = peerConnections.get(user.peerId);
    if (existingPc) {
      console.log('Existing peer connection found, reusing it');
      return existingPc;
    }

    if (!user.peerId) {
      console.error('Cannot create peer connection: user has no peer ID');
      return null as any;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    // Add local stream tracks
    if (localStream) {
      console.log('Adding local stream to peer connection');
      // Use addStream for React Native WebRTC compatibility
      (pc as any).addStream(localStream);
      console.log('Local stream added successfully');
    } else {
      console.warn('No local stream available when creating peer connection');
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

    pc.addEventListener('addstream', (event: any) => {
      console.log('=== RECEIVED STREAM ===');
      console.log('Stream received from:', user.username);
      console.log('Stream ID:', event.stream?.id);
      console.log('Stream tracks:', event.stream?.getTracks()?.length);
      
      if (event.stream) {
        console.log('Setting remote stream from:', user.username);
        setRemoteStream(event.stream as MediaStream);
        setRemoteUser(user);
        setActiveCall(pc);
        
        // Also update participants with active connection status
        setParticipants(prev => 
          prev.map(p => 
            p.peerId === user.peerId 
              ? { ...p, connected: true } 
              : p
          )
        );
      } else {
        console.error('No stream in onaddstream event');
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
      (pc as any).createOffer({}, (offer: any) => {
        (pc as any).setLocalDescription(offer, () => {
          socket?.emit('offer', {
            offer: offer,
            targetPeerId: user.peerId,
            meetingId: currentMeetingId
          });
          console.log('Offer sent to:', user.username, user.peerId);
        }, (error: any) => {
          console.error('Error setting local description for:', user.username, error);
        });
      }, (error: any) => {
        console.error('Error creating offer for:', user.username, error);
      });
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
          setParticipants(response.participants || []);
          console.log('Successfully joined meeting:', meetingId);
          console.log('Number of existing participants:', response.participants?.length || 0);
          
          // Wait a bit for local stream to be ready, then create peer connections
          setTimeout(() => {
            response.participants?.forEach((participant: User) => {
              console.log('Creating peer connection for existing participant:', {
                username: participant.username,
                peerId: participant.peerId,
                id: participant.id
              });
              
              if (localStream && participant.peerId && participant.peerId !== peerId) {
                console.log('Initiating connection to participant:', participant.username);
                createPeerConnection(participant, true);
              } else {
                console.log('Skipping peer connection:', {
                  hasLocalStream: !!localStream,
                  participantPeerId: participant.peerId,
                  currentPeerId: peerId,
                  sameId: participant.peerId === peerId
                });
              }
            });
          }, 1000);
          
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
    leaveMeeting();
  };

  const reset = async () => {
    socket?.disconnect();
    peerConnections.forEach(pc => pc.close());
    setPeerConnections(new Map());
    leaveMeeting();
    setLocalStream(null);
    setRemoteStream(null);
    setUsername('');
    setPeerId('');
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
        currentMeetingId,
        participants,
      }}>
      {children}
    </WebRTCContext.Provider>
  );
};

export default WebRTCProvider;