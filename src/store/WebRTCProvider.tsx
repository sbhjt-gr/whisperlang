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

const SERVER_URL = __DEV__ ? 'http://localhost:3000' : 'https://whisperlang-render.onrender.com';

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
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [participants, setParticipants] = useState<User[]>([]);

  const initialize = async (currentUsername?: string) => {
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

    const io = socketio.connect(SERVER_URL, {
      reconnection: true,
      autoConnect: true,
    });

    io.on('connect', () => {
      console.log('Socket connected successfully');
      setSocket(io);
      console.log('Registering user:', finalUsername);
      io.emit('register', finalUsername);
      setPeerId(io.id || '');
    });

    io.on('users-change', (users: User[]) => {
      setUsers(users);
    });

    io.on('user-joined', (user: User) => {
      console.log('User joined meeting:', user.username);
      setParticipants(prev => [...prev, user]);
      // Create peer connection for new user
      if (localStream) {
        createPeerConnection(user, true);
      }
    });

    io.on('user-left', (user: User) => {
      console.log('User left meeting:', user.username);
      setParticipants(prev => prev.filter(p => p.id !== user.id));
      if (user.id === remoteUser?.id) {
        setRemoteUser(null);
        setRemoteStream(null);
      }
    });

    io.on('meeting-ended', () => {
      Alert.alert('Meeting ended');
      leaveMeeting();
    });

    // WebRTC signaling handlers
    io.on('offer', async (data) => {
      const { offer, fromPeerId, fromUsername } = data;
      console.log('Received offer from:', fromUsername);
      
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
        meetingId: currentMeetingId
      });
    });

    io.on('answer', async (data) => {
      const { answer } = data;
      console.log('Received answer');
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    io.on('ice-candidate', async (data) => {
      const { candidate } = data;
      if (peerConnection && candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    setSocket(io);
  };

  const createPeerConnection = (user: User, isInitiator: boolean): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    // Add local stream
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
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0] as MediaStream);
        setRemoteUser(user);
        setActiveCall(pc);
      }
    };

    if (isInitiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        socket?.emit('offer', {
          offer: offer,
          targetPeerId: user.peerId,
          meetingId: currentMeetingId
        });
      });
    }

    setPeerConnection(pc);
    return pc;
  };

  const createMeeting = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        reject('Socket not connected');
        return;
      }
      
      socket.emit('create-meeting', (response: any) => {
        if (response.success) {
          setCurrentMeetingId(response.meetingId);
          console.log('Meeting created:', response.meetingId);
          resolve(response.meetingId);
        } else {
          reject(response.error);
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
        if (response.success) {
          setCurrentMeetingId(meetingId);
          setParticipants(response.participants || []);
          console.log('Joined meeting:', meetingId);
          
          // Create peer connections for existing participants
          response.participants?.forEach((participant: User) => {
            if (localStream) {
              createPeerConnection(participant, true);
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
    
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    
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
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    setActiveCall(null);
    setRemoteUser(null);
    setRemoteStream(null);
    leaveMeeting();
  };

  const reset = async () => {
    socket?.disconnect();
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
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
        joinMeeting,
        leaveMeeting,
        currentMeetingId,
      }}>
      {children}
    </WebRTCContext.Provider>
  );
};

export default WebRTCProvider;