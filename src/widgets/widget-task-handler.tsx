import React from 'react';
import { BirakGitsinWidget } from './BirakGitsinWidget';

export async function widgetTaskHandler(props: any) {
  const { widgetAction, renderWidget } = props;
  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      renderWidget(<BirakGitsinWidget />);
      break;
    default:
      break;
  }
}