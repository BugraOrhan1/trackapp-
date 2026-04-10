import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../config/constants';

type Props = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export default function Header({ title, subtitle, action }: Props): JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {action ? <View>{action}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  textWrap: { flex: 1 },
  title: { color: COLORS.gray100, fontSize: 24, fontWeight: '900' },
  subtitle: { color: COLORS.gray400, fontSize: 13, marginTop: 4, lineHeight: 18 },
});
