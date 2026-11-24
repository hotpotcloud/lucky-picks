import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface PanelFrameProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const PanelFrame = ({
  title,
  description,
  action,
  children,
  className,
}: PanelFrameProps) => (
  <Card className={`ui-panel !p-0 ${className ?? ''}`}>
    <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 p-5">
      <div>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </CardHeader>
    <CardContent className="p-5 pt-0">{children}</CardContent>
  </Card>
);
