import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
  Share,
  ActivityIndicator
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { WebRTCContext } from '../store/WebRTCContext';
import { User } from '../store/WebRTCTypes';
import ParticipantGrid from '../components/ParticipantGrid';
import { auth } from '../config/firebase';

const { width, height } = Dimensions.get('window');

type InstantCallScreenNavigationProp = StackNavigationProp<RootStackParamList, 'InstantCallScreen'>;
type InstantCallScreenRouteProp = RouteProp<RootStackParamList, 'InstantCallScreen'>;

interface Props {
  navigation: InstantCallScreenNavigationProp;
  route: InstantCallScreenRouteProp;
}

export default function InstantCallScreen({ navigation, route }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<'front' | 'back'>('front');
  const [joinCode, setJoinCode] = useState<string>('');
  const [isWaitingForUsers, setIsWaitingForUsers] = useState(true);
  const [connectedUsers, setConnectedUsers] = useState<number>(0);
  const [isMultiParticipantMode, setIsMultiParticipantMode] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const { initialize, setUsername, localStream, remoteUser, activeCall, createMeeting, createMeetingWithSocket, currentMeetingId, leaveMeeting, participants, remoteStreams, refreshParticipantVideo, peerId } = useContext(WebRTCContext);

  useEffect(() => {
    initializeCall();
    startAnimations();
  }, []);

  const initializeCall = async () => {
    console.log('=== INSTANT CALL SCREEN INIT ===');
    console.log('Permission status:', permission?.granted);
    
    if (!permission?.granted) {
      console.log('Requesting camera permission...');
      const response = await requestPermission();
      if (!response.granted) {
        console.log('Camera permission denied');
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera permission to start a video call.',
          [
            { text: 'Cancel', onPress: () => navigation.goBack() },
            { text: 'Settings', onPress: () => navigation.goBack() }
          ]
        );
        return;
      }
      console.log('Camera permission granted');
    }

    const currentUser = auth.currentUser;
    console.log('Current user:', currentUser?.displayName || currentUser?.email);
    
    if (currentUser) {
      const username = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
      console.log('Setting username and initializing WebRTC:', username);
      setUsername(username);
      
      try {
        console.log('Initializing WebRTC...');
        const initResult = await initialize(username);
        const socket = initResult.socket || initResult; // Handle both old and new format
        console.log('WebRTC initialization completed for instant call');
        
        console.log('Creating meeting...');
        const meetingId = await createMeetingWithSocket(socket);
        console.log('Meeting created with ID:', meetingId);
        if (meetingId) {
          setJoinCode(meetingId);
        } else {
          console.error('Meeting ID is empty or undefined');
          Alert.alert('Error', 'Failed to generate meeting ID. Please try again.');
        }

      } catch (error) {
        console.error('Failed to initialize WebRTC in instant call:', error);
        Alert.alert('Connection Error', 'Failed to initialize video call. Please check your camera and microphone permissions.');
      }
    } else {
      console.warn('No user authenticated, cannot initialize WebRTC');
      Alert.alert('Authentication Error', 'You must be signed in to start a call.', [
        { text: 'Sign In', onPress: () => navigation.navigate('LoginScreen' as any) },
        { text: 'Cancel', onPress: () => navigation.goBack() }
      ]);
    }
  };

  const toggleViewMode = () => {
    setIsMultiParticipantMode(!isMultiParticipantMode);
  };


  const startAnimations = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    const pulseLoop = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]).start(() => pulseLoop());
    };
    pulseLoop();
  };

  const shareJoinCode = async () => {
    if (!joinCode) {
      Alert.alert('Please wait', 'Meeting code is still being generated.');
      return;
    }
    
    try {
      const message = `Join my WhisperLang video call!\n\nJoin Code: ${joinCode}\n\nDownload WhisperLang and enter this code to join the call with real-time translation.`;
      
      await Share.share({
        message,
        title: 'Join My Video Call',
      });
    } catch (error) {
      console.error('Error sharing join code:', error);
    }
  };

  const copyJoinCode = () => {
    if (!joinCode) {
      Alert.alert('Please wait', 'Meeting code is still being generated.');
      return;
    }
    
    Clipboard.setStringAsync(joinCode);
    Alert.alert('Copied!', 'Join code copied to clipboard');
  };

  const flipCamera = () => {
    setCameraType(cameraType === 'back' ? 'front' : 'back');
  };

  const startCall = () => {
    console.log('=== START CALL DEBUG ===');
    console.log('currentMeetingId:', currentMeetingId);
    console.log('joinCode state:', joinCode);
    console.log('activeCall:', !!activeCall);
    console.log('remoteUser:', !!remoteUser);
    
    if (activeCall || remoteUser || currentMeetingId) {
      setIsWaitingForUsers(false);
      const meetingIdToUse = currentMeetingId || joinCode;
      console.log('Meeting ID to navigate with:', meetingIdToUse);
      console.log('Navigation params will be:', {
        id: meetingIdToUse,
        type: 'instant',
        joinCode: meetingIdToUse
      });
      
      navigation.navigate('VideoCallScreen', {
        id: meetingIdToUse,
        type: 'instant',
        joinCode: meetingIdToUse
      });
    } else {
      Alert.alert('No users connected', 'Waiting for someone to join with your code.');
    }
  };

  const endCall = () => {
    leaveMeeting();
    navigation.goBack();
  };

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="camera-outline" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Camera permission required</Text>
        <TouchableOpacity style={styles.backButton} onPress={requestPermission}>
          <Text style={styles.backButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: '#6b7280', marginTop: 10 }]} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

  // Build participants list without duplication - filter out any existing local participants
  const remoteParticipants = participants.filter(p => !p.isLocal && p.peerId !== actualPeerId);
  const allParticipants = [localParticipant, ...remoteParticipants];
  
  const shouldShowMultiView = allParticipants.length > 0;

  console.log('=== INSTANT CALL SCREEN RENDER DEBUG ===');
  console.log('Should show multi view:', shouldShowMultiView);
  console.log('Local stream for grid:', !!localStream);
  console.log('Local stream ID:', localStream?.id);
  console.log('Current user for grid:', currentUser);
  console.log('All participants for grid:', allParticipants.length);
  console.log('Remote participants after filtering:', remoteParticipants.length);
  console.log('Participants from WebRTC context:', participants?.length || 0);

  // Multi-participant grid view
  if (shouldShowMultiView) {
    // Don't show multi-view until local stream is available
    if (!localStream) {
      return (
        <View style={styles.container}>
          <StatusBar style="light" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#8b5cf6" size="large" />
            <Text style={styles.loadingText}>Setting up camera...</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        
        <ParticipantGrid
          participants={allParticipants}
          localStream={localStream}
          remoteStreams={remoteStreams}
          currentUser={currentUser}
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
              <Ionicons name="camera" size={20} color="#ffffff" />
              <Text style={styles.topControlText}>Camera View</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.multiViewJoinCode}>
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0.6)']}
            style={styles.multiJoinCodeGradient}
          >
            <Text style={styles.multiJoinCodeLabel}>Join Code:</Text>
            <TouchableOpacity onPress={copyJoinCode} style={styles.multiJoinCodeButton}>
              <Text style={styles.multiJoinCodeText}>{joinCode || 'GENERATING...'}</Text>
              <Ionicons name="copy" size={16} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={shareJoinCode} style={styles.multiShareButton}>
              <Ionicons name="share" size={16} color="#ffffff" />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={styles.multiViewControls}>
          <TouchableOpacity style={styles.multiControlButton} onPress={flipCamera}>
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.multiControlGradient}
            >
              <Ionicons name="camera-reverse" size={20} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.multiEndCallButton} onPress={endCall}>
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              style={styles.multiControlGradient}
            >
              <Ionicons name="call" size={24} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.multiControlButton}>
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.multiControlGradient}
            >
              <Ionicons name="mic" size={20} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Original camera view
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <CameraView
        style={styles.camera}
        facing={cameraType}
      />

      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
        style={styles.overlay}
        locations={[0, 0.5, 1]}
      >
        <SafeAreaView style={styles.safeArea}>
          <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
            <TouchableOpacity style={styles.backBtn} onPress={endCall}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Instant Call</Text>
              <View style={styles.statusContainer}>
                <Animated.View style={[styles.statusDot, { transform: [{ scale: pulseAnim }] }]} />
                <Text style={styles.statusText}>Ready to connect</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.flipButton} onPress={toggleViewMode}>
              <Ionicons name="people" size={20} color="#ffffff" />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.joinCodeContainer, { opacity: fadeAnim }]}>
            <View style={styles.joinCodeCard}>
              <Text style={styles.joinCodeLabel}>Share this code to invite others:</Text>
              <TouchableOpacity style={styles.joinCodeBox} onPress={copyJoinCode}>
                <Text style={styles.joinCodeText}>{joinCode || 'GENERATING...'}</Text>
                <Ionicons name="copy-outline" size={20} color="#667eea" />
              </TouchableOpacity>
              <View style={styles.shareButtons}>
                <TouchableOpacity style={styles.shareButton} onPress={shareJoinCode}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.shareButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="share-outline" size={20} color="#ffffff" />
                    <Text style={styles.shareButtonText}>Share Code</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {isWaitingForUsers && (
            <Animated.View style={[styles.waitingContainer, { opacity: fadeAnim }]}>
              <Animated.View style={[styles.waitingIcon, { transform: [{ scale: pulseAnim }] }]}>
                <Ionicons name="people-outline" size={48} color="#ffffff" />
              </Animated.View>
              <Text style={styles.waitingTitle}>Waiting for others to join...</Text>
              <Text style={styles.waitingSubtitle}>
                Share your join code and start translating in real-time
              </Text>
            </Animated.View>
          )}

          <Animated.View style={[styles.controls, { opacity: fadeAnim }]}>
            <TouchableOpacity style={styles.controlButton} onPress={flipCamera}>
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                style={styles.controlButtonGradient}
              >
                <Ionicons name="camera-reverse-outline" size={24} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
              <LinearGradient
                colors={['#ef4444', '#dc2626']}
                style={styles.endCallGradient}
              >
                <Ionicons name="call" size={28} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton}>
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                style={styles.controlButtonGradient}
              >
                <Ionicons name="mic-outline" size={24} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    marginVertical: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinCodeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  joinCodeCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 20,
  },
  joinCodeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  joinCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  joinCodeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#667eea',
    letterSpacing: 4,
    marginRight: 12,
  },
  shareButtons: {
    alignItems: 'center',
  },
  shareButton: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 140,
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  waitingIcon: {
    marginBottom: 20,
  },
  waitingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  waitingSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  controlButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
  },
  endCallGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topControls: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100,
  },
  topControlButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  topControlGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  topControlText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 6,
  },
  multiViewJoinCode: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    zIndex: 100,
  },
  multiJoinCodeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  multiJoinCodeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginRight: 8,
  },
  multiJoinCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  multiJoinCodeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 2,
    marginRight: 6,
  },
  multiShareButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  multiViewControls: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    zIndex: 100,
  },
  multiControlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  multiControlGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  multiEndCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
  },
});