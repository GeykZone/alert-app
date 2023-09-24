import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { FontAwesome } from '@expo/vector-icons';

const CameraRecordPage = () => {
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [cameraRef, setCameraRef] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      const audioStatus = await MediaLibrary.requestPermissionsAsync();
      setHasCameraPermission(status === 'granted' && audioStatus.status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef) {
      const photo = await cameraRef.takePictureAsync();
      saveMediaToLibrary(photo.uri);
    }
  };

  const startRecording = async () => {
    if (cameraRef) {
      try {
        setIsRecording(true); // Set recording state before starting recording
        const videoRecordPromise = cameraRef.recordAsync();
        if (videoRecordPromise) {
          const { uri } = await videoRecordPromise;
          saveMediaToLibrary(uri);
        }
      } catch (error) {
        console.error('Error starting recording:', error);
      }
    }
  };

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
  

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const saveMediaToLibrary = async (uri) => {
    if (uri) {
      const asset = await MediaLibrary.createAssetAsync(uri);
      console.log('Evidence saved at:', asset.uri); // Log the URI of the saved video
      // You can handle further actions with the saved asset here
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
          <FontAwesome name="camera" size={32} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.recordButton}
          onPress={toggleRecording}
        >
          <FontAwesome
            name={isRecording ? 'stop' : 'circle'}
            size={32}
            color="white"
          />
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
});

export default CameraRecordPage;
