import { Repeat } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { PhasePlaceholder } from '@/components/PhasePlaceholder';

export default function SubscriptionsScreen() {
  const theme = useTheme();
  return (
    <PhasePlaceholder
      title="Subscriptions"
      phase="Phase 5"
      icon={<Repeat size={28} color={theme.colors.info} />}
      subtitle="See every recurring charge in one place. Detect unused subscriptions and surface savings."
      features={[
        'Auto-detection of recurring charges (Netflix, Spotify, gym)',
        'Annual cost projection',
        'Usage tracking with "rarely used" warnings',
        'One-tap cancel reminders with merchant links',
        'Yearly summary of subscription spend',
      ]}
    />
  );
}
