import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Modal, Image, useWindowDimensions} from 'react-native'
import { Button, Input, Text } from '@rneui/themed';
import { auth } from "../firebase.js"
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import * as Progress from 'react-native-progress';

export default function RegPassword({ navigation, route }) {
  const [ isLoading, setIsLoading ] = useState(false);
  const {width} = useWindowDimensions();
  const [password, setPassword] = useState("");
  const signUp = async () => {
    if(password) {
      try {
        setIsLoading(true)
        const { user } = await createUserWithEmailAndPassword(auth, route.params.email, password);
        await updateProfile(user, {
          displayName: route.params.name,
        });
      } catch (error) {
        alert(error.message)
        setIsLoading(false)
      }
    } else {
      alert("Create a password first!")
    }
  };
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((authUser) =>
    {
        if(authUser) {
            navigation.replace('HomeMain', {signedUp: 1})
        }
    });
    return unsubscribe;
    }, []);
  return (
    <KeyboardAvoidingView behavior='padding'>
      <View style={styles.bottomElement}>
        <Modal visible={isLoading} transparent>
          <View style={styles.modal}>
          <Progress.Bar width={width*.6} indeterminate={true}  />
          </View>
        </Modal>
        <Text h3 style={{ marginBottom: 30, color: '#696969' }}>Set a password</Text>
        <Input
          placeholder="Set Password"
          containerStyle={{
            width: 370
          }}
          secureTextEntry
          type="password"
          value={password}
          onChangeText={text => setPassword(text)}
          onSubmitEditing={signUp}
        />
        <Button onPress={signUp} raised title="Sign Up" containerStyle={{
          width: 350,
          marginHorizontal: 50,
          marginVertical: 10,
        }} size="lg" />
      </View>
      <Text>{route.params.number}</Text>
    </KeyboardAvoidingView>
  )
}
const styles = StyleSheet.create({
  bottomElement: {
    top: 50,
    alignItems: "center",
  },
    button: {
    marginTop: 10,
    width: 900
  },
  modal:{
    flex:1,
    backgroundColor:'#eee',
    opacity:.8,
    alignItems:'center', 
    justifyContent:'center',
  },
})