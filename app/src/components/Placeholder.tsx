import { View } from 'react-native';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Card } from './Card';
import { Icon, type IconName } from './Icon';
import { Screen } from './Screen';

interface Props {
  title: string;
  icon: IconName;
  message: string;
}

/** Stand-in for tabs whose features arrive in a later phase. */
export function Placeholder({ title, icon, message }: Props) {
  const theme = useTheme();
  return (
    <Screen title={title}>
      <Card>
        <View style={{ alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.xl }}>
          <Icon name={icon} size={theme.layout.iconSize.xl} color={theme.colors.primary} />
          <AppText variant="heading" align="center">
            Yakında
          </AppText>
          <AppText color="textMuted" align="center">
            {message}
          </AppText>
        </View>
      </Card>
    </Screen>
  );
}
