import React from 'react';
import { View } from 'react-native';
import Button from '../common/Button';

export default function VoteButtons({ onUpvote, onDownvote }: { onUpvote: () => void; onDownvote: () => void }): JSX.Element {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Button title="👍" onPress={onUpvote} variant="secondary" />
      <Button title="👎" onPress={onDownvote} variant="secondary" />
    </View>
  );
}
