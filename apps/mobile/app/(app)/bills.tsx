import { Receipt } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { PhasePlaceholder } from '@/components/PhasePlaceholder';

export default function BillsScreen() {
  const theme = useTheme();
  return (
    <PhasePlaceholder
      title="Bills"
      phase="Phase 5"
      icon={<Receipt size={28} color={theme.colors.warning} />}
      subtitle="Never miss a due date. Bills auto-track from recurring transactions and notify you ahead of time."
      features={[
        'Upcoming bills timeline with due-date tiles',
        'Auto-detection of recurring charges (rent, NEA, internet)',
        'Pay-now button with one-tap account selection',
        'Paid-history with payment confirmation',
        'Push notifications 3 days before due',
      ]}
    />
  );
}
