import React, { useState, useEffect } from 'react'
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native'
import { Button, Input, Text} from '@rneui/themed'
import { auth } from "../firebase.js"

export default function RegName({ navigation, route }) {
  const [number, setNumber] = useState("")
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
      <Text h3 style={{marginBottom: 30, color: '#696969'}}>Enter your phone number</Text>
      <Input containerStyle={{
          width: 370
        }} placeholder="Phone Number" maxLength={10} autofocus type="number" value={number} keyboardType='decimal-pad' onChangeText={ function(text) {setNumber(text)}} />
      <Button onPress={
        function() {
        if(number.length != 10) {
          alert('Phone number should be of 10 digits.')
        } else { 
          navigation.navigate('RegEmailID', { name: route.params.name, number: number })
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