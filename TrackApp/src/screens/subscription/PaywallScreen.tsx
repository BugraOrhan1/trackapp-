import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { useSubscription } from '../../hooks/useSubscription';
import { COLORS, SIZES, SUBSCRIPTION } from '../../config/constants';

export default function PaywallScreen() {
  const navigation = useNavigation();
  const { offerings, purchasePackage, restorePurchases, loading } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly'>('yearly');
  const [purchasing, setPurchasing] = useState(false);

  async function handlePurchase() {
    if (!offerings) {
      Alert.alert('Fout', 'Kon producten niet laden. Probeer opnieuw.');
      return;
    }

    try {
      setPurchasing(true);
      const pkg = selectedPlan === 'yearly'
        ? offerings.availablePackages.find((p: any) => p.identifier === 'premium_yearly')
        : offerings.availablePackages.find((p: any) => p.identifier === 'premium_monthly');

      if (!pkg) {
        throw new Error('Product niet gevonden');
      }

      await purchasePackage(pkg);
      Alert.alert('🎉 Welkom bij Premium!', 'Je hebt nu toegang tot alle features inclusief de hulpdiensten scanner.', [{ text: 'Geweldig!', onPress: () => navigation.goBack() }]);
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert('Fout', error.message || 'Aankoop mislukt');
      }
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    try {
      setPurchasing(true);
      await restorePurchases();
      Alert.alert('Hersteld', 'Je aankopen zijn hersteld.');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Fout', error.message || 'Kon aankopen niet herstellen');
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Ionicons name="close" size={24} color={COLORS.gray300} />
      </TouchableOpacity>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.emoji}>🎯</Text>
          <Text style={styles.title}>TrackApp Premium</Text>
          <Text style={styles.subtitle}>Ontgrendel de ultieme hulpdiensten scanner</Text>
        </View>

        <View style={styles.featuresCard}>
          {SUBSCRIPTION.FEATURES.PREMIUM.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <LinearGradient colors={[COLORS.primary, COLORS.premium]} style={styles.featureIcon}><Ionicons name="checkmark" size={16} color="#FFF" /></LinearGradient>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.plansContainer}>
          <TouchableOpacity style={[styles.planCard, selectedPlan === 'yearly' && styles.planCardSelected]} onPress={() => setSelectedPlan('yearly')}>
            <View style={styles.saveBadge}><Text style={styles.saveBadgeText}>BESPAAR 17%</Text></View>
            <Text style={styles.planName}>Jaarlijks</Text>
            <Text style={styles.planPrice}>€{SUBSCRIPTION.PRICES.YEARLY}</Text>
            <Text style={styles.planPeriod}>per jaar</Text>
            <Text style={styles.planMonthly}>= €{(SUBSCRIPTION.PRICES.YEARLY / 12).toFixed(2)}/maand</Text>
            {selectedPlan === 'yearly' ? <View style={styles.selectedIndicator}><Ionicons name="checkmark-circle" size={24} color={COLORS.primary} /></View> : null}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]} onPress={() => setSelectedPlan('monthly')}>
            <Text style={styles.planName}>Maandelijks</Text>
            <Text style={styles.planPrice}>€{SUBSCRIPTION.PRICES.MONTHLY}</Text>
            <Text style={styles.planPeriod}>per maand</Text>
            {selectedPlan === 'monthly' ? <View style={styles.selectedIndicator}><Ionicons name="checkmark-circle" size={24} color={COLORS.primary} /></View> : null}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.ctaButton, purchasing && styles.ctaButtonDisabled]} onPress={handlePurchase} disabled={purchasing || loading}>
          {purchasing || loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.ctaText}>Start met Premium</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore} disabled={purchasing}><Text style={styles.restoreText}>Aankopen herstellen</Text></TouchableOpacity>

        <Text style={styles.legal}>Abonnement wordt automatisch verlengd. Je kunt op elk moment opzeggen via de App Store instellingen. Door te kopen ga je akkoord met onze Algemene Voorwaarden en Privacybeleid.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.secondary },
  closeButton: { position: 'absolute', top: 60, right: SIZES.md, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.gray800, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  scrollContent: { padding: SIZES.lg, paddingTop: 80, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: SIZES.xl },
  emoji: { fontSize: 64, marginBottom: SIZES.md },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.premium, marginBottom: SIZES.xs },
  subtitle: { fontSize: 16, color: COLORS.gray400, textAlign: 'center' },
  featuresCard: { backgroundColor: COLORS.gray800, borderRadius: 16, padding: SIZES.lg, marginBottom: SIZES.xl },
  featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: SIZES.md },
  featureIcon: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: SIZES.md },
  featureText: { fontSize: 15, color: COLORS.gray200 },
  plansContainer: { flexDirection: 'row', gap: SIZES.md, marginBottom: SIZES.xl },
  planCard: { flex: 1, backgroundColor: COLORS.gray800, borderRadius: 16, padding: SIZES.md, alignItems: 'center', borderWidth: 2, borderColor: 'transparent', position: 'relative' },
  planCardSelected: { borderColor: COLORS.primary, backgroundColor: '#1A1A3E' },
  saveBadge: { position: 'absolute', top: -10, backgroundColor: COLORS.success, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  saveBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#FFF' },
  planName: { fontSize: 14, color: COLORS.gray400, marginTop: SIZES.md, marginBottom: SIZES.xs },
  planPrice: { fontSize: 28, fontWeight: 'bold', color: COLORS.gray100 },
  planPeriod: { fontSize: 12, color: COLORS.gray500 },
  planMonthly: { fontSize: 12, color: COLORS.primary, marginTop: SIZES.xs },
  selectedIndicator: { position: 'absolute', top: SIZES.sm, right: SIZES.sm },
  ctaButton: { backgroundColor: COLORS.primary, borderRadius: 12, padding: SIZES.md, alignItems: 'center', marginBottom: SIZES.md },
  ctaButtonDisabled: { opacity: 0.6 },
  ctaText: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  restoreButton: { alignItems: 'center', padding: SIZES.sm, marginBottom: SIZES.lg },
  restoreText: { fontSize: 14, color: COLORS.gray400, textDecorationLine: 'underline' },
  legal: { fontSize: 11, color: COLORS.gray600, textAlign: 'center', lineHeight: 16 },
});
