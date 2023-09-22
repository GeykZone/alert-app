import React, { useEffect, useState } from 'react';
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

const alertForm = ({ navigation }) => {
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

  const handleAlert = async () => {
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
  
      // Display the location information in an alert
      const message = `Area Name: ${areaName}\nLatitude: ${location.coords.latitude}\nLongitude: ${location.coords.longitude}\n
      \nMessage is sent to the nearest Police and Rescuers!\n\nMessage alerted by: ${witness_name}`;
  
      Alert.alert('Accident Location', message, [
        {
          text: 'OK',
          onPress: () => {
            // Handle success, navigate to the next screen, etc.
          },
        },
      ]);
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
      

     <TouchableOpacity onPress={handleAlert} style={styles.button}>
        <Text style={styles.buttonText}>Accident Alert</Text>
     </TouchableOpacity>

    </View>
  );
};

const styles = StyleSheet.create({

    logo: {
        width: 250, // Adjust the width and height to fit your logo size
        height: 100,
        resizeMode: "contain", // Use "contain" to maintain the aspect ratio
        alignSelf: "center", // Center the logo horizontally
        marginTop: -10, // Adjust the marginTop to control the vertical position
      },

  loginPageContainer: {
    flex: 1,
    backgroundColor: "#EAF2F8",
    alignItems: "center",
    justifyContent: "center",
    rowGap: 30,
  },


  subtitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#8764cd"
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
    backgroundColor: "#0F52BA",
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

export default alertForm;
