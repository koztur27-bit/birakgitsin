import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export const BIRAK_GITSIN_WIDGET_NAME = 'BirakGitsin';

export function BirakGitsinWidget() {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#2563EB',
        borderRadius: 16,
        padding: 12,
      }}
      clickAction="OPEN_APP"
    >
      <TextWidget
        text="Bırak Gitsin"
        style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: '#FFFFFF',
        }}
      />
      <TextWidget
        text="Bugünkü hedefini görmek için aç"
        style={{
          fontSize: 11,
          color: '#E4EDFF',
          marginTop: 4,
        }}
      />
    </FlexWidget>
  );
}
