import React, {useContext, useEffect} from 'react';
import {Alert, StyleSheet, Text, View, FlatList} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StackNavigationProp} from '@react-navigation/stack';
import {WebRTCContext} from '../store/WebRTCProvider';
import {User} from '../interfaces/webrtc';
import {RootStackParamList} from '../types/navigation';
import {auth} from '../config/firebase';

type UsersScreenNavigationProp = StackNavigationProp<RootStackParamList, 'UsersScreen'>;

interface Props {
  navigation: UsersScreenNavigationProp;
}

const UsersScreen = ({navigation}: Props) => {
  const {users, call, initialize, setUsername} = useContext(WebRTCContext);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser?.displayName) {
      setUsername(currentUser.displayName);
      initialize();
    }
  }, []);

  const onCall = (user: User) => {
    call(user);
    navigation.navigate('VideoCallScreen', {id: Date.now()});
  };

  const renderUser = ({item}: {item: User}) => (
    <TouchableOpacity onPress={() => onCall(item)} style={styles.userItem}>
      <Text style={styles.username}>{item.username}</Text>
      <Text style={styles.status}>
        {item.peerId ? 'Available' : 'Connecting...'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Available Users</Text>
        <Text style={styles.subtitle}>Tap a user to start a video call</Text>
      </View>
      
      {users.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No other users online</Text>
          <Text style={styles.emptySubtext}>Ask someone to join the app</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.username}
          style={styles.usersList}
        />
      )}
    </SafeAreaView>
  );
};

export default UsersScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fbfbfb',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  usersList: {
    flex: 1,
    padding: 20,
  },
  userItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  status: {
    fontSize: 14,
    color: 'rgb(32, 137, 220)',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});