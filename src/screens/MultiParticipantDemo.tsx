import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import ParticipantGrid from '../components/ParticipantGrid';
import { User } from '../interfaces/webrtc';

const MultiParticipantDemo: React.FC = () => {
  const [participants, setParticipants] = useState<User[]>([
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
    },
    {
      username: 'charlie_brown',
      name: 'Charlie Brown',
      peerId: 'peer_charlie_789',
      id: 'user_charlie'
    }
  ]);

  const handleAddParticipant = () => {
    if (participants.length >= 5) {
      Alert.alert('Limit Reached', 'Maximum 6 participants allowed in this demo.');
      return;
    }

    const names = ['David Wilson', 'Emma Davis', 'Frank Miller', 'Grace Taylor', 'Henry Anderson'];
    const newParticipant: User = {
      username: `user_${Date.now()}`,
      name: names[participants.length - 3] || `User ${participants.length + 1}`,
      peerId: `peer_${Date.now()}`,
      id: `user_${Date.now()}`
    };
    
    setParticipants(prev => [...prev, newParticipant]);
    
    Alert.alert(
      'Participant Added',
      `${newParticipant.name} has joined the call.`,
      [{ text: 'OK' }]
    );
  };

  const handleRemoveParticipant = () => {
    if (participants.length <= 1) {
      Alert.alert('Cannot Remove', 'At least one participant must remain.');
      return;
    }

    const removedParticipant = participants[participants.length - 1];
    setParticipants(prev => prev.slice(0, -1));
    
    Alert.alert(
      'Participant Removed',
      `${removedParticipant.name} has left the call.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor='black' style='light' />
      
      <View style={styles.header}>
        <LinearGradient
          colors={['#8b5cf6', '#ec4899']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.headerTitle}>Multi-Participant Demo</Text>
          <Text style={styles.headerSubtitle}>
            {participants.length + 1} participants • Video Conference
          </Text>
        </LinearGradient>
      </View>

      <View style={styles.gridContainer}>
        <ParticipantGrid
          participants={participants}
          localStream={null}
          remoteStream={null}
          currentUser="You"
          onAddParticipant={handleAddParticipant}
        />
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleAddParticipant}
          disabled={participants.length >= 5}
        >
          <LinearGradient
            colors={
              participants.length >= 5 
                ? ['rgba(107, 114, 128, 0.8)', 'rgba(75, 85, 99, 0.8)']
                : ['rgba(139, 92, 246, 0.9)', 'rgba(236, 72, 153, 0.9)']
            }
            style={styles.controlGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons 
              name="person-add" 
              size={24} 
              color={participants.length >= 5 ? '#9ca3af' : '#ffffff'} 
            />
            <Text style={[
              styles.controlText,
              { color: participants.length >= 5 ? '#9ca3af' : '#ffffff' }
            ]}>
              Add Participant
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleRemoveParticipant}
          disabled={participants.length <= 1}
        >
          <LinearGradient
            colors={
              participants.length <= 1
                ? ['rgba(107, 114, 128, 0.8)', 'rgba(75, 85, 99, 0.8)']
                : ['rgba(239, 68, 68, 0.9)', 'rgba(220, 38, 38, 0.9)']
            }
            style={styles.controlGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons 
              name="person-remove" 
              size={24} 
              color={participants.length <= 1 ? '#9ca3af' : '#ffffff'} 
            />
            <Text style={[
              styles.controlText,
              { color: participants.length <= 1 ? '#9ca3af' : '#ffffff' }
            ]}>
              Remove Participant
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.infoContainer}>
        <View style={styles.infoCard}>
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0.6)']}
            style={styles.infoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.infoTitle}>Demo Features</Text>
            <Text style={styles.infoText}>• Dynamic grid layout (1-6 participants)</Text>
            <Text style={styles.infoText}>• Add participant button in grid</Text>
            <Text style={styles.infoText}>• Mock video streams with avatars</Text>
            <Text style={styles.infoText}>• Connection status indicators</Text>
            <Text style={styles.infoText}>• Responsive grid resizing</Text>
            
            <Text style={styles.participantTitle}>Current Participants:</Text>
            <Text style={styles.participantText}>• You (Local user)</Text>
            {participants.map((participant, index) => (
              <Text key={participant.id} style={styles.participantText}>
                • {participant.name}
              </Text>
            ))}
          </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  gridContainer: {
    flex: 1,
    marginTop: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  controlButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  controlGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  controlText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoContainer: {
    maxHeight: 200,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  infoCard: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  infoGradient: {
    padding: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  participantTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 4,
  },
  participantText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
});

export default MultiParticipantDemo;
