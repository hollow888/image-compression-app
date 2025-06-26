import React, { useState } from 'react';
import { View, Button, StyleSheet, Image, Text, ActivityIndicator, Alert, Platform, ScrollView, Modal, Pressable, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';

const compressionMethods = [
  { key: 'lossy', label: 'Lossy (JPEG, low quality)', description: 'Reduces file size by lowering image quality. Best for photos where small size is more important than perfect quality.' },
  { key: 'lossless', label: 'Lossless (PNG)', description: 'Compresses without losing any image data. Best for graphics or images where quality must be preserved.' },
  { key: 'efficient', label: 'Most Efficient', description: 'Resizes and applies lossy compression for the smallest file size with reasonable quality.' },
];

export default function HomeScreen() {
  const [originalImage, setOriginalImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [compressedImage, setCompressedImage] = useState<ImageManipulator.ImageResult | null>(null);
  const [method, setMethod] = useState('lossy');
  const [loading, setLoading] = useState(false);
  const [hasMediaPermission, setHasMediaPermission] = useState<boolean | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  React.useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setHasMediaPermission(status === 'granted');
    })();
  }, []);

  const pickImage = async () => {
    setCompressedImage(null);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      base64: false,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setOriginalImage(result.assets[0]);
    }
  };

  const compressImage = async () => {
    if (!originalImage) return;
    setLoading(true);
    try {
      let manipResult: ImageManipulator.ImageResult | undefined;
      if (method === 'lossy') {
        // Lossy: JPEG, low quality
        manipResult = await ImageManipulator.manipulateAsync(
          originalImage.uri,
          [],
          { compress: 0.2, format: ImageManipulator.SaveFormat.JPEG }
        );
      } else if (method === 'lossless') {
        // Lossless: PNG
        manipResult = await ImageManipulator.manipulateAsync(
          originalImage.uri,
          [],
          { compress: 1, format: ImageManipulator.SaveFormat.PNG }
        );
      } else if (method === 'efficient') {
        // Most Efficient: resize + lossy
        const newWidth = originalImage.width ? Math.floor(originalImage.width * 0.5) : 100;
        manipResult = await ImageManipulator.manipulateAsync(
          originalImage.uri,
          [{ resize: { width: newWidth } }],
          { compress: 0.2, format: ImageManipulator.SaveFormat.JPEG }
        );
      }
      if (manipResult) setCompressedImage(manipResult);
    } catch (e) {
      Alert.alert('Error', 'Failed to compress image.');
    }
    setLoading(false);
  };

  const saveImage = async () => {
    if (!compressedImage || !hasMediaPermission) return;
    try {
      await MediaLibrary.saveToLibraryAsync(compressedImage.uri);
      Alert.alert('Success', 'Image saved to your gallery!');
    } catch (e) {
      Alert.alert('Error', 'Failed to save image.');
    }
  };

  const selectedMethod = compressionMethods.find((m) => m.key === method);
  const backgroundColor = darkMode ? '#111' : '#fff';
  const textColor = darkMode ? '#fff' : '#111';
  const secondaryTextColor = darkMode ? '#ccc' : '#555';

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor }]}>  
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: textColor }]}>Basic Compression Tool</Text>
        <TouchableOpacity
          style={[styles.circle, { backgroundColor: darkMode ? '#fff' : '#111' }]}
          onPress={() => setDarkMode((d) => !d)}
          accessibilityRole="button"
        >
          <View style={styles.innerCircle} />
        </TouchableOpacity>
      </View>
      <Button title="Choose an Image" onPress={pickImage} color={darkMode ? '#bbb' : undefined} />
      {originalImage && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: textColor }]}>Compression Method:</Text>
          <Pressable
            style={[styles.selectStyle, { backgroundColor: darkMode ? '#222' : '#f9f9f9', borderColor: darkMode ? '#444' : '#ccc' }]}
            onPress={() => setModalVisible(true)}
            accessibilityRole="button"
          >
            <Text style={[styles.selectText, { color: textColor }]}>{selectedMethod?.label || 'Select Compression Method'}</Text>
          </Pressable>
          <Modal
            visible={modalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setModalVisible(false)}
          >
            <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
              <View style={[styles.modalContent, { backgroundColor }]}> 
                {compressionMethods.map((m) => (
                  <Pressable
                    key={m.key}
                    style={styles.modalOption}
                    onPress={() => {
                      setMethod(m.key);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={[styles.optionTextStyle, { color: textColor }]}>{m.label}</Text>
                  </Pressable>
                ))}
                <Pressable style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                  <Text style={[styles.optionTextStyle, { color: '#d00' }]}>Cancel</Text>
                </Pressable>
              </View>
            </Pressable>
          </Modal>
          {selectedMethod && (
            <Text style={[styles.methodDescription, { color: secondaryTextColor }]}>{selectedMethod.description}</Text>
          )}
          <Button title="Compress Image" onPress={compressImage} disabled={loading} color={darkMode ? '#bbb' : undefined} />
        </View>
      )}
      {loading && <ActivityIndicator size="large" color={darkMode ? '#bbb' : '#007AFF'} style={{ margin: 20 }} />}
      {originalImage && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: textColor }]}>Original Image:</Text>
          <Image source={{ uri: originalImage.uri }} style={styles.image} resizeMode="contain" />
          <FileSize uri={originalImage.uri} textColor={textColor} />
        </View>
      )}
      {compressedImage && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: textColor }]}>Compressed Image:</Text>
          <Image source={{ uri: compressedImage.uri }} style={styles.image} resizeMode="contain" />
          <FileSize uri={compressedImage.uri} textColor={textColor} />
          <Button title="Save to Gallery" onPress={saveImage} disabled={!hasMediaPermission} color={darkMode ? '#bbb' : undefined} />
        </View>
      )}
    </ScrollView>
  );
}

function FileSize({ uri, textColor }: { uri: string, textColor: string }) {
  const [size, setSize] = React.useState<number | null>(null);
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const s = await (async () => {
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          return blob.size;
        } catch {
          return 0;
        }
      })();
      if (mounted) setSize(s);
    })();
    return () => { mounted = false; };
  }, [uri]);
  if (size === null) return <Text style={{ color: textColor }}>Loading size...</Text>;
  return <Text style={{ color: textColor }}>Size: {(size / 1024).toFixed(2)} KB</Text>;
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
    minHeight: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#bbb',
  },
  innerCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#888',
  },
  section: {
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 16,
  },
  image: {
    width: 250,
    height: 250,
    marginVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectStyle: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    backgroundColor: '#f9f9f9',
    marginBottom: 12,
    minWidth: 250,
    alignItems: 'center',
  },
  selectText: {
    fontSize: 16,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    minWidth: 260,
    alignItems: 'stretch',
    elevation: 4,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalCancel: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  optionTextStyle: {
    fontSize: 16,
    textAlign: 'center',
  },
  methodDescription: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
