import React from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { COLORS } from '../../config/constants';

export default function Input(props: TextInputProps): JSX.Element {
  return <TextInput placeholderTextColor={COLORS.gray500} {...props} style={[styles.input, props.style]} />;
}

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: COLORS.gray700,
    color: COLORS.gray100,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
