import { Layers } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { PhasePlaceholder } from '@/components/PhasePlaceholder';

export default function InvestmentsScreen() {
  const theme = useTheme();
  return (
    <PhasePlaceholder
      title="Stocks"
      phase="Phase 4"
      icon={<Layers size={28} color={theme.colors.primary} />}
      subtitle="Your NEPSE portfolio, properly tracked — bonus shares, right shares, IPO allotments, the lot."
      features={[
        'Manual NEPSE holding entry',
        'MeroShare CSV import with column mapping',
        'WACC tracked correctly across all transaction types',
        'Realized + unrealized gain/loss',
        'Allocation by sector and symbol',
        'Watchlist with price alerts',
      ]}
    />
  );
}
