import React, {useContext, useLayoutEffect, useRef, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  View,
  Animated,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {RTCView} from 'react-native-webrtc';
import IconButton from '../components/IconButton';
import ParticipantGrid from '../components/ParticipantGrid';
import icons from '../constants/icons';
import { StatusBar } from 'expo-status-bar';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { auth } from "../config/firebase";
import { RootStackParamList } from '../types/navigation';
import {WebRTCContext} from '../store/WebRTCProvider';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import GradientCard from '../components/GradientCard';
import { User } from '../interfaces/webrtc';

const {width, height} = Dimensions.get('window');

type VideoCallScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VideoCallScreen'>;
type VideoCallScreenRouteProp = RouteProp<RootStackParamList, 'VideoCallScreen'>;

interface Props {
  navigation: VideoCallScreenNavigationProp;
  route: VideoCallScreenRouteProp;
}

export default function VideoCallScreen({ navigation, route }: Props) {
  console.log('=== VIDEO CALL SCREEN INIT ===');
  console.log('Route params:', route.params);
  console.log('Call ID:', route.params?.id);
  console.log('Call type:', route.params?.type);
  console.log('Join code:', route.params?.joinCode);

  const {
    localStream,
    remoteStream,
    remoteStreams,
    activeCall,
    remoteUser,
    participants,
    isMuted,
    closeCall,
    toggleMute,
    switchCamera,
    initialize,
    createMeeting,
    joinMeeting,
    currentMeetingId,
    refreshParticipantVideo,
    peerId,
  } = useContext(WebRTCContext);

  console.log('=== WEBRTC CONTEXT STATE ===');
  console.log('Local stream:', localStream ? 'Available' : 'None');
  console.log('Remote stream:', remoteStream ? 'Available' : 'None');
  console.log('Active call:', activeCall);
  console.log('Remote user:', remoteUser);
  console.log('Participants:', participants?.length || 0, participants?.map(p => p.username));

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const controlsAnim = useRef(new Animated.Value(1)).current;
  const [controlsVisible, setControlsVisible] = React.useState(true);
  const [isMultiParticipantMode, setIsMultiParticipantMode] = useState(false);
  const [mockParticipants, setMockParticipants] = useState<User[]>([]);
  const initializationAttempted = useRef(false);

  useLayoutEffect(() => {
    console.log('=== VIDEO CALL SCREEN LAYOUT EFFECT ===');
    if(!route.params.type) {
        console.log('No type - creating new meeting');
    } else if(route.params.type === 'join' && route.params.joinCode) {
        console.log('Join type detected - will join with code:', route.params.joinCode);
    } else {
        console.log('Other type detected:', route.params.type);
    }
  });

  useEffect(() => {
    console.log('=== VIDEO CALL SCREEN MAIN EFFECT ===');
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      hideControls();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    console.log('=== WEBRTC INITIALIZATION EFFECT ===');
    
    // Prevent multiple initialization attempts
    if (initializationAttempted.current) {
      console.log('Initialization already attempted, skipping');
      return;
    }
    initializationAttempted.current = true;
    
    const initializeCall = async () => {
      const currentUser = auth.currentUser;
      const username = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
      
      try {
        let socketConnection = null;
        
        // Only initialize if we don't have local stream yet (avoid reinitializing)
        // Skip initialization for instant calls that already have a socket
        if (!localStream && route.params.type !== 'instant') {
          console.log('Starting WebRTC initialization...');
          socketConnection = await initialize(username);
          console.log('WebRTC initialization completed');
        } else {
          console.log('WebRTC already initialized or instant call, skipping initialization');
        }
        
        if (route.params.type === 'join' && route.params.joinCode) {
          console.log('Joining meeting with code:', route.params.joinCode);
          
          // Add a small delay to ensure socket state is updated
          if (socketConnection) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          const joined = await joinMeeting(route.params.joinCode, socketConnection);
          if (!joined) {
            Alert.alert('Error', 'Could not join meeting. Please check the meeting ID and try again.');
            navigation.goBack();
          }
        } else if (route.params.type === 'instant' && route.params.joinCode) {
          console.log('Entering instant call meeting:', route.params.joinCode);
          // For instant calls, the meeting was already created, just set the current meeting ID
          // setCurrentMeetingId(route.params.joinCode); // This might be managed by the context
        } else if (!route.params.type) {
          console.log('Creating new meeting...');
          
          // Add a small delay to ensure local stream state is updated
          if (socketConnection) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
          const meetingId = await createMeeting();
          Alert.alert(
            'Meeting Created',
            `Your meeting ID is: ${meetingId}\n\nShare this ID with participants to join the meeting.`,
            [{ text: 'OK' }]
          );
        }

        // Initialize mock participants for demonstration
        initializeMockParticipants();
        
      } catch (error) {
        console.error('Failed to initialize call:', error);
        Alert.alert('Connection Error', 'Failed to initialize video call. Please check your camera and microphone permissions.');
      }
    };

    initializeCall();
  }, []); // Run only once, not when route.params changes

  const initializeMockParticipants = () => {
    const mockUsers: User[] = [
      {
        username: 'alice_smith',
        name: 'Alice Smith',
        peerId: 'peer_alice_123',
        id: 'user_alice'
      },
      {
        username: 'bob_johnson',
        name: 'Bob Johnson',
        peerId: 'peer_bob_456',
        id: 'user_bob'
      }
    ];
    setMockParticipants(mockUsers);
  };

  const showControls = () => {
    setControlsVisible(true);
    Animated.timing(controlsAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideControls = () => {
    Animated.timing(controlsAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setControlsVisible(false);
    });
  };

  const toggleControls = () => {
    if (controlsVisible) {
      hideControls();
    } else {
      showControls();
      setTimeout(hideControls, 3000);
    }
  };

  const handleCloseCall = () => {
    closeCall();
    navigation.navigate('HomeScreen', {});
  };

  const toggleViewMode = () => {
    setIsMultiParticipantMode(!isMultiParticipantMode);
  };

  const handleAddParticipant = () => {
    const newParticipant: User = {
      username: `user_${Date.now()}`,
      name: `New User ${mockParticipants.length + 1}`,
      peerId: `peer_${Date.now()}`,
      id: `user_${Date.now()}`
    };
    
    setMockParticipants(prev => [...prev, newParticipant]);
    
    Alert.alert(
      'Participant Added',
      `${newParticipant.name} has been added to the call.`,
      [{ text: 'OK' }]
    );
  };

  const currentUser = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'You';
  // Check if local participant already exists in participants list
  const localParticipantExists = participants.some(p => p.isLocal || (p.peerId === actualPeerId && p.id === actualPeerId));
  
  // Use actual peerId if available, otherwise use 'local'
  const actualPeerId = peerId || 'local';
  
  // Only add local participant if it doesn't already exist
  const localParticipant = {
    username: currentUser,
    name: currentUser,
    peerId: actualPeerId,
    id: actualPeerId,
    isLocal: true
  };

  // Build participants list without duplication
  let allParticipants;
  if (currentMeetingId && participants.length > 0) {
    allParticipants = localParticipantExists ? [...participants] : [localParticipant, ...participants];
  } else {
    allParticipants = localParticipantExists ? [...participants, ...mockParticipants] : [localParticipant, ...participants, ...mockParticipants];
  }
  
  const shouldShowMultiView = isMultiParticipantMode || allParticipants.length > 1;

  console.log('=== VIDEO CALL SCREEN RENDER DEBUG ===');
  console.log('Should show multi view:', shouldShowMultiView);
  console.log('Local stream for grid:', !!localStream);
  console.log('Current user for grid:', currentUser);
  console.log('All participants for grid:', allParticipants.length);

  if (shouldShowMultiView) {
    // Don't show multi-view until local stream is available
    if (!localStream) {
      return (
        <View style={styles.container}>
          <StatusBar backgroundColor='black' style='light' />
          <View style={styles.spinnerWrapper}>
            <ActivityIndicator color="#8b5cf6" size="large" />
            <Text style={styles.callingText}>Setting up camera...</Text>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.container}
        activeOpacity={1}
        onPress={toggleControls}
      >
        <StatusBar backgroundColor='black' style='light' />
        
        <ParticipantGrid
          participants={allParticipants}
          localStream={localStream}
          remoteStreams={remoteStreams}
          currentUser={currentUser}
          onAddParticipant={handleAddParticipant}
          onRefreshParticipant={refreshParticipantVideo}
        />

        <View style={styles.topControls}>
          <TouchableOpacity
            style={styles.topControlButton}
            onPress={toggleViewMode}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)']}
              style={styles.topControlGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="person" size={20} color="#ffffff" />
              <Text style={styles.topControlText}>Single</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.topControlButton}
            onPress={handleAddParticipant}
          >
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.9)', 'rgba(236, 72, 153, 0.9)']}
              style={styles.topControlGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="person-add" size={20} color="#ffffff" />
              <Text style={styles.topControlText}>Add</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        <Animated.View
          style={[
            styles.controlsWrapper,
            {
              opacity: controlsAnim,
              transform: [
                {
                  translateY: controlsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents={controlsVisible ? 'auto' : 'none'}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)']}
            style={styles.controlsBackground}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
          >
            <View style={styles.iconsWrapper}>
              <TouchableOpacity
                style={[styles.controlButton, styles.secondaryButton]}
                onPress={switchCamera}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="camera-reverse" size={24} color="#8b5cf6" />
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.controlButton, isMuted ? styles.dangerButton : styles.secondaryButton]}
                onPress={toggleMute}
              >
                <LinearGradient
                  colors={isMuted ? ['#ff6b6b', '#ee5a52'] : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons
                    name={isMuted ? 'mic-off' : 'mic'}
                    size={24}
                    color={isMuted ? '#ffffff' : '#8b5cf6'}
                  />
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.controlButton, styles.dangerButton]}
                onPress={handleCloseCall}
              >
                <LinearGradient
                  colors={['#ff6b6b', '#ee5a52']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="call" size={24} color="#ffffff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  // Single participant view (original layout)
    
  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={toggleControls}
    >
      <StatusBar backgroundColor='black' style='light' />
      
      {remoteStream && (
        <Animated.View style={[styles.remoteStreamContainer, { opacity: fadeAnim }]}>
          <RTCView
            style={styles.remoteStream}
            streamURL={remoteStream.toURL()}
            objectFit="cover"
          />
        </Animated.View>
      )}
      
      {localStream && (
        <Animated.View
          style={[
            styles.myStreamWrapper,
            {
              opacity: fadeAnim,
              transform: [
                {
                  scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['#8b5cf6', '#ec4899']}
            style={styles.myStreamGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <RTCView
              style={styles.myStream}
              objectFit="cover"
              streamURL={localStream.toURL()}
              zOrder={1}
            />
          </LinearGradient>
        </Animated.View>
      )}
      
      {!remoteStream && (
        <Animated.View
          style={[
            styles.spinnerWrapper,
            {
              opacity: fadeAnim,
              transform: [
                {
                  scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <GradientCard colors={['rgba(0,212,170,0.3)', 'rgba(0,102,204,0.3)']} glassmorphism>
            <View style={styles.callingContent}>
              <ActivityIndicator color="#8b5cf6" size="large" />
              <Text style={styles.callingText}>
                {currentMeetingId ? `Meeting: ${currentMeetingId}` : 'Setting up meeting...'}
              </Text>
              <Text style={styles.callingSubtext}>
                {participants?.length > 0 
                  ? `${participants.length} participant${participants.length === 1 ? '' : 's'} connected`
                  : 'Waiting for participants...'
                }
              </Text>
              {participants?.length > 0 && (
                <Text style={styles.participantsList}>
                  {participants.map(p => p.username).join(', ')}
                </Text>
              )}
            </View>
          </GradientCard>
        </Animated.View>
      )}

      <View style={styles.topControls}>
        <TouchableOpacity
          style={styles.topControlButton}
          onPress={toggleViewMode}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)']}
            style={styles.topControlGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="grid" size={20} color="#ffffff" />
            <Text style={styles.topControlText}>Multi</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.topControlButton}
          onPress={handleAddParticipant}
        >
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.9)', 'rgba(236, 72, 153, 0.9)']}
            style={styles.topControlGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="person-add" size={20} color="#ffffff" />
            <Text style={styles.topControlText}>Add</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      
      <Animated.View
        style={[
          styles.controlsWrapper,
          {
            opacity: controlsAnim,
            transform: [
              {
                translateY: controlsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
          },
        ]}
        pointerEvents={controlsVisible ? 'auto' : 'none'}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)']}
          style={styles.controlsBackground}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
        >
          <View style={styles.iconsWrapper}>
            <TouchableOpacity
              style={[styles.controlButton, styles.secondaryButton]}
              onPress={switchCamera}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="camera-reverse" size={24} color="#8b5cf6" />
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, isMuted ? styles.dangerButton : styles.secondaryButton]}
              onPress={toggleMute}
            >
              <LinearGradient
                colors={isMuted ? ['#ff6b6b', '#ee5a52'] : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name={isMuted ? 'mic-off' : 'mic'}
                  size={24}
                  color={isMuted ? '#ffffff' : '#8b5cf6'}
                />
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, styles.dangerButton]}
              onPress={handleCloseCall}
            >
              <LinearGradient
                colors={['#ff6b6b', '#ee5a52']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="call" size={24} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f0f0f',
    flex: 1,
    position: 'relative',
  },
  remoteStreamContainer: {
    width: '100%',
    height: '100%',
  },
  remoteStream: {
    width: '100%',
    height: '100%',
  },
  myStreamWrapper: {
    position: 'absolute',
    bottom: 140,
    right: 20,
    height: width * 0.5,
    width: width * 0.35,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  myStreamGradient: {
    flex: 1,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myStream: {
    height: '100%',
    width: '100%',
    borderRadius: 13,
  },
  spinnerWrapper: {
    position: 'absolute',
    top: '50%',
    left: 20,
    right: 20,
    transform: [{ translateY: -100 }],
    justifyContent: 'center',
    alignItems: 'center',
  },
  callingContent: {
    alignItems: 'center',
    padding: 20,
  },
  callingText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  callingSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    textAlign: 'center',
  },
  participantsList: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  topControls: {
    position: 'absolute',
    top: 60,
    right: 20,
    flexDirection: 'column',
    gap: 10,
    zIndex: 10,
  },
  topControlButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  topControlGradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topControlText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  controlsWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  controlsBackground: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  iconsWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {},
  dangerButton: {},
}); 