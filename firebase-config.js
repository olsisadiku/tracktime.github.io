// Firebase Configuration
// These keys are safe to be public - security is handled by Firestore Security Rules
// Get these values from: Firebase Console > Project Settings > Your Apps > Web App

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// IMPORTANT: Set up Firestore Security Rules in Firebase Console:
//
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /tasks/{taskId} {
//       allow read, write: if true;  // Open access (for personal use)
//       // For more security, use Firebase Auth and check request.auth != null
//     }
//   }
// }
