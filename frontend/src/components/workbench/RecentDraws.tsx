import NumberBall from '../../features/picker/components/NumberBall';
import type { DrawItem } from '../../features/data/useDraws';
import type { GameConfig } from '../../features/picker/types';

interface RecentDrawsProps {
  game: GameConfig;
  draws: DrawItem[];
}

export const RecentDraws = ({ game, draws }: RecentDrawsProps) => (
  <div className="divide-y divide-border">
    {draws
      .slice(-20)
      .reverse()
      .map((draw) => (
        <div
          key={draw.issue}
          className="grid gap-3 py-3 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center"
        >
          <div>
            <strong className="block text-sm text-foreground">{draw.issue}</strong>
            <span className="text-xs text-muted-foreground">{draw.date}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {draw.main.map((number) => (
              <NumberBall
                key={`main-${number}`}
                value={number}
                color={game.areas[0].color}
                size="small"
              />
            ))}
            <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
            {draw.extra.map((number) => (
              <NumberBall
                key={`extra-${number}`}
                value={number}
                color={game.areas[1].color}
                size="small"
              />
            ))}
          </div>
        </div>
      ))}
  </div>
);
