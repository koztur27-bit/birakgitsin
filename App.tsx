import { StatusBar } from 'expo-status-bar';
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
    <View style={styles.splash}>
      <Text style={styles.errorTitle}>Bir sorun oluştu / Something went wrong</Text>
      <ScrollView style={styles.errorScroll}>
        <Text style={styles.errorMessage}>{error.message}</Text>
        {error.stack ? <Text style={styles.errorStack}>{error.stack}</Text> : null}
      </ScrollView>
      <Pressable style={styles.errorBtn} onPress={onReload}>
        <Text style={styles.errorBtnText}>Tekrar Dene / Retry</Text>
      </Pressable>
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
  errorTitle: {
    color: '#C62828',
    fontSize: fontSizes.xl,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  errorScroll: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    maxHeight: 320,
    marginBottom: spacing.lg,
  },
  errorMessage: {
    color: '#C62828',
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  errorStack: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    marginTop: spacing.sm,
    fontFamily: 'monospace',
  },
  errorBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  errorBtnText: {
    color: colors.white,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
});