import React, {useState} from 'react';
import {Alert} from 'react-native';
import {
  mediaDevices,
  MediaStream,
  MediaStreamConstraints,
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
} from 'react-native-webrtc';
import socketio from 'socket.io-client';
import {WebRTCContext as WebRTCContextType, User} from '../interfaces/webrtc';

const getServerURL = () => {
  if (!__DEV__) {
    return 'https://whisperlang-render.onrender.com';
  }
  
  const { Platform } = require('react-native');
  
  if (Platform.OS === 'android') {
    return 'http://10.219.26.179:3000';
  } else if (Platform.OS === 'ios') {
    return 'http://localhost:3000';
  } else {
    return 'http://localhost:3000';
  }
};

const getServerURLs = () => {
  if (!__DEV__) {
    return ['https://whisperlang-render.onrender.com'];
  }
  
  const { Platform } = require('react-native');
  
  if (Platform.OS === 'android') {
    return [
      'http://10.219.26.179:3000',
      'http://10.0.2.2:3000',
      'http://localhost:3000'
    ];
  } else if (Platform.OS === 'ios') {
    return ['http://localhost:3000'];
  } else {
    return ['http://localhost:3000'];
  }
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
        const io = socketio.connect(url, {
          reconnection: false,
          autoConnect: true,
          timeout: 5000,
          transports: ['websocket', 'polling'],
          forceNew: true,
          upgrade: false,
        });

        return new Promise((resolve, reject) => {
          const connectionTimeout = setTimeout(() => {
            console.error(`Connection timeout for ${url}`);
            io.disconnect();
            reject(new Error(`Connection timeout: ${url}`));
          }, 8000);

          io.on('connect', () => {
            clearTimeout(connectionTimeout);
            console.log(`Socket connected successfully to: ${url}`);
            console.log('Registering user:', username);
            io.emit('register', username);
            resolve(io);
          });

          io.on('connect_error', (error) => {
            clearTimeout(connectionTimeout);
            console.error(`Connection failed for ${url}:`, error.message);
            io.disconnect();
            reject(error);
          });
        });
      } catch (error) {
        console.error(`Failed to connect to ${url}:`, error);
        if (i === urls.length - 1) {
          throw error;
        }
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
    
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: {
        mandatory: {
          minWidth: 1280,
          minHeight: 720,
          minFrameRate: 30,
        },
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
      console.log('User joined meeting:', user.username);
      setParticipants(prev => [...prev, user]);
      if (localStream) {
        createPeerConnection(user, true);
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

    io.on('offer', async (data) => {
      const { offer, fromPeerId, fromUsername, meetingId } = data;
      console.log('offer received from:', fromUsername, fromPeerId);
      
      const pc = createPeerConnection({ 
        peerId: fromPeerId, 
        username: fromUsername,
        id: fromPeerId
      }, false);
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      io.emit('answer', {
        answer: answer,
        targetPeerId: fromPeerId,
        meetingId: meetingId
      });
    });

    io.on('answer', async (data) => {
      const { answer, fromPeerId } = data;
      console.log('answer received from:', fromPeerId);
      
      setPeerConnections(prevConnections => {
        const pc = prevConnections.get(fromPeerId);
        if (pc) {
          pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
        return prevConnections;
      });
    });

    io.on('ice-candidate', async (data) => {
      const { candidate, fromPeerId } = data;
      console.log('ice candidate from:', fromPeerId);
      
      setPeerConnections(prevConnections => {
        const pc = prevConnections.get(fromPeerId);
        if (pc && candidate) {
          pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        return prevConnections;
      });
    });
  };

  const createPeerConnection = (user: User, isInitiator: boolean): RTCPeerConnection => {
    console.log('creating peer connection for:', user.username, user.peerId, 'isInitiator:', isInitiator);
    
    const existingPc = peerConnections.get(user.peerId);
    if (existingPc) {
      console.log('existing peer connection found');
      return existingPc;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          targetPeerId: user.peerId,
          meetingId: currentMeetingId
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('track received from:', user.username);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0] as MediaStream);
        setRemoteUser(user);
        setActiveCall(pc);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('connection state:', pc.connectionState, 'for:', user.username);
    };

    if (isInitiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        socket?.emit('offer', {
          offer: offer,
          targetPeerId: user.peerId,
          meetingId: currentMeetingId
        });
        console.log('offer sent to:', user.username, user.peerId);
      });
    }

    setPeerConnections(prev => new Map(prev.set(user.peerId, pc)));
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

  const joinMeeting = (meetingId: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        reject('Socket not connected');
        return;
      }
      
      socket.emit('join-meeting', meetingId, (response: any) => {
        console.log('join meeting response:', response);
        
        if (response.success) {
          setCurrentMeetingId(meetingId);
          setParticipants(response.participants || []);
          console.log('joined meeting:', meetingId, 'participants:', response.participants?.length || 0);
          
          response.participants?.forEach((participant: User) => {
            console.log('creating connection for participant:', participant.username, participant.peerId);
            if (localStream) {
              createPeerConnection(participant, true);
            }
          });
          
          resolve(true);
        } else {
          console.error('join failed:', response.error);
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
      }}>
      {children}
    </WebRTCContext.Provider>
  );
};

export default WebRTCProvider;