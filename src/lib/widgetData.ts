import { NativeModules, Platform } from 'react-native';

const { BirakGitsinWidgetData } = NativeModules;

export function updateWidgetData(
  smoked: number,
  goal: number,
  saved: number,
  streak: number,
  nextWindow: string,
  quitText: string,
  savingsText: string,
) {
  if (Platform.OS !== 'android' || !BirakGitsinWidgetData) return;
  try {
    BirakGitsinWidgetData.updateWidgetData(
      smoked,
      goal,
      saved,
      streak,
      nextWindow,
      quitText,
      savingsText,
    );
  } catch {
    // ignore
  }
}

/** Uygulama açılırken / arka plana geçerken widget'ları zorla yeniler. */
export function refreshWidgets() {
  if (Platform.OS !== 'android' || !BirakGitsinWidgetData) return;
  try {
    BirakGitsinWidgetData.forceRefresh();
  } catch {
    // ignore
  }
}
