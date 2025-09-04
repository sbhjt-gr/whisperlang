import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import {
  SIGNALING_SERVER_URL,
  FALLBACK_SERVER_URLS,
  NODE_ENV,
  WEBRTC_TIMEOUT,
} from '@env';

const EnvDebug = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.title}>Environment Variables Debug</Text>
        
        <Text style={styles.label}>SIGNALING_SERVER_URL:</Text>
        <Text style={styles.value}>{SIGNALING_SERVER_URL || 'undefined'}</Text>
        
        <Text style={styles.label}>FALLBACK_SERVER_URLS:</Text>
        <Text style={styles.value}>{FALLBACK_SERVER_URLS || 'undefined'}</Text>
        
        <Text style={styles.label}>NODE_ENV:</Text>
        <Text style={styles.value}>{NODE_ENV || 'undefined'}</Text>
        
        <Text style={styles.label}>WEBRTC_TIMEOUT:</Text>
        <Text style={styles.value}>{WEBRTC_TIMEOUT || 'undefined'}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  section: {
    marginVertical: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    color: '#333',
  },
  value: {
    fontSize: 14,
    marginTop: 5,
    color: '#666',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
  },
});

export default EnvDebug;
