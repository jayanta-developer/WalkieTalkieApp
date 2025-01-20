import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity } from 'react-native';
import { io, Socket } from 'socket.io-client';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

interface SignalData {
  frequency: string;
  signal: string | undefined;
  userId: string;
}

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [frequency, setFrequency] = useState<string>('20');
  const [userId, setUserId] = useState<string>(''); 
  const [connected, setConnected] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  const audioRecorderPlayer = useRef<AudioRecorderPlayer | null>(null);

  useEffect(() => {
    audioRecorderPlayer.current = new AudioRecorderPlayer();

    const newSocket = io('http://localhost:3000', {
      transports: ['websocket'],
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const joinFrequency = () => {
    if (socket && frequency) {
      socket.emit('join', frequency, userId);
      setConnected(true);
      console.log(`User ${userId} joined frequency ${frequency}`);
    }
  };

  const startRecording = async () => {
    if (!audioRecorderPlayer.current) {
      console.error('audioRecorderPlayer is not initialized');
      return;
    }

    try {
      const path = 'audio_record.mp4';
      setIsRecording(true);
      await audioRecorderPlayer.current.startRecorder(path);
      audioRecorderPlayer.current.addRecordBackListener((e) => {
        console.log('Recording...', e.currentPosition);
        return;
      });
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  };

  const stopRecording = async () => {
    try {
      const result = await audioRecorderPlayer.current?.stopRecorder();
      setIsRecording(false);
      console.log('Recording stopped, file saved at:', result);

      if (socket && frequency) {
        const signalData: SignalData = {
          frequency: frequency,
          signal: result,
          userId: userId,
        };
        socket.emit('audioSignal', signalData);
        console.log(`Audio signal sent to frequency ${frequency}`);
      }
    } catch (err) {
      console.error('Error stopping recording:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Walkie-Talkie App</Text>

      {connected ? (
        <>
          <Text>Connected to Frequency: {frequency}</Text>
          <TouchableOpacity
            style={styles.micButton}
            onPressIn={startRecording}
            onPressOut={stopRecording}
          >
            <Text style={styles.micText}>{isRecording ? 'Recording...' : 'Press to Talk'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter Frequency"
            value={frequency}
            onChangeText={setFrequency}
          />
          <TextInput
            style={styles.input}
            placeholder="Enter User ID"
            value={userId}
            onChangeText={setUserId}
          />
          <Button title="Join Frequency" onPress={joinFrequency} />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  input: {
    width: 200,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  micButton: {
    width: 150,
    height: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    marginTop: 20,
  },
  micText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default App;
