import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { COLORS, SIZES, SUBSCRIPTION } from '../../config/constants';
import { formatSubscriptionExpiry } from '../../utils/formatters';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const { isPremium, expiresAt } = useSubscription();

  function handleLogout() {
    Alert.alert('Uitloggen', 'Weet je zeker dat je wilt uitloggen?', [
      { text: 'Annuleer', style: 'cancel' },
      { text: 'Uitloggen', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><Text style={styles.title}>Profiel</Text></View>

      <View style={styles.userCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user?.username?.charAt(0).toUpperCase() || '?'}</Text></View>
        <View style={styles.userInfo}>
          <Text style={styles.username}>{user?.username || 'Gebruiker'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Settings' as never)}><Ionicons name="settings-outline" size={24} color={COLORS.gray400} /></TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.subscriptionCard, isPremium && styles.subscriptionCardPremium]} onPress={() => !isPremium && navigation.navigate('Paywall' as never)}>
        <View style={styles.subscriptionHeader}>
          <View style={styles.subscriptionBadge}><Text style={styles.subscriptionBadgeText}>{isPremium ? '💎 PREMIUM' : '🆓 GRATIS'}</Text></View>
          {!isPremium ? <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} /> : null}
        </View>
        {isPremium ? <Text style={styles.subscriptionExpiry}>{expiresAt ? formatSubscriptionExpiry(expiresAt) : 'Actief'}</Text> : <Text style={styles.subscriptionCta}>Upgrade voor hulpdiensten scanner!</Text>}
        <View style={styles.subscriptionFeatures}>
          {(isPremium ? SUBSCRIPTION.FEATURES.PREMIUM : SUBSCRIPTION.FEATURES.FREE).slice(0, 3).map((feature, index) => (
            <View key={index} style={styles.featureItem}><Ionicons name="checkmark-circle" size={16} color={isPremium ? COLORS.premium : COLORS.success} /><Text style={styles.featureText}>{feature}</Text></View>
          ))}
        </View>
      </TouchableOpacity>

      <View style={styles.statsCard}>
        <Text style={styles.sectionTitle}>Statistieken</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}><Text style={styles.statValue}>{user?.totalReports || 0}</Text><Text style={styles.statLabel}>Meldingen</Text></View>
          <View style={styles.statItem}><Text style={styles.statValue}>{user?.reputationScore || 0}</Text><Text style={styles.statLabel}>Reputatie</Text></View>
          <View style={styles.statItem}><Text style={styles.statValue}>{new Date(user?.createdAt || Date.now()).toLocaleDateString('nl-NL', { month: 'short', year: '2-digit' })}</Text><Text style={styles.statLabel}>Lid sinds</Text></View>
        </View>
      </View>

      <View style={styles.menuCard}>
        <MenuItem icon="stats-chart" label="Statistieken" onPress={() => navigation.navigate('Stats' as never)} premium={!isPremium} />
        <MenuItem icon="radio" label="Scanner verbinden" onPress={() => navigation.navigate('PairDevice' as never)} premium={!isPremium} />
        <MenuItem icon="settings" label="Instellingen" onPress={() => navigation.navigate('Settings' as never)} />
        <MenuItem icon="help-circle" label="Help & Support" onPress={() => {}} />
        <MenuItem icon="document-text" label="Privacybeleid" onPress={() => {}} />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}><Ionicons name="log-out-outline" size={20} color={COLORS.danger} /><Text style={styles.logoutText}>Uitloggen</Text></TouchableOpacity>
      <Text style={styles.version}>TrackApp v1.0.0</Text>
    </ScrollView>
  );
}

function MenuItem({ icon, label, onPress, premium = false }: { icon: string; label: string; onPress: () => void; premium?: boolean; }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon as any} size={22} color={COLORS.gray300} />
      <Text style={styles.menuLabel}>{label}</Text>
      {premium ? <View style={styles.premiumBadge}><Text style={styles.premiumBadgeText}>PRO</Text></View> : null}
      <Ionicons name="chevron-forward" size={20} color={COLORS.gray600} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.secondary },
  header: { paddingHorizontal: SIZES.lg, paddingTop: 60, paddingBottom: SIZES.md },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.gray100 },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.gray800, marginHorizontal: SIZES.md, borderRadius: 16, padding: SIZES.md, marginBottom: SIZES.md },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  userInfo: { flex: 1, marginLeft: SIZES.md },
  username: { fontSize: 18, fontWeight: '600', color: COLORS.gray100 },
  email: { fontSize: 14, color: COLORS.gray500, marginTop: 2 },
  subscriptionCard: { backgroundColor: COLORS.gray800, marginHorizontal: SIZES.md, borderRadius: 16, padding: SIZES.md, marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.gray700 },
  subscriptionCardPremium: { borderColor: COLORS.premium, backgroundColor: '#2A2A1E' },
  subscriptionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SIZES.sm },
  subscriptionBadge: { paddingHorizontal: SIZES.sm, paddingVertical: 4, borderRadius: 8, backgroundColor: COLORS.gray700 },
  subscriptionBadgeText: { fontSize: 12, fontWeight: 'bold', color: COLORS.gray200 },
  subscriptionExpiry: { fontSize: 14, color: COLORS.gray400, marginBottom: SIZES.md },
  subscriptionCta: { fontSize: 14, color: COLORS.primary, marginBottom: SIZES.md },
  subscriptionFeatures: { gap: 6 },
  featureItem: { flexDirection: 'row', alignItems: 'center' },
  featureText: { fontSize: 13, color: COLORS.gray300, marginLeft: SIZES.sm },
  statsCard: { backgroundColor: COLORS.gray800, marginHorizontal: SIZES.md, borderRadius: 16, padding: SIZES.md, marginBottom: SIZES.md },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.gray200, marginBottom: SIZES.md },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.gray500, marginTop: 4 },
  menuCard: { backgroundColor: COLORS.gray800, marginHorizontal: SIZES.md, borderRadius: 16, marginBottom: SIZES.md, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: SIZES.md, borderBottomWidth: 1, borderBottomColor: COLORS.gray700 },
  menuLabel: { flex: 1, fontSize: 16, color: COLORS.gray200, marginLeft: SIZES.md },
  premiumBadge: { backgroundColor: COLORS.premium, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: SIZES.sm },
  premiumBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#000' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: SIZES.md, padding: SIZES.md, marginBottom: SIZES.md },
  logoutText: { fontSize: 16, color: COLORS.danger, marginLeft: SIZES.sm },
  version: { textAlign: 'center', fontSize: 12, color: COLORS.gray600, marginBottom: SIZES.xxl },
});
