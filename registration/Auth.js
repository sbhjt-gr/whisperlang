// import auth from "@react-native-firebase/auth"

// const signUp = (fullname, email, password) => {
//     if(!fullname || !email || !password){
//         alert('Enter your data first')
//     } else {
//         return auth().createUserWithEmailAndPassword(email.trim(),password)
//         .then( cred => {
//             const {uid} = cred.user;
//             auth().currentUser.updateProfile(
//                 {
//                     displayName: fullname
//                 });
//                 return uid
//             }).catch( err => alert(err.code, err.message))
//         };
//     }

// const signIn = (email, password) => {
//     if (!email || !password) {
//         alert('Login Error')
//     } else {
//         return auth().signInWithEmailAndPassword(email.trim(), password)
//         .then(() => {
//             console.log(auth().currentUser.uid)
//         }).catch( err => alert(err.code, err.message))
//     }
// }

// const signOut = () => {
//     return auth().signOut()
// }

// const Auth = {
//     signUp,
//     signIn,
//     signOut
// }

// export default Auth