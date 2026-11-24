import type { ReactNode } from 'react';
import type { usePicker } from '../../features/picker/hooks/usePicker';

export type PickerState = ReturnType<typeof usePicker>;
export type WorkbenchTab = 'picker' | 'recommend' | 'history' | 'analysis';

export interface NavigationItem {
  label: string;
  value: WorkbenchTab;
  icon: ReactNode;
}
