import { View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Icon, type IconName } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { usePickImage } from '../../lib/usePickImage';
import { useTheme } from '../../theme';

const TIPS: { icon: IconName; text: string }[] = [
  { icon: 'viewfinder', text: 'Kadrajda tek soru olsun, şıklar da görünsün.' },
  { icon: 'sun.max.fill', text: 'Işık iyi olsun, gölge düşürme.' },
  { icon: 'rectangle.portrait', text: 'Telefonu sayfaya paralel tut.' },
];

export default function SolveScreen() {
  const theme = useTheme();
  const { openCamera, pickFromLibrary, busy } = usePickImage();

  return (
    <Screen title="Soru Çöz" subtitle="Fotoğrafını çek; ipucu al ya da tam çözümü gör." width="readable">
      <Card>
        <View style={{ alignItems: 'center', paddingVertical: theme.spacing.lg, gap: theme.spacing.md }}>
          <View
            style={{
              width: theme.layout.shutterSize,
              height: theme.layout.shutterSize,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="camera.viewfinder" size={theme.layout.iconSize.xl} color={theme.colors.primary} />
          </View>
          <AppText color="textMuted" align="center">
            Çözemediğin ya da kontrol etmek istediğin soruyu çek.
          </AppText>
        </View>
        <Button label="Fotoğraf çek" icon="camera.fill" size="lg" onPress={openCamera} />
        <Button label="Galeriden seç" icon="photo.on.rectangle" variant="secondary" loading={busy} onPress={() => pickFromLibrary()} />
      </Card>

      <Card title="İyi bir fotoğraf için">
        {TIPS.map((tip) => (
          <View key={tip.text} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <Icon name={tip.icon} size={theme.layout.iconSize.sm} color={theme.colors.primary} />
            <AppText style={{ flex: 1 }}>{tip.text}</AppText>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
