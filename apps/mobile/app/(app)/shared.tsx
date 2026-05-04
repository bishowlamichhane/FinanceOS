import { Users } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { PhasePlaceholder } from '@/components/PhasePlaceholder';

export default function SharedScreen() {
  const theme = useTheme();
  return (
    <PhasePlaceholder
      title="Shared wallet"
      phase="Phase 5"
      icon={<Users size={28} color={theme.colors.asset} />}
      subtitle="Track shared expenses with a partner, family member, or roommates. Settle up in one tap."
      features={[
        'Shared transactions with custom splits (50/50, by share, exact)',
        'Running balance per member with settle-up flow',
        'Recent shared activity feed',
        'Per-trip / per-event groups',
        'Export shared spend for tax / receipts',
      ]}
    />
  );
}
