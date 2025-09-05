import React, {useContext, useLayoutEffect, useRef, useEffect, useState, useCallback} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  View,
  Animated,
  TouchableOpacity,
  Alert,
  PanResponder,
  StatusBar as RNStatusBar,
} from 'react-native';
import {RTCView} from 'react-native-webrtc';
import { StatusBar } from 'expo-status-bar';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { auth } from "../config/firebase";
import { RootStackParamList } from '../types/navigation';
import {WebRTCContext} from '../store/WebRTCContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../store/WebRTCTypes';

const {width, height} = Dimensions.get('window');

interface ParticipantWithAnimation extends User {
  scale?: Animated.Value;
  opacity?: Animated.Value;
  translateY?: Animated.Value;
}

interface VideoTile {
  id: string;
  stream: any;
  participant: User;
  isLocal: boolean;
}

type VideoCallScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VideoCallScreen'>;
type VideoCallScreenRouteProp = RouteProp<RootStackParamList, 'VideoCallScreen'>;

interface Props {
  navigation: VideoCallScreenNavigationProp;
  route: VideoCallScreenRouteProp;
}

export default function VideoCallScreen({ navigation, route }: Props) {
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

  const [controlsVisible, setControlsVisible] = useState(true);
  const [isGridMode, setIsGridMode] = useState(false);
  const [videoTiles, setVideoTiles] = useState<VideoTile[]>([]);
  const [participantAnimations, setParticipantAnimations] = useState<Map<string, ParticipantWithAnimation>>(new Map());
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const controlsAnim = useRef(new Animated.Value(1)).current;
  const localVideoPosition = useRef(new Animated.ValueXY({ x: width - 140, y: height - 280 })).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  
  const initializationAttempted = useRef(false);
  const joinAttempted = useRef(false);
  const controlsTimer = useRef<NodeJS.Timeout | null>(null);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !isGridMode,
    onMoveShouldSetPanResponder: () => !isGridMode,
    onPanResponderMove: Animated.event([null, {
      dx: localVideoPosition.x,
      dy: localVideoPosition.y,
    }], { useNativeDriver: false }),
    onPanResponderRelease: (_, gestureState) => {
      const { moveX, moveY } = gestureState;
      const snapPositions = [
        { x: 20, y: 100 },
        { x: width - 140, y: 100 },
        { x: 20, y: height - 280 },
        { x: width - 140, y: height - 280 },
      ];
      
      const closestPosition = snapPositions.reduce((closest, pos) => {
        const currentDistance = Math.sqrt(Math.pow(moveX - pos.x, 2) + Math.pow(moveY - pos.y, 2));
        const closestDistance = Math.sqrt(Math.pow(moveX - closest.x, 2) + Math.pow(moveY - closest.y, 2));
        return currentDistance < closestDistance ? pos : closest;
      });

      Animated.spring(localVideoPosition, {
        toValue: closestPosition,
        useNativeDriver: false,
        tension: 120,
        friction: 8,
      }).start();
    },
  });

  const animateParticipantEntry = useCallback((participant: User) => {
    const scale = new Animated.Value(0);
    const opacity = new Animated.Value(0);
    const translateY = new Animated.Value(50);

    const animatedParticipant: ParticipantWithAnimation = {
      ...participant,
      scale,
      opacity,
      translateY,
    };

    setParticipantAnimations(prev => new Map(prev.set(participant.id, animatedParticipant)));

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const animateParticipantExit = useCallback((participantId: string) => {
    const participant = participantAnimations.get(participantId);
    if (!participant || !participant.scale || !participant.opacity) return;

    Animated.parallel([
      Animated.spring(participant.scale, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }),
      Animated.timing(participant.opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setParticipantAnimations(prev => {
        const newMap = new Map(prev);
        newMap.delete(participantId);
        return newMap;
      });
    });
  }, [participantAnimations]);

  const buildVideoTiles = useCallback(() => {
    const tiles: VideoTile[] = [];
    const currentUser = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'You';
    const currentUserId = peerId || auth.currentUser?.uid || 'local';

    if (localStream) {
      tiles.push({
        id: `local-screennew-${currentUserId}`,
        stream: localStream,
        participant: {
          id: `local-screennew-${currentUserId}`,
          username: currentUser,
          name: currentUser,
          peerId: currentUserId,
          isLocal: true,
        },
        isLocal: true,
      });
    }

    participants.forEach(participant => {
      const stream = remoteStreams?.get(participant.peerId);
      if (stream) {
        tiles.push({
          id: participant.id,
          stream,
          participant,
          isLocal: false,
        });
      }
    });

    setVideoTiles(tiles);
  }, [localStream, participants, remoteStreams, peerId]);

  const getOptimalLayout = (count: number) => {
    if (count === 1) return { rows: 1, cols: 1, featured: true };
    if (count === 2) return { rows: 1, cols: 2, featured: false };
    if (count <= 4) return { rows: 2, cols: 2, featured: false };
    if (count <= 6) return { rows: 2, cols: 3, featured: false };
    return { rows: 3, cols: 3, featured: false };
  };

  const toggleControls = useCallback(() => {
    if (controlsTimer.current) {
      clearTimeout(controlsTimer.current);
    }

    if (controlsVisible) {
      setControlsVisible(false);
      Animated.timing(controlsAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      setControlsVisible(true);
      Animated.timing(controlsAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      controlsTimer.current = setTimeout(() => {
        setControlsVisible(false);
        Animated.timing(controlsAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 4000);
    }
  }, [controlsVisible, controlsAnim]);

  const toggleViewMode = useCallback(() => {
    setIsGridMode(prev => !prev);
    
    Animated.sequence([
      Animated.timing(backgroundAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backgroundAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backgroundAnim]);

  const handleCloseCall = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(controlsAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      closeCall();
      navigation.navigate('HomeScreen', {});
    });
  }, [fadeAnim, controlsAnim, closeCall, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    controlsTimer.current = setTimeout(() => {
      setControlsVisible(false);
      Animated.timing(controlsAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 4000);

    return () => {
      if (controlsTimer.current) {
        clearTimeout(controlsTimer.current);
      }
    };
  }, [fadeAnim, controlsAnim]);

  useEffect(() => {
    if (route.params.type === 'join' && route.params.joinCode && !joinAttempted.current) {
      joinAttempted.current = true;
    }
  }, [route.params.type, route.params.joinCode]);

  useEffect(() => {
    if (initializationAttempted.current) {
      return;
    }
    
    initializationAttempted.current = true;
    
    const initializeCall = async () => {
      const currentUser = auth.currentUser;
      const username = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
      
      try {
        let socketConnection = null;
        
        if (!localStream || (route.params.type === 'join' && !currentMeetingId)) {
          const initResult = await initialize(username);
          socketConnection = initResult.socket || initResult;
          
          if (!localStream && !initResult.localStream) {
            throw new Error('Failed to obtain local media stream after initialization');
          }
        }
        
        if (route.params.type === 'join') {
          if (joinAttempted.current) {
            if (!currentMeetingId) {
              joinAttempted.current = false;
            } else {
              return;
            }
          }
          
          joinAttempted.current = true;
          
          const meetingId = route.params.joinCode || route.params.id;
          
          if (!meetingId) {
            Alert.alert('Error', 'No meeting ID provided to join.');
            navigation.goBack();
            return;
          }
          
          const joined = await joinMeeting(meetingId, socketConnection);
          
          if (!joined) {
            Alert.alert('Error', 'Could not join meeting. Please check the meeting ID and try again.');
            joinAttempted.current = false;
            navigation.goBack();
            return;
          }
          
        } else if (route.params.type === 'instant') {
          const meetingId = route.params.joinCode || route.params.id;
          
          if (meetingId) {
            try {
              const joined = await joinMeeting(meetingId, socketConnection);
              if (!joined) {
                await createMeeting();
              }
            } catch (error) {
              await createMeeting();
            }
          }
          
        } else if (!route.params.type || route.params.type === 'create') {
          const meetingId = await createMeeting();
          
          Alert.alert(
            'Meeting Created',
            `Your meeting ID is: ${meetingId}\n\nShare this ID with participants to join the meeting.`,
            [{ text: 'OK' }]
          );
        }
        
      } catch (error) {
        initializationAttempted.current = false;
        
        Alert.alert(
          'Connection Error', 
          `Failed to initialize video call: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check your camera and microphone permissions and try again.`,
          [
            { text: 'Cancel', onPress: () => navigation.goBack() },
            { text: 'Retry', onPress: () => {
              initializationAttempted.current = false;
            }}
          ]
        );
      }
    };

    initializeCall();
  }, [route.params.type, route.params.joinCode, localStream, currentMeetingId]);

  useEffect(() => {
    buildVideoTiles();
  }, [buildVideoTiles]);

  useEffect(() => {
    participants.forEach(participant => {
      if (!participantAnimations.has(participant.id)) {
        animateParticipantEntry(participant);
      }
    });

    participantAnimations.forEach((_, participantId) => {
      if (!participants.find(p => p.id === participantId) && !participantId.startsWith('local-screennew-')) {
        animateParticipantExit(participantId);
      }
    });
  }, [participants, participantAnimations, animateParticipantEntry, animateParticipantExit]);

  const renderVideoTile = (tile: VideoTile, index: number, layout: any) => {
    const animatedParticipant = participantAnimations.get(tile.id);
    const tileWidth = layout.featured ? width : (width - 40) / layout.cols;
    const tileHeight = layout.featured ? height : (height * 0.7) / layout.rows;

    return (
      <Animated.View
        key={tile.id}
        style={[
          styles.videoTile,
          {
            width: tileWidth,
            height: tileHeight,
            opacity: animatedParticipant?.opacity || 1,
            transform: [
              { scale: animatedParticipant?.scale || 1 },
              { translateY: animatedParticipant?.translateY || 0 },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={tile.isLocal 
            ? ['rgba(139, 92, 246, 0.3)', 'rgba(236, 72, 153, 0.3)']
            : ['rgba(0, 0, 0, 0.2)', 'rgba(0, 0, 0, 0.1)']
          }
          style={styles.videoTileGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {tile.stream ? (
            <RTCView
              style={styles.videoStream}
              streamURL={tile.stream.toURL()}
              objectFit="cover"
              mirror={tile.isLocal}
              zOrder={tile.isLocal ? 1 : 0}
            />
          ) : (
            <View style={styles.noVideoContainer}>
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#ffffff" />
              </View>
              <Text style={styles.noVideoText}>Camera off</Text>
            </View>
          )}
          
          <View style={styles.participantInfoOverlay}>
            <LinearGradient
              colors={['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0.4)']}
              style={styles.participantInfoBg}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <Text style={styles.participantName}>
                {tile.participant.isLocal ? 'You' : tile.participant.name || tile.participant.username}
              </Text>
              {!tile.participant.isLocal && (
                <View style={styles.connectionIndicator}>
                  <View style={styles.connectionDot} />
                </View>
              )}
            </LinearGradient>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderGridView = () => {
    const layout = getOptimalLayout(videoTiles.length);
    
    return (
      <View style={styles.gridContainer}>
        <View style={[styles.videoGrid, { flexDirection: layout.rows === 1 ? 'row' : 'column' }]}>
          {Array.from({ length: layout.rows }, (_, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.gridRow}>
              {Array.from({ length: layout.cols }, (_, colIndex) => {
                const tileIndex = rowIndex * layout.cols + colIndex;
                const tile = videoTiles[tileIndex];
                
                if (!tile) return <View key={`empty-${tileIndex}`} style={{ flex: 1 }} />;
                
                return renderVideoTile(tile, tileIndex, layout);
              })}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderFeaturedView = () => {
    const remoteTile = videoTiles.find(tile => !tile.isLocal);
    const localTile = videoTiles.find(tile => tile.isLocal);
    
    return (
      <View style={styles.featuredContainer}>
        {remoteTile ? (
          <Animated.View style={[styles.remoteVideoContainer, { opacity: fadeAnim }]}>
            <RTCView
              style={styles.remoteVideo}
              streamURL={remoteTile.stream.toURL()}
              objectFit="cover"
            />
          </Animated.View>
        ) : (
          <Animated.View style={[styles.waitingContainer, { opacity: fadeAnim }]}>
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.2)', 'rgba(236, 72, 153, 0.2)']}
              style={styles.waitingGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.waitingContent}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={styles.waitingText}>
                  {currentMeetingId ? `Meeting: ${currentMeetingId}` : 'Setting up meeting...'}
                </Text>
                <Text style={styles.waitingSubtext}>
                  {participants?.length > 0 
                    ? `${participants.length} participant${participants.length === 1 ? '' : 's'} connected`
                    : 'Waiting for participants...'
                  }
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        )}
        
        {localTile && (
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.localVideoContainer,
              {
                transform: localVideoPosition.getTranslateTransform(),
                opacity: fadeAnim,
              },
            ]}
          >
            <LinearGradient
              colors={['#8b5cf6', '#ec4899']}
              style={styles.localVideoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <RTCView
                style={styles.localVideo}
                streamURL={localTile.stream.toURL()}
                objectFit="cover"
                mirror={true}
                zOrder={1}
              />
            </LinearGradient>
          </Animated.View>
        )}
      </View>
    );
  };

  if (!localStream) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor="black" style="light" />
        <LinearGradient
          colors={['#0f0f23', '#1a1a2e']}
          style={styles.loadingGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={styles.loadingText}>Setting up camera...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const shouldShowGrid = isGridMode || videoTiles.length > 2;

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={toggleControls}
    >
      <StatusBar backgroundColor="black" style="light" />
      <RNStatusBar hidden />
      
      <Animated.View
        style={[
          styles.backgroundOverlay,
          {
            opacity: backgroundAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.3],
            }),
          },
        ]}
      />
      
      {shouldShowGrid ? renderGridView() : renderFeaturedView()}
      
      <Animated.View
        style={[
          styles.topControls,
          {
            opacity: controlsAnim,
            transform: [
              {
                translateY: controlsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-100, 0],
                }),
              },
            ],
          },
        ]}
        pointerEvents={controlsVisible ? 'auto' : 'none'}
      >
        <TouchableOpacity style={styles.topControlButton} onPress={toggleViewMode}>
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)']}
            style={styles.topControlGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons 
              name={shouldShowGrid ? "person" : "grid"} 
              size={20} 
              color="#ffffff" 
            />
            <Text style={styles.topControlText}>
              {shouldShowGrid ? "Focus" : "Grid"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.meetingInfo}>
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)']}
            style={styles.meetingInfoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.meetingIdText}>
              {currentMeetingId ? `ID: ${currentMeetingId}` : 'Connecting...'}
            </Text>
            <Text style={styles.participantCountText}>
              {participants.length + 1} participant{participants.length === 0 ? '' : 's'}
            </Text>
          </LinearGradient>
        </View>
      </Animated.View>
      
      <Animated.View
        style={[
          styles.bottomControls,
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
          colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.1)']}
          style={styles.controlsBackground}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
        >
          <View style={styles.controlButtonsRow}>
            <TouchableOpacity
              style={[styles.controlButton, styles.secondaryButton]}
              onPress={switchCamera}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                style={styles.controlButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="camera-reverse" size={24} color="#8b5cf6" />
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, isMuted ? styles.mutedButton : styles.secondaryButton]}
              onPress={toggleMute}
            >
              <LinearGradient
                colors={isMuted ? ['#ff6b6b', '#ee5a52'] : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                style={styles.controlButtonGradient}
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
              style={[styles.controlButton, styles.endCallButton]}
              onPress={handleCloseCall}
            >
              <LinearGradient
                colors={['#ff6b6b', '#ee5a52']}
                style={styles.controlButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="call" size={28} color="#ffffff" />
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
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
    marginTop: 16,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#8b5cf6',
  },
  featuredContainer: {
    flex: 1,
  },
  remoteVideoContainer: {
    width: '100%',
    height: '100%',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  waitingGradient: {
    width: '100%',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingContent: {
    alignItems: 'center',
  },
  waitingText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  waitingSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    textAlign: 'center',
  },
  localVideoContainer: {
    position: 'absolute',
    width: 120,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  localVideoGradient: {
    flex: 1,
    padding: 3,
  },
  localVideo: {
    flex: 1,
    borderRadius: 13,
  },
  gridContainer: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  videoGrid: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
  },
  videoTile: {
    margin: 5,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  videoTileGradient: {
    flex: 1,
    padding: 2,
  },
  videoStream: {
    flex: 1,
    borderRadius: 14,
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  noVideoText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  participantInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  participantInfoBg: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  participantName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  connectionIndicator: {
    marginLeft: 8,
    alignItems: 'center',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  topControls: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    fontSize: 14,
    fontWeight: '600',
  },
  meetingInfo: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  meetingInfoGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  meetingIdText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  participantCountText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  bottomControls: {
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
  controlButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  controlButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {},
  mutedButton: {},
  endCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
});
