import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../config/constants';

interface VoteButtonsProps {
  upvotes: number;
  downvotes: number;
  onVote: (voteType: 'up' | 'down') => void;
}

export default function VoteButtons({ upvotes, downvotes, onVote }: VoteButtonsProps): JSX.Element {
  const [selectedVote, setSelectedVote] = useState<'up' | 'down' | null>(null);

  async function handleVote(voteType: 'up' | 'down') {
    if (selectedVote) return;
    setSelectedVote(voteType);
    await Haptics.selectionAsync();
    onVote(voteType);
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => handleVote('up')}
        disabled={Boolean(selectedVote)}
        style={[styles.button, selectedVote === 'up' && styles.buttonActiveUp]}
      >
        <Ionicons name="thumbs-up" size={16} color={selectedVote === 'up' ? COLORS.success : COLORS.gray200} />
        <Text style={styles.text}>{upvotes}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handleVote('down')}
        disabled={Boolean(selectedVote)}
        style={[styles.button, selectedVote === 'down' && styles.buttonActiveDown]}
      >
        <Ionicons name="thumbs-down" size={16} color={selectedVote === 'down' ? COLORS.danger : COLORS.gray200} />
        <Text style={styles.text}>{downvotes}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#121826',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.gray700,
  },
  buttonActiveUp: {
    borderColor: COLORS.success,
    backgroundColor: 'rgba(0,200,83,0.1)',
  },
  buttonActiveDown: {
    borderColor: COLORS.danger,
    backgroundColor: 'rgba(255,23,68,0.1)',
  },
  text: {
    color: COLORS.gray100,
    fontWeight: '700',
  },
});
