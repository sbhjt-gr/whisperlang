import React, {useContext, useLayoutEffect, useRef, useEffect} from 'react';
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
    activeCall,
    remoteUser,
    isMuted,
    closeCall,
    toggleMute,
    switchCamera,
    initialize,
  } = useContext(WebRTCContext);

  console.log('=== WEBRTC CONTEXT STATE ===');
  console.log('Local stream:', localStream ? 'Available' : 'None');
  console.log('Remote stream:', remoteStream ? 'Available' : 'None');
  console.log('Active call:', activeCall);
  console.log('Remote user:', remoteUser);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const controlsAnim = useRef(new Animated.Value(1)).current;
  const [controlsVisible, setControlsVisible] = React.useState(true);

  useLayoutEffect(() => {
    console.log('=== VIDEO CALL SCREEN LAYOUT EFFECT ===');
    if(!route.params.type) {
        console.log('No type - showing meeting ID alert');
        alert("Your meeting ID is: " + route.params.id + "\nShare with only the people needed!");
    } else if(route.params.type === 'join' && route.params.joinCode) {
        console.log('Join type detected - showing join code alert');
        alert("Joining call with code: " + route.params.joinCode + "\nConnecting to host...");
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
    
    const initializeForJoinCode = async () => {
      if (route.params.type === 'join' && route.params.joinCode) {
        console.log('Join code detected, initializing WebRTC...');
        const currentUser = auth.currentUser;
        const username = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Anonymous';
        console.log('Using username:', username);
        
        try {
          console.log('Starting WebRTC initialization...');
          await initialize(username);
          console.log('WebRTC initialization completed');
        } catch (error) {
          console.error('Failed to initialize WebRTC:', error);
          Alert.alert('Connection Error', 'Failed to initialize video call. Please check your camera and microphone permissions.');
        }
      } else if (!route.params.type) {
        console.log('No type specified, this is likely a host creating a new meeting');
        const currentUser = auth.currentUser;
        const username = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Host';
        console.log('Using host username:', username);
        
        try {
          console.log('Starting WebRTC initialization for host...');
          await initialize(username);
          console.log('Host WebRTC initialization completed');
        } catch (error) {
          console.error('Failed to initialize WebRTC for host:', error);
          Alert.alert('Connection Error', 'Failed to initialize video call. Please check your camera and microphone permissions.');
        }
      }
    };

    initializeForJoinCode();
  }, [route.params]);

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
      
      {!activeCall && (
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
                Calling {remoteUser?.username || auth.currentUser?.displayName}
              </Text>
              <Text style={styles.callingSubtext}>Connecting...</Text>
            </View>
          </GradientCard>
        </Animated.View>
      )}
      
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