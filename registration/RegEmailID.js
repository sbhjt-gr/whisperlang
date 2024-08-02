import React, { useState, useEffect } from 'react'
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native'
import { Button, Input, Text} from '@rneui/themed'
import { auth } from "../firebase.js"

export default function RegEmailID({ navigation, route }) {
    const [email, setEmail] = useState("")
    useEffect(() => {
      const unsubscribe = auth.onAuthStateChanged((authUser) =>
      {
          if(authUser) {
              navigation.replace('HomeMain')
          }
      });
      return unsubscribe;
      }, []);
  
  return (
    <KeyboardAvoidingView behavior='padding'>
      <View style={styles.bottomElement}>
      <Text h3 style={{marginBottom: 30, color: '#696969' }}>Enter your e-mail ID</Text>
      <Input placeholder="E-mail ID" containerStyle={{
          width: 370
        }} type="email" value={email} onChangeText={ function(text) {setEmail(text)} } />
      <Button onPress={
        function() {
        if(!email) {
          alert('Enter your email ID')
        } else {
          navigation.navigate('RegPassword', {email: email, name: route.params.name})
        }}} raised title="Next" containerStyle={{
          width: 350,
          marginHorizontal: 50,
          marginVertical: 10,
        }} size="lg" />
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({

    bottomElement: {
    top: 50,
    alignItems: "center",
    },  button: {
      marginTop: 10,
      width: 900
    },
  })