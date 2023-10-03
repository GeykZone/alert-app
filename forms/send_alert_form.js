import React, { useEffect, useState, useRef  } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Button,
  Image,
  Alert,
  TouchableOpacity,
} from "react-native";
import logoImage from "../assets/irms_login_logo.png";
import NetInfo from "@react-native-community/netinfo";
import * as Location from 'expo-location';
import CameraRecordPage from '../modules/CameraRecordPage';
import { doc, setDoc, collection, addDoc, serverTimestamp, query, getDocs } from "firebase/firestore"; 
import { db } from "../firebaseConfig";


const AlertForm = ({ navigation }) => {
  const [userDetails, setUserDetails] = useState({
    username: "",
  });

  const [location, setLocation] = useState(null);
  const [areaName, setAreaName] = useState(null);
  const [user_name, setUser_name] = useState("Unknown");

  useEffect(() => {
    // Request location permission when the component mounts
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for this app.');
      }
    })();
  }, []);

  
  const handleUsernameChange = (text) => {
    // Update the username in userDetails
    setUserDetails((prev) => {
      return { ...prev, username: text };
    });

    // Update user_name variable with formatted username
    const formattedUsername = text
      .split(" ") // Split by spaces
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
      .join(" "); // Join words back with a space

    if (formattedUsername.trim() === "") {
      setUser_name("Unknown");
    } else {
      setUser_name(formattedUsername);
      
    }
  };

  const handleAlert = async (hasEvidence) => {
    try {
      // Check for internet connectivity
      const networkState = await NetInfo.fetch();
  
      if (!networkState.isConnected) {
        throw new Error("Sorry, can't send alert because there is no internet connection");
      }
  
      // Get the current location
      const location = await Location.getCurrentPositionAsync({});
      setLocation(location);
  
      // Reverse geocode to get the area name (city or street name)
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
  
      let areaName = 'Location not found';
      if (address) {
        const { city, street } = address;
        areaName = `${city}, ${street}`;
      }

      let witness_name = "Unknown User";
      if(user_name != "Unknown")
      {
        witness_name = user_name;
      }

      const result = await get_data( location.coords.latitude, location.coords.longitude,);

      if(hasEvidence)
      {
        const loc_data = {
          areaName: areaName,
          lat: location.coords.latitude,
          long: location.coords.longitude,
          witness_name: witness_name,
          headquarter_id: result.nearestDocId,
          headquarter_lat: result.nearestCoordinate.lat,
          headquarter_long: result.nearestCoordinate.long,
          headquarter_name: result.nearestheadquarter_name,
          headquarter_location_name: result.nearestheadquarter_location_name
        };
        navigation.navigate('CameraRecordPage', {loc_data}); //open camera page
      }
      else {
        // Reference to the document where you want to add the subcollection
        const documentRef = doc(db, 'profile', 'user');
  
        // Reference to the subcollection "reports" inside the main document
        const subcollectionRef = collection(documentRef, "data");
  
        // Data to be added to the subcollection
        const reportData = {
          user_name: witness_name,
          alert_location: areaName,
          lat: location.coords.latitude,
          long: location.coords.longitude,
          date_added: serverTimestamp(),
          headquarter_id: result.nearestDocId,
          headquarter_lat: result.nearestCoordinate.lat,
          headquarter_long: result.nearestCoordinate.long,
          headquarter_name: result.nearestheadquarter_name,
          headquarter_location_name: result.nearestheadquarter_location_name
        };
  
        try {
          // Add data to the subcollection and get the auto-generated document ID
          const newDocumentRef = await addDoc(subcollectionRef, reportData);
  
          // Use the newDocumentRef.id here
          const newDocumentId = newDocumentRef.id; // INSERT HERE
  
          // Nested operation to set data in 'temp_logs' collection
          await setDoc(doc(db, 'temp_logs', newDocumentId), {
            user_name: witness_name,
            alert_location: areaName,
            lat: location.coords.latitude,
            long: location.coords.longitude,
            date_added: serverTimestamp(),
            headquarter_id: result.nearestDocId,
            headquarter_lat: result.nearestCoordinate.lat,
            headquarter_long: result.nearestCoordinate.long,
            headquarter_name: result.nearestheadquarter_name,
            headquarter_location_name: result.nearestheadquarter_location_name
            
          });
  
          // Display the location information in an alert
          const message = `Area Name: ${areaName}\nLatitude: ${location.coords.latitude}\nLongitude: ${location.coords.longitude}\n\nMessage is sent to the nearest Police and Rescuers!
          \nPolice Headquarter: ${result.nearestheadquarter_name}\n\nMessage alerted by: ${witness_name}`;
  
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
      }
  
    
    } catch (error) {
      Alert.alert('Something Went Wrong', error.message, [
        {
          text: 'Cancel',
          onPress: () => '',
          style: 'cancel',
        },
        { text: 'OK', onPress: () => '' },
      ]);
    }
  };

  const get_data = async (get_data_lat, get_data_lon) => 
  {
    // Reference to the subcollection "head_quarters" inside the "profile/police" collection
    const subcollectionRef = collection(db, "profile", "police", "head_quarters");
    let constantLat = get_data_lat;
    let constantLon = get_data_lon;

    // Query all documents in the "head_quarters" subcollection
    const q = query(subcollectionRef);

    try {
      const querySnapshot = await getDocs(q);

      // Initialize variables to store the nearest coordinate and its distance
      let nearestCoordinate = null;
      let nearestDocId = null;
      let nearestheadquarter_name = null;
      let nearestheadquarter_location_name = null;
      let minDistance = Number.MAX_VALUE;
    

      // Process the query results
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const lat = data.lat;
        const long = data.long;
        const headquarter_name = data.headquarter_name;
        const headquarter_location_name = data.headquarter_location_name;

        // Calculate the distance between the constant and Firestore coordinates
        const distance = calculateDistance(
          constantLat,
          constantLon,
          lat,
          long
        );

        // Check if this coordinate is nearer than the current nearest coordinate
        if (distance < minDistance) {
          minDistance = distance;
          nearestCoordinate = { lat, long };
          nearestDocId = doc.id;
          nearestheadquarter_name = headquarter_name;
          nearestheadquarter_location_name = headquarter_location_name;
        }
      });

         // Return the result as an object
        return {
          nearestDocId,
          nearestCoordinate,
          nearestheadquarter_name,
          nearestheadquarter_location_name
        };
    } catch (error) {
      console.error("Error querying documents:", error);
    }

  }

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  return (
    <View style={styles.loginPageContainer}>
      
     <Image source={logoImage} style={styles.logo} />
      <Text style={styles.subtitle}>User {user_name}</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Username"
          name="username"
          value={userDetails.username}
          onChangeText={handleUsernameChange}
          
        />
      </View>

      <View>
      <TouchableOpacity onPress={() => handleAlert(true)} style={styles.button}>
        <Text style={[styles.buttonText, { textAlign: 'center' }]}>ALERT TRIGGER WITH EVIDENCE</Text>
      </TouchableOpacity>

          <TouchableOpacity onPress={() => handleAlert(false)} style={styles.button}>
          <Text style={[styles.buttonText, { textAlign: 'center' }]}>ALERT TRIGGER</Text>
          </TouchableOpacity>

      </View>


    </View>
  );
};

const styles = StyleSheet.create({

    logo: {
        width: 600, // Adjust the width and height to fit your logo size
        height: 200,
        resizeMode: "contain", // Use "contain" to maintain the aspect ratio
        alignSelf: "center", // Center the logo horizontally
        marginTop: -10, // Adjust the marginTop to control the vertical position
      },

  loginPageContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    rowGap: 30,
  },


  subtitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#0F52BA"
  },

  inputContainer: {
    width: 300,
    height: 40,
    borderRadius: 10,
    borderColor: "#ccc",
    borderWidth: 1,
  },
  input: {
    height: 40,
    padding: 10,
    fontSize: 16,
  },

  button: {
    backgroundColor: "#FF6100",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginVertical: 10,
  },

  buttonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
  },

  

});

export default AlertForm;
