import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, PermissionsAndroid } from 'react-native';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library'; // Import MediaLibrary
import * as Device from 'expo-device';
import uuid from 'react-native-uuid';
import { doc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from "../firebaseConfig";
import { StatusBar } from 'expo-status-bar';

const CameraRecordPage = ({ route }) => {
const [hasCameraPermission, setHasCameraPermission] = useState(null);
const [cameraRef, setCameraRef] = useState(null);
const [isRecording, setIsRecording] = useState(false);
const [isLoading, setIsLoading] = useState(false);
const { loc_data, witness_name } = route.params;

useEffect(() => {
  (async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    const audioSet = await Audio.requestPermissionsAsync();
    setHasCameraPermission(status === 'granted' && audioSet.status === 'granted');
  
    // Request Android permissions
    await requestPermissions();
  })();
  }, []);

const requestPermissions = async () => {
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    ]);

    if (
      granted['android.permission.CAMERA'] === 'granted' &&
      granted['android.permission.RECORD_AUDIO'] === 'granted' &&
      granted['android.permission.WRITE_EXTERNAL_STORAGE'] === 'granted'
    ) {
      // Permissions granted, you can proceed with camera and recording operations
    } else {
      // Handle denied permissions, e.g., show an error message or take appropriate action
    }
  } catch (err) {
    console.warn(err);
  }
};

const takePicture = async () => {
  if (isLoading) {
    return;
  }
  if (cameraRef) {
    const photo = await cameraRef.takePictureAsync();
    saveMediaToFileSystem(photo.uri, false);
  }
};

const startRecording = async () => {

  if (cameraRef) {
    try {
      setIsRecording(true); // Set recording state before starting recording
      const videoRecordPromise = cameraRef.recordAsync();
      if (videoRecordPromise) {
        // Not saving the video to the media library, but you can save it to the file system.
        const { uri } = await videoRecordPromise;
        saveMediaToFileSystem(uri, true);
      }
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }
}

const stopRecording = async () => {
  if (cameraRef) {
    try {
      setIsRecording(false); // Set recording state after stopping recording
      const videoRecordPromise = cameraRef.stopRecording();
      if (videoRecordPromise) {
        const { uri } = await videoRecordPromise;
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  }
};

const generateFileName = (isVideo) => {
  const extension = isVideo ? 'mp4' : 'jpg';
  return `${Device.brand}_${uuid.v4()}_${Date.now()}.${extension}`;
};

const toggleRecording = () => {
  // Disable the button if still loading
  if (isLoading) {
    return;
  }
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
};

const saveMediaToMediaLibrary = async (uri) => {
  if (uri) {
    try {
      const asset = await MediaLibrary.createAssetAsync(uri);
      console.log('Saved to Expo Media Library:', asset.uri);
    } catch (error) {
      console.error('Error saving to Expo Media Library:', error);
    }
  }
};

const saveMediaToFileSystem = async (uri, isVideo) => {
  try {
    setIsLoading(true);
    if (uri) {
      const fileName = generateFileName(isVideo);
      const destinationUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.moveAsync({
        from: uri,
        to: destinationUri,
      });

      console.log('Saved to internal storage:', destinationUri);

      // After saving to internal storage, save it to the Expo Media Library
      saveMediaToMediaLibrary(destinationUri, isVideo);

      // Convert the saved file to a Blob or File object
      const blobOrFile = await convertToBlobOrFile(destinationUri);

      // Initialize Firebase Storage
      const storage = getStorage();
      const storageRef = ref(storage, `media/${fileName}`);

      // Upload the media using uploadBytes
      const snapshot = await uploadBytes(storageRef, blobOrFile);

      // Get the download URL for the uploaded file
      const downloadURL = await getDownloadURL(storageRef);

      console.log('Uploaded to Firebase Storage:', downloadURL);

      // After uploading to Firebase Storage, save the download URL to Firestore
      const documentRef = doc(db, 'profile', 'user');
      const subcollectionRef = collection(documentRef, 'data');
      const reportData = {
        expoToken: loc_data.expoToken,
        user_name: witness_name,
        alert_location: loc_data.areaName,
        lat: loc_data.lat,
        long: loc_data.long,
        date_added: serverTimestamp(),
        media_url: downloadURL, // Add the download URL to Firestore
        headquarter_id: loc_data.headquarter_id,
        headquarter_lat: loc_data.headquarter_lat,
        headquarter_long: loc_data.headquarter_long,
        headquarter_name: loc_data.headquarter_name,
        headquarter_location_name: loc_data.headquarter_location_name
      };;

      const reportData2 = {
        expoToken: loc_data.expoToken,
        user_name: witness_name,
        alert_location: loc_data.areaName,
        lat: loc_data.lat,
        long: loc_data.long,
        date_added: serverTimestamp(),
        media_url: downloadURL, // Add the download URL to Firestore
        headquarter_id: loc_data.headquarter_id2,
        headquarter_lat: loc_data.headquarter_lat2,
        headquarter_long: loc_data.headquarter_long2,
        headquarter_name: loc_data.headquarter_name2,
        headquarter_location_name: loc_data.headquarter_location_name2
      };

      // Add data to Firestore
      const newDocumentRef = await addDoc(subcollectionRef, reportData);
      const newDocumentRef2 = await addDoc(subcollectionRef, reportData2);

      // Get the auto-generated document IDs
      const newDocumentId = newDocumentRef.id;
      const newDocumentId2 = newDocumentRef2.id;

      // Nested operation to set data in 'temp_logs' collection
      await setDoc(doc(db, 'temp_logs', newDocumentId), {
        expoToken: loc_data.expoToken,
        user_name: witness_name,
        alert_location: loc_data.areaName,
        lat: loc_data.lat,
        long: loc_data.long,
        date_added: serverTimestamp(),
        media_url: downloadURL, // Add the download URL to Firestore
        headquarter_id: loc_data.headquarter_id,
        headquarter_lat: loc_data.headquarter_lat,
        headquarter_long: loc_data.headquarter_long,
        headquarter_name: loc_data.headquarter_name,
        headquarter_location_name: loc_data.headquarter_location_name,
        responded:false
      });

      // Nested operation to set data in 'temp_logs' collection
      await setDoc(doc(db, 'temp_logs', newDocumentId2), {
        expoToken: loc_data.expoToken,
        user_name: witness_name,
        alert_location: loc_data.areaName,
        lat: loc_data.lat,
        long: loc_data.long,
        date_added: serverTimestamp(),
        media_url: downloadURL, // Add the download URL to Firestore
        headquarter_id: loc_data.headquarter_id2,
        headquarter_lat: loc_data.headquarter_lat2,
        headquarter_long: loc_data.headquarter_long2,
        headquarter_name: loc_data.headquarter_name2,
        headquarter_location_name: loc_data.headquarter_location_name2,
        responded:false
      });

      // Display the location information in an alert
      const message = `Area Name: ${loc_data.areaName}\nLatitude: ${loc_data.lat}\nLongitude: ${loc_data.long}
        \nMessage is sent to the nearest Police and Rescuers!
        \nPolice Headquarter: ${loc_data.headquarter_name}\nRescuer Headquarter: ${loc_data.headquarter_name2}
        \nMessage alerted by: ${witness_name}\nAttached File: ${fileName}`;

      Alert.alert('Accident Location', message, [
        {
          text: 'OK',
          onPress: () => {
          },
        },
      ]);
      setIsLoading(false);
    }
  } catch (error) {
    console.error('Error:', error);
    // Handle any errors that occurred during the process
    // For example, display an error message to the user
    Alert.alert('Error', 'Failed to save media or upload data. Please try again.', [
      {
        text: 'OK',
        onPress: () => {
          // Handle the error, navigate to a different screen, or take other actions
        },
      },
    ]);
  }
};

// Helper function to convert the saved file to a Blob or File object
const convertToBlobOrFile = async (uri) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('Error converting to Blob:', error);
    return null;
  }
};

return (
  <View style={styles.container}>
      <StatusBar style="auto"  animated={true} hideTransitionAnimation="slide" />
    {hasCameraPermission === null ? (
      <Text>Requesting camera permission...</Text>
    ) : hasCameraPermission === false ? (
      <Text>No access to camera</Text>
    ) : (
      <View style={styles.cameraContainer}>
        <Camera
          style={styles.camera}
          type={Camera.Constants.Type.back}
          ref={(ref) => setCameraRef(ref)}
        />
      </View>
    )}
    <View style={styles.buttonsContainer}>
      <TouchableOpacity
        style={[styles.captureButton, isLoading && styles.disabledButton]}
        onPress={takePicture}
        disabled={isLoading}
      >
        <Text style={[styles.buttonText, { textAlign: 'center' }]}>
          {isLoading ? 'Sending alert...' : 'Capture'}
        </Text>
      </TouchableOpacity>

      {isLoading ? null : (
        <TouchableOpacity
          style={[styles.recordButton, isLoading && styles.disabledButton]}
          onPress={toggleRecording}
          disabled={isLoading}
        >
          <Text style={[styles.buttonText, { textAlign: 'center' }]}>
            {isRecording ? 'Stop' : 'Record'}
          </Text>
        </TouchableOpacity>
      )}
    </View>

  </View>
);
};

const styles = StyleSheet.create({
container: {
  flex: 1,
  backgroundColor:'#FFFFFF',
  padding:20,
  rowGap: 15,
  
},

cameraContainer: {
  flex: 4,
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: 30, // Adjust the radius value as needed
  overflow: 'hidden', // Ensure content is clipped by the border radius
  shadowColor: 'rgba(0 0 0 / 0.53)',
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.5,
  shadowRadius: 5,
  elevation: 5, // This is for Android
},

camera: {
  flex: 1,
  width: '100%',
  aspectRatio: 11/16, // Set the aspect ratio to match the camera preview
},

buttonsContainer: {
  flex: 1,
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius:30
},

captureButton: {
  backgroundColor: '#FF6100',
  borderRadius: 50,
  padding: 20,
  margin: 20,
  shadowColor: 'rgba(0 0 0 / 0.53)',
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.5,
  shadowRadius: 5,
  elevation: 5, // This is for Android
},

recordButton: {
  backgroundColor: '#FF6100',
  borderRadius: 50,
  padding: 20,
  margin: 20,
  shadowColor: 'rgba(0 0 0 / 0.53)',
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.5,
  shadowRadius: 5,
  elevation: 5, // This is for Android
},

buttonText: {
  color: "white",
  fontSize: 15,
  fontWeight: "bold",
},
});

export default CameraRecordPage;
