import { Pause, Play, RotateCcw, HelpCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

interface HudProps {
  title: string;
  isPaused: boolean;
  onTogglePause: () => void;
  onReset: () => void;
  onToggleHelp: () => void;
  showHelp: boolean;
}

export function Hud({
  title,
  isPaused,
  onTogglePause,
  onReset,
  onToggleHelp,
  showHelp,
}: HudProps) {
  const withTooltip = (
    control: React.ReactNode,
    label: string
  ) => (
    <Tooltip>
      <TooltipTrigger asChild>
        {control}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="demo-button-tooltip">{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <div className="demo-hud">
      {withTooltip(
        <Button asChild variant="outline" size="icon" aria-label="Back to home">
          <Link to="/">
            <ArrowLeft />
          </Link>
        </Button>,
        'Home'
      )}
      <span className="mx-1 text-neutral-500">/</span>
      <span className="demo-title">{title}</span>

      {withTooltip(
        <Button
          variant="outline"
          size="icon"
          onClick={onTogglePause}
          aria-label={isPaused ? 'Resume simulation' : 'Pause simulation'}
        >
          {isPaused ? <Play /> : <Pause />}
        </Button>,
        isPaused ? 'Resume' : 'Pause'
      )}

      {withTooltip(
        <Button
          variant="outline"
          size="icon"
          onClick={onReset}
          aria-label="Reset simulation"
        >
          <RotateCcw />
        </Button>,
        'Reset'
      )}

      {withTooltip(
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleHelp}
          aria-label="Toggle help panel"
          aria-expanded={showHelp}
        >
          <HelpCircle />
        </Button>,
        'Help'
      )}
    </div>
  );
}

export default Hud;


