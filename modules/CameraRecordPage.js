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


const CameraRecordPage = ({ route }) => {
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [cameraRef, setCameraRef] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const { loc_data } = route.params;

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
  

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      const audioSet = await Audio.requestPermissionsAsync();
      setHasCameraPermission(status === 'granted' && audioSet.status === 'granted');
  
      // Request Android permissions
      await requestPermissions();
    })();
  }, []);
  

  const takePicture = async () => {

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
    if (uri) {
      try {
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
          user_name: loc_data.witness_name,
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
        };
  
        try {
          // Add data to the subcollection and get the auto-generated document ID
          const newDocumentRef = await addDoc(subcollectionRef, reportData);
  
          // Use the newDocumentRef.id here
          const newDocumentId = newDocumentRef.id; // INSERT HERE
  
          // Nested operation to set data in 'temp_logs' collection
          await setDoc(doc(db, 'temp_logs', newDocumentId), {
            user_name: loc_data.witness_name,
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
          });
  
          // Display the location information in an alert
          const message = `Area Name: ${loc_data.areaName}\nLatitude: ${loc_data.lat}\nLongitude: ${loc_data.long}\n
            \nMessage is sent to the nearest Police and Rescuers!\n
            \nMessage alerted by: ${loc_data.witness_name}\nAttached File: ${fileName}`;
  
          Alert.alert('Accident Location', message, [
            {
              text: 'OK',
              onPress: () => {
                // Handle success, navigate to the next screen, etc.
              },
            },
          ]);
        } catch (error) {
          console.error('Error adding report or setting temp logs:', error);
        }
      } catch (error) {
        console.error('Error saving media to internal storage:', error);
      }
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
        <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
          <Text style={[styles.buttonText, { textAlign: 'center' }]}>Capture</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.recordButton}
          onPress={toggleRecording}
        >
          <Text style={[styles.buttonText, { textAlign: 'center' }]}>{isRecording ? 'stop' : 'Record'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cameraContainer: {
    flex: 3,
  },
  camera: {
    flex: 1,
    aspectRatio: 4 / 3,
  },
  buttonsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    backgroundColor: 'orange',
    borderRadius: 50,
    padding: 20,
    margin: 20,
  },
  recordButton: {
    backgroundColor: 'orange',
    borderRadius: 50,
    padding: 20,
    margin: 20,
  },
  buttonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
  },
});

export default CameraRecordPage;
