import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../constants/theme';
import { stream } from '../components/StreamingDesignSystem';

export default function NotFoundScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[stream.bg, '#120205']}
        style={StyleSheet.absoluteFillObject}
      />
      <Animated.View entering={FadeInDown.duration(500)} style={styles.content}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="explore-off" size={64} color={stream.red} />
        </View>
        <Text style={styles.code}>404</Text>
        <Text style={styles.title}>الصفحة غير موجودة</Text>
        <Text style={styles.message}>
          عذرًا، الصفحة التي تبحث عنها غير متوفرة أو تم نقلها.
        </Text>
        <Pressable
          style={styles.homeButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <MaterialIcons name="home" size={20} color="#FFF" />
          <Text style={styles.homeButtonText}>العودة للرئيسية</Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: stream.bg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(229,9,20,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(229,9,20,0.28)',
    marginBottom: 8,
  },
  code: {
    fontSize: 72,
    fontWeight: '900',
    color: stream.red,
    letterSpacing: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
  },
  message: {
    fontSize: 15,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
    marginBottom: 12,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: stream.red,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 8,
  },
  homeButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
