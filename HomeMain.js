import { View, TouchableOpacity, StyleSheet, KeyboardAvoidingView } from 'react-native'
import React, { useState, useLayoutEffect } from 'react'
import { Button, Input, Text, Image } from '@rneui/themed'
import { auth } from "./firebase.js"

export default function HomeMain({ navigation, route }) {
  const [id, setID] = useState();
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Welcome, ' + auth?.currentUser?.displayName + '!',
      headerRight: () => <TouchableOpacity onPress={LogOut}><Text style={{color: '#fff', fontWeight: 'bold'}}>Log Out</Text></TouchableOpacity>,
      headerLeft: () => <></>
    })
  }, []);
  const meet = () => {
    if (id) {
      navigation.navigate('VideoCallPage', {id: id, type: 1})
    } else {
      alert("Enter the meeting ID!")
    }
  }
  const createMeeting = () => {
    navigation.navigate('VideoCallPage', { id: (Math.floor(Math.random() * 1000000) + 1)})
  }
  const LogOut = async () => {
    await auth.signOut().then(() => {
      navigation.replace("LoginScreen")
    });;
  }
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={styles.container}>
      <Image source={require('./image/video-call-blue.png')} style={{ width: 160, height: 160, marginBottom: 20, marginTop: 10 }} />
      <Text h3 style={{ color: '#696969', marginBottom: 12 }}>All your meetings!</Text>
            <Button
              title="Create a new meeting"
              size="lg"
              titleStyle={{ fontWeight: '700' }}
              buttonStyle={{
                backgroundColor: 'rgb(32, 137, 220)',
                borderColor: 'transparent',
                borderWidth: 0,
                borderRadius: 30,
              }}
              containerStyle={{
                width: 350,
                marginHorizontal: 50,
                marginVertical: 10,
              }}
               onPress={createMeeting}
            />
        <Text h3 style={{ marginBottom: 30, marginTop: 30, color: '#696969' }}>Join a meeting</Text>
        <Input keyboardType='decimal-pad' placeholder="Enter the meeting ID" type="number" value={id} containerStyle={{
          width: 370
        }} onChangeText={(text) => setID(text)} />
        <Button
          onPress={meet}
          title="Join the Meeting"
          size="lg"
          containerStyle={{
            width: 350,
            marginHorizontal: 50,
            marginVertical: 10,
          }} />
    </View>
    </KeyboardAvoidingView>
  )
}
const styles = StyleSheet.create({
  container: {
    top: 20,
    alignItems: "center",
  },
  input: {
    marginTop: 10
  },
  button: {
    marginTop: 10,
    marginBottom: 10
  }
})