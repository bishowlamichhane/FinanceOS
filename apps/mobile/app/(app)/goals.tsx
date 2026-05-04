import { Sprout } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { PhasePlaceholder } from '@/components/PhasePlaceholder';

export default function GoalsScreen() {
  const theme = useTheme();
  return (
    <PhasePlaceholder
      title="Goals"
      phase="Phase 3"
      icon={<Sprout size={28} color={theme.colors.primary} />}
      subtitle="Track savings goals with deadlines and progress that pulls from your real account balances."
      features={[
        'Named goals (Emergency Fund, Trip, Wedding) with target + deadline',
        'Auto-progress from contributions and linked accounts',
        'Visual progress bars with on-track/behind state',
        'Goal templates for common Nepali milestones',
        'Smart suggestions for monthly savings amount',
      ]}
    />
  );
}
