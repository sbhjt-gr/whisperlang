import React, { useState, useEffect } from 'react'
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native'
import { Button, Input, Text} from '@rneui/themed'
import { auth } from "../firebase.js"
export default function RegName({ navigation }) {
  const [name, setName] = useState("")
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
      <Text h3 style={{marginBottom: 30, color: '#696969'}}>Enter your full name</Text>
      <Input containerStyle={{
          width: 370
        }} placeholder="Full Name" autofocus type="text" value={name} onChangeText={ function(text) {setName(text)}} />
      <Button onPress={
        function() {
        if(!name) {
          alert('Enter your name first')
        } else { 
          navigation.navigate('RegEmailID', { name: name })
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
    },
      button: {
      marginTop: 10,
      width: 900
    },
  })