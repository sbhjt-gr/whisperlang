import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Modal, Image, useWindowDimensions, Platform} from 'react-native'
import { Button, Input, Text } from '@rneui/themed'
import { auth } from "../firebase.js"
import { signInWithEmailAndPassword } from 'firebase/auth';
import * as Progress from 'react-native-progress';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [ isLoading, setIsLoading ] = useState(false);
  const {width} = useWindowDimensions();
  const [password, setPassword] = useState("");
  const signIn = async () => {
    if (email && password) {
      try {
        setIsLoading(true)
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        alert(err)
        setIsLoading(false)
      }
    } else {
      alert("Enter all your details first!")
    }
  }
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => <></>
    })
  }, []);
  
  useEffect(() => {
    setIsLoading(true)
    const unsubscribe = auth.onAuthStateChanged((authUser) =>
    {
        if(authUser) {
            navigation.replace('HomeMain', {signedUp: 0})
        } else {
          setIsLoading(false)
        }
    });
    return unsubscribe;
    }, []);
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
      <Modal visible={isLoading} transparent>
        <View style={styles.modal}>
        <Progress.Bar width={width*.6} indeterminate={true}  />
        </View>
      </Modal>
      <Image source={require('../assets/video-call-blue.png')} style={{ width: 160, height: 160, marginBottom: 26 }} />
      <Text h3 style={{ color: '#696969', marginBottom: -33 }}>Log into your account{'\n'}</Text>
      <Text style={{ color: '#696969', marginBottom: 30, fontSize: 13 }}>(Project done under Bengal Institute of Technology)</Text><Input placeholder="E-mail ID" type="email" value={email} containerStyle={{ width: 370 }} onChangeText={(text) => setEmail(text)} />
      <Input placeholder="Password" secureTextEntry type="text" value={password} onChangeText={(text) => setPassword(text)} onSubmitEditing={signIn} containerStyle={{
        width: 370
      }} /><Button onPress={signIn} title="Log In" containerStyle={{
          width: 350,
          marginHorizontal: 50,
          marginVertical: 10,
        }} size="lg" /><Button onPress={() => {
          navigation.navigate('RegName');
        }} title="Register" size="lg" type="outline" containerStyle={{
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
    top: '9%',
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    marginTop: 10,
  },
  button: {
    marginTop: 10,
    marginBottom: 10,
  },
  modal: {
    flex:1,
    backgroundColor:'#eee',
    opacity:.8,
    alignItems:'center', 
    justifyContent:'center',
  },
})