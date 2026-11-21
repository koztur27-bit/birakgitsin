import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import React, { Component, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TabBar } from './src/components/TabBar';
import { AppProvider, useApp } from './src/context/AppContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { I18nProvider, useI18n } from './src/i18n';
import { CravingScreen } from './src/screens/CravingScreen';
import { FutureOnboardingScreen } from './src/screens/FutureOnboardingScreen';
import { HealthScreen } from './src/screens/HealthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { Onboarding } from './src/screens/Onboarding';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { TimerScreen } from './src/screens/TimerScreen';
import { refreshWidgets } from './src/lib/widgetData';
import { registerBackgroundNotificationTask } from './src/lib/backgroundNotificationTask';
import { registerNotificationCategories } from './src/lib/statusNotification';
import './src/lib/backgroundNotificationTask';
import { colors, fontSizes, radius, spacing } from './src/theme';
import { Plan, TabKey } from './src/types';

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: { message: string; stack?: string } | null }
> {
  state = { error: null as { message: string; stack?: string } | null };

  static getDerivedStateFromError(error: Error) {
    return { error: { message: error.message, stack: error.stack } };
  }

  render() {
    if (this.state.error) {
      return <ErrorView error={this.state.error} onReload={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}

function ErrorView({
  error,
  onReload,
}: {
  error: { message: string; stack?: string };
  onReload: () => void;
}) {
  return (
    <View style={styles.errorRoot}>
      <View style={styles.errorCard}>
        <Text style={styles.errorIcon}>:(</Text>
        <Text style={styles.errorTitle}>Bir şeyler ters gitti</Text>
        <Text style={styles.errorSubtitle}>Something went wrong</Text>
        <Text style={styles.errorHint}>
          Beklenmeyen bir hata oluştu. Endişelenme, verilerin güvende. Uygulamayı yeniden dene.
        </Text>
        <Text style={styles.errorHintEn}>
          An unexpected error occurred. Your data is safe. Please try again.
        </Text>
        <ScrollView style={styles.errorScroll}>
          <Text style={styles.errorMessage}>{error.message}</Text>
        </ScrollView>
        <Pressable style={styles.errorBtn} onPress={onReload}>
          <Text style={styles.errorBtnText}>Tekrar Dene / Try Again</Text>
        </Pressable>
      </View>
    </View>
  );
}

function I18nBridge({ children }: { children: React.ReactNode }) {
  const { data } = useApp();
  return <I18nProvider locale={data.language || 'tr'}>{children}</I18nProvider>;
}

function Root() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { data, ready, setPlan, markFutureOnboardingShown } = useApp();
  const [tab, setTab] = useState<TabKey>('home');
  const [editing, setEditing] = useState(false);
  const [futurePlan, setFuturePlan] = useState<Plan | null>(null);

  // Uygulama açılırken ve arka plana geçerken widget'ları zorla yenile.
  useEffect(() => {
    refreshWidgets();
    registerNotificationCategories().catch(() => {});
    registerBackgroundNotificationTask().catch(() => {});
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' || state === 'background') refreshWidgets();
    });
    return () => subscription.remove();
  }, []);

  if (!ready) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textMuted, marginTop: 12 }}>{t('app.loading')}</Text>
      </View>
    );
  }

  if (!data.plan || editing) {
    return (
      <Onboarding
        initial={editing && data.plan ? data.plan : undefined}
        onCancel={editing ? () => setEditing(false) : undefined}
        onComplete={(plan) => {
          const isFirstSetup = !data.plan && !editing;
          setPlan(plan);
          setEditing(false);
          if (isFirstSetup && !data.futureOnboardingShown) {
            setFuturePlan(plan);
          }
        }}
      />
    );
  }

  if (futurePlan && !data.futureOnboardingShown) {
    return (
      <FutureOnboardingScreen
        plan={futurePlan}
        onContinue={() => {
          markFutureOnboardingShown();
          setFuturePlan(null);
        }}
      />
    );
  }

  return (
    <View style={[styles.app, { backgroundColor: colors.bg }]}>
      <View style={styles.screen}>
        <View style={[styles.page, tab !== 'home' && styles.hidden]}>
          <HomeScreen onOpenCraving={() => setTab('craving')} />
        </View>
        <View style={[styles.page, tab !== 'craving' && styles.hidden]}>
          <CravingScreen />
        </View>
        <View style={[styles.page, tab !== 'timer' && styles.hidden]}>
          <TimerScreen />
        </View>
        <View style={[styles.page, tab !== 'stats' && styles.hidden]}>
          <StatsScreen />
        </View>
        <View style={[styles.page, tab !== 'health' && styles.hidden]}>
          <HealthScreen />
        </View>
        <View style={[styles.page, tab !== 'settings' && styles.hidden]}>
          <SettingsScreen onEditPlan={() => setEditing(true)} />
        </View>
      </View>
      <TabBar active={tab} onChange={setTab} />
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppProvider>
            <I18nBridge>
              <StatusBar style="auto" />
              <Root />
            </I18nBridge>
          </AppProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  app: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  screen: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
  errorRoot: {
    flex: 1,
    backgroundColor: '#F2F6FD',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#12306B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  errorIcon: {
    fontSize: 48,
    fontWeight: '800',
    color: '#2563EB',
    marginBottom: 8,
  },
  errorTitle: {
    color: '#0F1B33',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorSubtitle: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorHint: {
    color: '#334155',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  errorHintEn: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  errorScroll: {
    alignSelf: 'stretch',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    maxHeight: 140,
    marginBottom: 20,
  },
  errorMessage: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
  },
  errorBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },
  errorBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});