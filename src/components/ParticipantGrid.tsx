import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../interfaces/webrtc';

const { width, height } = Dimensions.get('window');

interface ParticipantGridProps {
  participants: User[];
  localStream: any;
  remoteStream: any;
  currentUser: string;
  onAddParticipant: () => void;
}

const ParticipantGrid: React.FC<ParticipantGridProps> = ({
  participants,
  localStream,
  remoteStream,
  currentUser,
  onAddParticipant,
}) => {
  // Debug logging for props
  console.log('=== PARTICIPANT GRID PROPS DEBUG ===');
  console.log('Participants count:', participants.length);
  console.log('Local stream available:', !!localStream);
  console.log('Local stream ID:', localStream?.id);
  console.log('Current user:', currentUser);
  console.log('Remote stream available:', !!remoteStream);
  console.log('Participants details:', participants.map(p => ({
    username: p.username,
    peerId: p.peerId,
    id: p.id,
    isLocal: p.isLocal
  })));
  
  // Monitor stream changes
  useEffect(() => {
    console.log('=== LOCAL STREAM CHANGED ===');
    console.log('Local stream now:', !!localStream);
    if (localStream) {
      console.log('Stream ID:', localStream.id);
      console.log('Stream tracks:', localStream.getTracks().length);
      console.log('Video tracks:', localStream.getVideoTracks().length);
      console.log('Audio tracks:', localStream.getAudioTracks().length);
    }
  }, [localStream]);
  
  const totalParticipants = participants.length + 1;
  const showAddButton = totalParticipants < 6;
  const gridCount = showAddButton ? totalParticipants + 1 : totalParticipants;
  
  const getGridLayout = (count: number) => {
    if (count <= 2) return { rows: 1, cols: 2 };
    if (count <= 4) return { rows: 2, cols: 2 };
    if (count <= 6) return { rows: 2, cols: 3 };
    return { rows: 3, cols: 3 };
  };

  const { rows, cols } = getGridLayout(gridCount);
  const participantWidth = (width - 30) / cols;
  const participantHeight = (height * 0.6) / rows;

  const renderParticipantView = (participant: User | null, index: number, isLocal = false) => {
    const isAddButton = participant === null;
    
    // Debug logging for local stream
    if (isLocal) {
      console.log('=== LOCAL PARTICIPANT RENDER DEBUG ===');
      console.log('Local stream available:', !!localStream);
      if (localStream) {
        try {
          const streamUrl = localStream.toURL();
          console.log('Local stream URL:', streamUrl);
          console.log('Stream active:', localStream.active);
          console.log('Video tracks active:', localStream.getVideoTracks().map((t: any) => t.enabled));
        } catch (error) {
          console.error('Error getting stream URL:', error);
        }
      }
      console.log('Participant:', participant);
    }
    
    return (
      <TouchableOpacity
        key={`participant-${index}`}
        style={[
          styles.participantContainer,
          {
            width: participantWidth,
            height: participantHeight,
          },
        ]}
        onPress={isAddButton ? onAddParticipant : undefined}
        activeOpacity={isAddButton ? 0.8 : 1}
      >
        <LinearGradient
          colors={
            isAddButton
              ? ['rgba(139, 92, 246, 0.3)', 'rgba(236, 72, 153, 0.3)']
              : ['rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.1)']
          }
          style={styles.participantGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {isAddButton ? (
            <View style={styles.addButtonContent}>
              <View style={styles.addIconContainer}>
                <Ionicons name="person-add" size={32} color="#ffffff" />
              </View>
              <Text style={styles.addButtonText}>Add Participant</Text>
            </View>
          ) : (
            <>
              {isLocal && localStream ? (
                <RTCView
                  style={styles.videoStream}
                  streamURL={localStream.toURL()}
                  objectFit="cover"
                  zOrder={1}
                  mirror={true}
                />
              ) : isLocal ? (
                <View style={styles.mockVideoContainer}>
                  <LinearGradient
                    colors={['#ff6b6b', '#ee5a52']}
                    style={styles.mockVideoGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.avatarContainer}>
                      <Ionicons name="videocam-off" size={40} color="#ffffff" />
                      <Text style={styles.debugText}>No Camera</Text>
                    </View>
                  </LinearGradient>
                </View>
              ) : (
                <View style={styles.mockVideoContainer}>
                  <LinearGradient
                    colors={['#4f46e5', '#7c3aed']}
                    style={styles.mockVideoGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.avatarContainer}>
                      <Ionicons name="person" size={40} color="#ffffff" />
                    </View>
                  </LinearGradient>
                </View>
              )}
              
              <View style={styles.participantInfo}>
                <LinearGradient
                  colors={['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0.6)']}
                  style={styles.nameContainer}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                >
                  <Text style={styles.participantName}>
                    {isLocal ? 'You' : participant?.name || participant?.username || `User ${index}`}
                  </Text>
                  {participant?.peerId && (
                    <View style={styles.statusIndicator}>
                      <View style={styles.connectionDot} />
                    </View>
                  )}
                </LinearGradient>
              </View>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const getAllParticipants = () => {
    // Start with remote participants from WebRTC context
    let allParticipants = [...participants];

    // Add local user only if not already present
    const localUserExists = allParticipants.some(p => p.isLocal || p.id === 'local' || p.peerId === 'local');
    if (!localUserExists) {
      allParticipants.unshift({
        username: currentUser,
        name: currentUser,
        peerId: 'local',
        id: 'local',
        isLocal: true
      });
    }

    console.log('=== PARTICIPANT GRID PARTICIPANTS ===');
    console.log('Current user:', currentUser);
    console.log('Remote participants:', participants.length);
    console.log('All participants:', allParticipants.length);
    console.log('Participants list:', allParticipants.map(p => ({
      name: p.name,
      isLocal: p.isLocal,
      peerId: p.peerId,
      id: p.id
    })));

    if (showAddButton) {
      allParticipants.push(null as any);
    }

    return allParticipants;
  };

  return (
    <View style={styles.gridContainer}>
      <View style={[styles.grid, { flexDirection: rows === 1 ? 'row' : 'column' }]}>
        {Array.from({ length: rows }, (_, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.gridRow}>
            {Array.from({ length: cols }, (_, colIndex) => {
              const participantIndex = rowIndex * cols + colIndex;
              const allParticipants = getAllParticipants();
              const participant = allParticipants[participantIndex];
              
              if (!participant && participantIndex >= allParticipants.length) {
                return <View key={`empty-${participantIndex}`} style={{ width: participantWidth, height: participantHeight }} />;
              }
              
              return renderParticipantView(
                participant,
                participantIndex,
                participant?.isLocal
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 20,
  },
  grid: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
  },
  participantContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    margin: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  participantGradient: {
    flex: 1,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoStream: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  mockVideoContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  mockVideoGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  nameContainer: {
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
  statusIndicator: {
    marginLeft: 8,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  addButtonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 14,
    width: '100%',
    height: '100%',
  },
  addIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(139, 92, 246, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  debugText: {
    color: '#ffffff',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  debugOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 4,
    borderRadius: 4,
  },
});

export default ParticipantGrid;
