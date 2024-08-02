import React, { useLayoutEffect } from 'react';
import { ZegoUIKitPrebuiltCall, GROUP_VIDEO_CALL_CONFIG } from '@zegocloud/zego-uikit-prebuilt-call-rn'
import { View, StyleSheet, StatusBar } from 'react-native'
import { auth } from "./firebase.js"
export default function VoiceCallPage({ navigation, route }) {
    useLayoutEffect(() => {
        if(!route.params.type) {
            alert("Your meeting ID is: " + route.params.id + "\nShare with only the people needed!");
        }
    })
    return (
        <View style={styles.container}>
            <StatusBar backgroundColor='black' />
            <ZegoUIKitPrebuiltCall
                appID={43966995}
                appSign={'95369a0439f94e2972a1a00bcb47f3b4d3766f28b253e7b50d98ad771f49362b'}
                userID={auth.currentUser.uid}
                userName={auth.currentUser.displayName.split(" ").join("_")}
                callID={route.params.id.toString()}
                config={{
                    ...GROUP_VIDEO_CALL_CONFIG,
                    onOnlySelfInRoom: () => { navigation.navigate('HomeMain') },
                    onHangUp: () => { navigation.navigate('HomeMain') },
                }}
            />
        </View>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    }
})