import React, { useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Text } from '@rneui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function ContactsScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const contacts = [
    { id: 1, name: 'John Doe', status: 'online', lastSeen: 'Active now' },
    { id: 2, name: 'Jane Smith', status: 'offline', lastSeen: '2 hours ago' },
    { id: 3, name: 'Mike Johnson', status: 'online', lastSeen: 'Active now' },
    { id: 4, name: 'Sarah Wilson', status: 'busy', lastSeen: 'In a call' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Add Contact Section */}
        <Animated.View 
          style={[
            styles.addContactSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity style={styles.addContactCard}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.addContactGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="person-add-outline" size={24} color="#ffffff" />
              <Text style={styles.addContactText}>Add New Contact</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Contacts List */}
        <Animated.View 
          style={[
            styles.contactsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Your Contacts</Text>
          
          {contacts.map((contact, index) => (
            <Animated.View 
              key={contact.id}
              style={[
                styles.contactCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <View style={styles.contactInfo}>
                <View style={[styles.avatar, { backgroundColor: getAvatarColor(index) }]}>
                  <Text style={styles.avatarText}>{contact.name.charAt(0)}</Text>
                </View>
                <View style={styles.contactDetails}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <View style={styles.statusContainer}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(contact.status) }]} />
                    <Text style={styles.lastSeen}>{contact.lastSeen}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.callButton}>
                <Ionicons name="videocam-outline" size={20} color="#667eea" />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const getAvatarColor = (index: number) => {
  const colors = ['#667eea', '#ff9a9e', '#a8edea', '#fecfef', '#764ba2'];
  return colors[index % colors.length];
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'online': return '#10b981';
    case 'busy': return '#f59e0b';
    case 'offline': return '#6b7280';
    default: return '#6b7280';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  addContactSection: {
    marginBottom: 32,
  },
  addContactCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  addContactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  addContactText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  contactsSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  contactCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
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
    marginRight: 6,
  },
  lastSeen: {
    fontSize: 12,
    color: '#6b7280',
  },
  callButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
});
